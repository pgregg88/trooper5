export * from './voiceAnalysis';
export * from './imperialVerification';
export * from './suspicionTracker';

import { voicePatternAnalysisLogic } from './voiceAnalysis';
import { imperialVerificationLogic } from './imperialVerification';
import { suspicionTrackerLogic } from './suspicionTracker';

// Combined tool logic for the agent configuration
export const toolLogic = {
  analyzeVoicePattern: voicePatternAnalysisLogic,
  verifyImperialCredentials: imperialVerificationLogic,
  trackSuspicionLevel: suspicionTrackerLogic
}; 