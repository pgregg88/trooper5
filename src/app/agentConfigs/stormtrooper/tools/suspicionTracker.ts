import { Tool } from '../../../types';

export const suspicionTrackerTool: Tool = {
  type: "function",
  name: "trackSuspicionLevel",
  description: "Track and update suspicion levels based on interaction patterns",
  parameters: {
    type: "object",
    properties: {
      interactionType: {
        type: "string",
        description: "Type of suspicious interaction",
        enum: [
          "hesitation",
          "resistance",
          "jedi_like",
          "imperial_doubt",
          "rebel_sympathy",
          "clear_threat"
        ]
      },
      intensity: {
        type: "string",
        description: "Intensity of suspicious behavior as a decimal between 0 and 1 (e.g., '0.7')",
        pattern: "^0(\\.\\d+)?|1(\\.0+)?$"
      },
      previousIncidents: {
        type: "array",
        description: "List of previous suspicious incidents",
        items: {
          type: "string"
        }
      }
    },
    required: ["interactionType", "intensity"]
  }
};

// Suspicion thresholds for different response levels
const SUSPICION_THRESHOLDS = {
  LOW: 0.3,    // Increased vigilance
  MEDIUM: 0.6, // Active suspicion
  HIGH: 0.8,   // Immediate action required
  CRITICAL: 0.9 // Maximum alert
};

// Interaction type weights for suspicion calculation
const INTERACTION_WEIGHTS = {
  hesitation: 0.3,
  resistance: 0.5,
  jedi_like: 0.8,
  imperial_doubt: 0.6,
  rebel_sympathy: 0.7,
  clear_threat: 1.0
};

// Tool logic implementation
export const suspicionTrackerLogic = async (args: any) => {
  const { interactionType, intensity, previousIncidents = [] } = args;

  // Calculate base suspicion score
  const baseScore = INTERACTION_WEIGHTS[interactionType as keyof typeof INTERACTION_WEIGHTS] * parseFloat(intensity);

  // Apply multiplier based on previous incidents
  const previousIncidentsMultiplier = 1 + (previousIncidents.length * 0.1);
  const finalScore = Math.min(baseScore * previousIncidentsMultiplier, 1);

  // Determine threat level and required action
  let threatLevel;
  let requiredAction;

  if (finalScore >= SUSPICION_THRESHOLDS.CRITICAL) {
    threatLevel = "CRITICAL";
    requiredAction = "Immediate detention and reinforcement request";
  } else if (finalScore >= SUSPICION_THRESHOLDS.HIGH) {
    threatLevel = "HIGH";
    requiredAction = "Aggressive interrogation and backup alert";
  } else if (finalScore >= SUSPICION_THRESHOLDS.MEDIUM) {
    threatLevel = "MEDIUM";
    requiredAction = "Increased questioning and close observation";
  } else if (finalScore >= SUSPICION_THRESHOLDS.LOW) {
    threatLevel = "LOW";
    requiredAction = "Maintain vigilance and continue monitoring";
  } else {
    threatLevel = "MINIMAL";
    requiredAction = "Standard protocol";
  }

  return {
    currentSuspicionScore: finalScore,
    threatLevel,
    requiredAction,
    incidentHistory: [
      ...previousIncidents,
      `${interactionType} (${intensity})`
    ],
    recommendations: [
      `Current Threat Level: ${threatLevel}`,
      `Required Action: ${requiredAction}`,
      `Suspicion Score: ${(finalScore * 100).toFixed(1)}%`,
      `Previous Incidents: ${previousIncidents.length}`
    ]
  };
}; 