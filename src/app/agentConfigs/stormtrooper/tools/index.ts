// Export all tools and their implementations
export * from './voicePatternAnalysis';
export * from './imperialVerification';
export * from './suspicionTracker';
export * from './stateTransition';

// Type definitions
type ToolFunction = (args: Record<string, any>) => Promise<Record<string, any>>;
type ToolResult = Record<string, any> & {
  error?: boolean;
  reason?: string;
  item_call_id: string;
  event_id: string;
  recoverable?: boolean;
  recommendations?: string[];
  statusUpdate?: string;
  awaitingResponse?: boolean;
  pendingFunction?: string;
};

// Response state management
interface ResponseState {
  activeResponseId: string | null;
  awaitingUserResponse: boolean;
  pendingFunctionCall: string | undefined;
  lastUpdateTime: number;
  retryCount: number;
}

const MAX_RETRY_COUNT = 3;
const MAX_RESPONSE_WAIT_TIME = 30000; // 30 seconds
const TOOL_TIMEOUT = 5000; // 5 seconds

let responseState: ResponseState = {
  activeResponseId: null,
  awaitingUserResponse: false,
  pendingFunctionCall: undefined,
  lastUpdateTime: Date.now(),
  retryCount: 0
};

// State management functions
const updateState = (updates: Partial<ResponseState>): void => {
  responseState = { ...responseState, ...updates, lastUpdateTime: Date.now() };
  console.log('State updated:', { ...responseState, lastUpdateTime: new Date(responseState.lastUpdateTime).toISOString() });
};

const resetState = (): void => {
  responseState = {
    activeResponseId: null,
    awaitingUserResponse: false,
    pendingFunctionCall: undefined,
    lastUpdateTime: Date.now(),
    retryCount: 0
  };
  console.log('State reset');
};

const isStateStale = (): boolean => {
  return Date.now() - responseState.lastUpdateTime > MAX_RESPONSE_WAIT_TIME;
};

// Error handling wrapper
const safeToolCall = async (
  toolFn: ToolFunction,
  args: Record<string, any>,
  functionName: string
): Promise<ToolResult> => {
  try {
    const item_call_id = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Check for stale state
    if (isStateStale()) {
      console.log('Clearing stale state');
      resetState();
    }
    
    // Check if we're waiting for a user response
    if (responseState.awaitingUserResponse) {
      return {
        error: true,
        reason: 'Awaiting user response',
        item_call_id,
        event_id: item_call_id,
        statusUpdate: 'Please complete your current response.',
        awaitingResponse: true,
        pendingFunction: responseState.pendingFunctionCall,
        recoverable: true,
        recommendations: ['Complete current response']
      };
    }

    // Check for active response
    if (responseState.activeResponseId && responseState.pendingFunctionCall !== functionName) {
      return {
        error: true,
        reason: 'Another verification in progress',
        item_call_id,
        event_id: item_call_id,
        statusUpdate: 'Standby... processing previous verification.',
        recoverable: true,
        recommendations: ['Wait for current verification to complete']
      };
    }

    // Update state
    updateState({
      activeResponseId: item_call_id,
      pendingFunctionCall: functionName,
      retryCount: 0
    });
    
    // Validate required parameters before proceeding
    if (!args || typeof args !== 'object') {
      resetState();
      return {
        error: true,
        reason: 'Invalid arguments provided',
        item_call_id,
        event_id: item_call_id,
        statusUpdate: 'Invalid verification request.'
      };
    }

    // Execute tool with timeout protection
    const result = await Promise.race([
      toolFn({ ...Object(args), item_call_id }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Tool execution timeout')), TOOL_TIMEOUT)
      )
    ]) as Record<string, any>;

    // Ensure result is not undefined
    if (!result) {
      resetState();
      return {
        error: true,
        reason: 'Tool returned no result',
        item_call_id,
        event_id: item_call_id,
        statusUpdate: 'Verification process failed.',
        recoverable: true,
        recommendations: ['Retry verification']
      };
    }

    // Check for response requirements
    const needsResponse = result.challengeQuestion !== null || 
                         result.verificationState === 'awaiting_code' || 
                         result.verificationState === 'awaiting_lore';

    // Update state based on response needs
    if (!needsResponse) {
      resetState();
    } else {
      updateState({
        awaitingUserResponse: true,
        lastUpdateTime: Date.now()
      });
    }

    return {
      ...(result as Record<string, any>),
      item_call_id,
      event_id: item_call_id,
      awaitingResponse: needsResponse,
      pendingFunction: needsResponse ? functionName : undefined
    };
  } catch (error) {
    console.error('Tool execution error:', error);
    
    // Handle retries for recoverable errors
    if (responseState.retryCount < MAX_RETRY_COUNT && 
        error instanceof Error && 
        error.message !== 'Tool execution timeout') {
      updateState({ retryCount: responseState.retryCount + 1 });
      console.log(`Retrying tool call (${responseState.retryCount}/${MAX_RETRY_COUNT})`);
      return await safeToolCall(toolFn, args, functionName);
    }
    
    // Clear state on final error
    resetState();
    
    // Generate stable ID for errors
    const error_id = `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      error: true,
      reason: error instanceof Error ? error.message : 'Tool execution failed',
      item_call_id: error_id,
      event_id: error_id,
      statusUpdate: 'Verification process interrupted.',
      recoverable: error instanceof Error && error.message !== 'Tool execution timeout',
      recommendations: [
        'Retry verification',
        'Check clearance code format',
        'Verify voice pattern'
      ]
    };
  }
};

// Response completion handler
export const completeResponse = () => {
  if (responseState.activeResponseId) {
    console.log('Completing response:', responseState.activeResponseId);
    resetState();
  }
};

// Tool coordination logic
export const toolLogic = {
  analyzeVoicePattern: async (args: Record<string, any>): Promise<ToolResult> => {
    return await safeToolCall(
      async (params) => {
        const result = await (await import('./voicePatternAnalysis')).voicePatternAnalysisLogic(params);
        return result;
      },
      args,
      'analyzeVoicePattern'
    );
  },

  verifyImperialCredentials: async (args: Record<string, any>): Promise<ToolResult> => {
    return await safeToolCall(
      async (params) => {
        const result = await (await import('./imperialVerification')).imperialVerificationLogic(params);
        return result;
      },
      args,
      'verifyImperialCredentials'
    );
  },

  trackSuspicion: async (args: Record<string, any>): Promise<ToolResult> => {
    return await safeToolCall(
      async (params) => {
        const result = await (await import('./suspicionTracker')).suspicionTrackerLogic(params);
        return result;
      },
      args,
      'trackSuspicion'
    );
  },

  transitionState: async (args: Record<string, any>): Promise<ToolResult> => {
    return await safeToolCall(
      async (params) => {
        const result = await (await import('./stateTransition')).stateTransitionLogic(params);
        return result;
      },
      args,
      'transitionState'
    );
  }
}; 