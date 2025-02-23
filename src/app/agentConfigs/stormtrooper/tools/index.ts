export * from './voiceAnalysis';
export * from './imperialVerification';
export * from './suspicionTracker';
export * from './stateTransition';

import { voicePatternAnalysisLogic } from './voiceAnalysis';
import { imperialVerificationLogic } from './imperialVerification';
import { suspicionTrackerLogic } from './suspicionTracker';
import { stateTransitionLogic } from './stateTransition';

// Combined tool logic for the agent configuration
export const toolLogic = {
  analyzeVoicePattern: voicePatternAnalysisLogic,
  verifyImperialCredentials: imperialVerificationLogic,
  trackSuspicionLevel: suspicionTrackerLogic,
  logCurrentState: stateTransitionLogic
}; 