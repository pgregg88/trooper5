import { Tool } from '../../../types';

export const stateTransitionTool: Tool = {
  type: "function",
  name: "logCurrentState",
  description: "Log the current conversation state and add a breadcrumb to the transcript",
  parameters: {
    type: "object",
    properties: {
      state_id: {
        type: "string",
        description: "The ID of the current state"
      },
      state_data: {
        type: "object",
        description: "Additional state data to log",
        properties: {
          description: { type: "string" },
          instructions: { type: "array", items: { type: "string" } },
          examples: { type: "array", items: { type: "string" } }
        }
      }
    },
    required: ["state_id"]
  }
};

export const stateTransitionLogic = async (args: { 
  state_id: string, 
  state_data?: {
    description?: string;
    instructions?: string[];
    examples?: string[];
  }
}) => {
  const stateMatch = args.state_id.match(/^([a-zA-Z0-9_]+)$/);
  if (!stateMatch) {
    return { 
      success: false,
      error: "Invalid state ID format" 
    };
  }

  return {
    success: true,
    state: args.state_id,
    data: args.state_data,
    message: `Transitioned to state: ${args.state_id}`
  };
}; 