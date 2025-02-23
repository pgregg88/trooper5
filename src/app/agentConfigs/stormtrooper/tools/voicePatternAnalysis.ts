import { Tool } from '../../../types';

export const voicePatternAnalysisTool: Tool = {
  type: "function",
  name: "analyzeVoicePattern",
  description: "Analyze voice patterns for Jedi influence and deception",
  parameters: {
    type: "object",
    properties: {
      voiceInput: {
        type: "string",
        description: "The voice input to analyze"
      },
      currentContext: {
        type: "string",
        description: "Current conversation context",
        enum: ["patrol", "verification", "interrogation", "jedi_influence"]
      },
      previousAnalysis: {
        type: "object",
        description: "Previous analysis results if any",
        properties: {
          jediInfluence: {
            type: "number",
            description: "Previous Jedi influence level (0-100)"
          },
          deceptionLevel: {
            type: "number",
            description: "Previous deception level (0-100)"
          }
        }
      },
      item_call_id: {
        type: "string",
        description: "Unique identifier for this analysis"
      }
    },
    required: ["voiceInput", "currentContext", "item_call_id"],
    additionalProperties: false
  }
};

export const voicePatternAnalysisLogic = async (args: any) => {
  const { voiceInput, currentContext, previousAnalysis = {}, item_call_id } = args;

  // Initialize metrics
  let jediInfluence = previousAnalysis.jediInfluence || 0;
  let deceptionLevel = previousAnalysis.deceptionLevel || 0;
  let imperialCredibility = 0;

  // Basic pattern checks
  const hasCommandTone = /^[A-Z]/.test(voiceInput) || voiceInput.includes('!');
  const hasImperialPhrasing = voiceInput.toLowerCase().includes('empire') || 
                             voiceInput.toLowerCase().includes('imperial');
  
  // Extract rank and code information if present
  const rankMatch = voiceInput.match(/(?:I am|This is) (Admiral|General|Colonel|Major|Captain|Lieutenant) ([A-Za-z]+)/i);
  const codeMatch = voiceInput.match(/(?:code|clearance)[:\s]*(T-H-X-\d-\d-\d-\d)/i);

  // Context-specific analysis
  switch (currentContext) {
    case 'verification':
      deceptionLevel = hasCommandTone && hasImperialPhrasing ? 20 : 60;
      imperialCredibility = rankMatch && hasCommandTone ? 70 : 30;
      break;
    case 'interrogation':
      deceptionLevel = hasCommandTone ? 40 : 80;
      imperialCredibility = rankMatch ? 40 : 20;
      break;
    case 'jedi_influence':
      jediInfluence = Math.min(jediInfluence + 20, 100);
      imperialCredibility = 0;
      break;
    default:
      // Patrol context - baseline analysis
      deceptionLevel = hasCommandTone ? 30 : 50;
      imperialCredibility = rankMatch && hasImperialPhrasing ? 60 : 25;
  }

  return {
    jediInfluence,
    deceptionLevel,
    imperialCredibility,
    voiceCharacteristics: {
      commandTone: hasCommandTone,
      imperialAccent: hasImperialPhrasing,
      claimedRank: rankMatch ? rankMatch[1] : null,
      claimedName: rankMatch ? rankMatch[2] : null,
      providedCode: codeMatch ? codeMatch[1] : null
    },
    analysisContext: currentContext,
    confidence: 0.85,
    timestamp: new Date().toISOString(),
    item_call_id,
    event_id: item_call_id,
    recommendations: [
      deceptionLevel > 70 ? "High deception detected - initiate verification" : null,
      jediInfluence > 60 ? "Possible Jedi influence - maintain mental resistance" : null,
      hasCommandTone ? "Imperial command tone detected" : "Civilian speech pattern confirmed",
      imperialCredibility > 60 ? "Voice patterns consistent with Imperial training" : "Non-standard Imperial speech patterns detected"
    ].filter(Boolean),
    shouldProceedToVerification: imperialCredibility >= 60 && deceptionLevel < 50 && jediInfluence < 40
  };
}; 