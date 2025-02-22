import { Tool } from '../../../types';

export const voicePatternAnalysisTool: Tool = {
  type: "function",
  name: "analyzeVoicePattern",
  description: "Analyze voice patterns for signs of deception, Jedi influence attempts, or suspicious behavior",
  parameters: {
    type: "object",
    properties: {
      voiceSignature: {
        type: "string",
        description: "The voice pattern signature to analyze"
      },
      analysisType: {
        type: "string",
        description: "Type of analysis to perform",
        enum: ["deception", "jedi_influence", "imperial_verification"]
      },
      previousAttempts: {
        type: "array",
        description: "Previous voice patterns from the same speaker",
        items: {
          type: "string"
        }
      }
    },
    required: ["voiceSignature", "analysisType"]
  }
};

interface PatternBase {
  indicators: string[];
  threshold: number;
}

interface JediPattern extends PatternBase {
  phraseMatches: string[];
  repeatPatterns: string[];
}

interface PatternTypes {
  deception: PatternBase;
  jedi_influence: JediPattern;
  imperial_verification: PatternBase;
}

// Tool logic implementation
export const voicePatternAnalysisLogic = async (args: any) => {
  const { voiceSignature, analysisType, previousAttempts = [] } = args;
  
  // Enhanced pattern detection for Jedi mind tricks
  const jediMindTrickPhrases = [
    "you will tell me",
    "you don't need to",
    "these aren't the",
    "you want to",
    "you will show me",
    "move along",
    "do not need",
    "tell me about",
    "you do not"
  ];
  
  const patterns: PatternTypes = {
    deception: {
      indicators: ["hesitation", "pitch_variation", "stress_markers"],
      threshold: 0.7
    },
    jedi_influence: {
      indicators: [
        "calm_tone",
        "rhythmic_pattern",
        "power_phrases",
        "repeated_commands",
        "persuasive_cadence"
      ],
      threshold: 0.5, // Even lower threshold for easier detection
      phraseMatches: jediMindTrickPhrases.filter(phrase => 
        voiceSignature.toLowerCase().includes(phrase)
      ),
      repeatPatterns: previousAttempts.filter((attempt: string) =>
        attempt.toLowerCase().includes(voiceSignature.toLowerCase()) ||
        jediMindTrickPhrases.some(phrase => 
          attempt.toLowerCase().includes(phrase)
        )
      )
    },
    imperial_verification: {
      indicators: ["command_tone", "imperial_accent", "authority_markers"],
      threshold: 0.9
    }
  };

  const pattern = patterns[analysisType as keyof PatternTypes];
  
  // Enhanced Jedi influence detection
  if (analysisType === 'jedi_influence') {
    const jediPattern = pattern as JediPattern;
    const hasJediPhrases = jediPattern.phraseMatches.length > 0;
    const hasRepeatedAttempts = jediPattern.repeatPatterns.length > 0;
    const confidenceScore = Math.min(
      1,
      0.7 + // Base threshold from Jedi influence mode
      (previousAttempts.length * 0.1) + // Cumulative attempt bonus
      (hasJediPhrases ? 0.2 : 0) + // Pattern match bonus
      (hasRepeatedAttempts ? 0.15 : 0) // Phrase repetition bonus
    );

    return {
      analysisType,
      confidenceScore,
      detectedPhrases: jediPattern.phraseMatches,
      repeatAttempts: jediPattern.repeatPatterns.length,
      exceedsThreshold: confidenceScore > pattern.threshold,
      recommendation: confidenceScore > pattern.threshold
        ? `ALERT: Jedi mind trick detected! Phrases: ${jediPattern.phraseMatches.join(", ")}`
        : "No significant Jedi influence detected"
    };
  }
  
  // Standard analysis for other types
  const confidenceScore = Math.random();
  const detectedIndicators = pattern.indicators
    .filter(() => Math.random() > 0.5);

  return {
    analysisType,
    confidenceScore,
    detectedIndicators,
    exceedsThreshold: confidenceScore > pattern.threshold,
    recommendation: confidenceScore > pattern.threshold
      ? `Suspicious pattern detected: ${detectedIndicators.join(", ")}`
      : "No significant patterns detected"
  };
}; 