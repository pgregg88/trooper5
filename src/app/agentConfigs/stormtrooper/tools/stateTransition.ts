import { Tool } from '../../../types';

export const stateTransitionTool: Tool = {
  type: "function",
  name: "transitionState",
  description: "Handles state transitions for the stormtrooper agent",
  parameters: {
    type: "object",
    properties: {
      currentState: {
        type: "string",
        description: "Current state of the agent"
      },
      nextState: {
        type: "string",
        description: "State to transition to"
      },
      reason: {
        type: "string",
        description: "Reason for the state transition"
      },
      metrics: {
        type: "object",
        description: "Current metrics triggering the transition",
        properties: {
          suspicionLevel: {
            type: "number",
            description: "Current suspicion level (0-100)"
          },
          jediInfluence: {
            type: "number",
            description: "Current Jedi influence level (0-100)"
          }
        }
      },
      item_call_id: {
        type: "string",
        description: "Unique identifier for this transition"
      }
    },
    required: ["currentState", "nextState", "reason", "item_call_id"],
    additionalProperties: false
  }
};

export const stateTransitionLogic = async (args: any) => {
  const { currentState, nextState, reason, metrics, item_call_id } = args;

  return {
    previousState: currentState,
    newState: nextState,
    transitionReason: reason,
    metrics: metrics || {},
    success: true,
    timestamp: new Date().toISOString(),
    item_call_id,
    event_id: item_call_id
  };
}; 