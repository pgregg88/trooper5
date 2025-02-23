import { Tool } from '../../../types';

export const suspicionTrackerTool: Tool = {
  type: "function",
  name: "trackSuspicion",
  description: "Track and update suspicion levels during civilian interactions",
  parameters: {
    type: "object",
    properties: {
      currentLevel: {
        type: "number",
        description: "Current suspicion level (0-100)"
      },
      adjustment: {
        type: "number",
        description: "Amount to adjust suspicion by (-100 to 100)"
      },
      reason: {
        type: "string",
        description: "Reason for suspicion adjustment"
      },
      item_call_id: {
        type: "string",
        description: "Unique identifier for this tracking event"
      }
    },
    required: ["currentLevel", "adjustment", "reason", "item_call_id"],
    additionalProperties: false
  }
};

export const suspicionTrackerLogic = async (args: any) => {
  const { currentLevel, adjustment, reason, item_call_id } = args;

  // Ensure levels stay within bounds
  const newLevel = Math.max(0, Math.min(100, currentLevel + adjustment));

  return {
    previousLevel: currentLevel,
    newLevel,
    adjustment,
    reason,
    timestamp: new Date().toISOString(),
    item_call_id,
    event_id: item_call_id,
    thresholdsCrossed: {
      high: newLevel >= 75 && currentLevel < 75,
      critical: newLevel >= 90 && currentLevel < 90
    }
  };
}; 