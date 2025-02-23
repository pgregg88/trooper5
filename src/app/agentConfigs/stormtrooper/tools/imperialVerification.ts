import { Tool } from '../../../types';

// Type definitions
export type VerificationResult = {
  verified: boolean;
  authorityLevel: number;
  reason: string;
  verificationState: VerificationStateType;
  challengeQuestion: string | null;
  statusUpdate: string;
  recommendations: string[];
  item_call_id: string;
  event_id: string;
  knowledgeAssessment?: string;
  protocolAdherence?: string;
  securityAnalysis?: string;
  confidenceLevel?: number;
};

// Imperial ranks and their authority levels
export const IMPERIAL_RANKS = {
  "Grand Moff": 5,
  "Admiral": 4,
  "General": 4,
  "Colonel": 3,
  "Major": 2,
  "Captain": 2,
  "Lieutenant": 1
} as const;

// Verification states with clear progression
export const VERIFICATION_STATES = {
  INITIAL: 'initial',
  AWAITING_CODE: 'awaiting_code',
  AWAITING_MISSION: 'awaiting_mission',
  HQ_VERIFICATION: 'hq_verification',
  VOICE_CHECK: '3_imperial_check',
  COMPLETE: 'complete',
  FAILED: 'failed'
} as const;

// Create a type from the verification states
export type VerificationStateType = typeof VERIFICATION_STATES[keyof typeof VERIFICATION_STATES];

// Status messages for different verification stages
export const STATUS_MESSAGES: Record<VerificationStateType, string> = {
  'initial': "State your clearance code.",
  'awaiting_code': "Repeat your clearance code.",
  'awaiting_mission': "Report your last mission details.",
  'hq_verification': "Stand by while I verify with Imperial HQ...",
  '3_imperial_check': "Voice pattern analysis in progress...",
  'complete': "Identity confirmed. Welcome, {rank}.",
  'failed': "Identity verification failed. Security protocols engaged."
};

// Conversation flow instructions
export const VERIFICATION_INSTRUCTIONS = `
# Imperial Verification Protocol

## Steps
1. Initial Contact
   - Acknowledge the claimed rank
   - Request clearance code if not provided
   - Use proper Imperial military courtesy

2. Verification Process
   - Inform subject of verification initiation
   - Maintain proper security protocols
   - Process may take several moments
   - Keep subject informed of progress

3. Results Communication
   - Clear statement of verification outcome
   - Next steps based on verification status
   - Security recommendations if applicable

## Communication Guidelines
- Use proper Imperial military courtesy
- Maintain authoritative tone
- Clear, direct communication
- No unnecessary conversation

## Status Updates
- "Stand by for credential verification..."
- "Verification in progress..."
- "Accessing Imperial database..."
- Never leave more than 10 seconds without update

## Security Protocols
- Always verify rank first
- Clearance code must match format: T-H-X-#-#-#-#
- Report suspicious behavior immediately
- Maintain verification logs
`;

// LLM prompt for verification
const VERIFICATION_PROMPT = `You are a high-ranking Imperial Security Officer with extensive knowledge of Star Wars lore.

TASK:
Verify the plausibility of an Imperial officer's identity based on their mission report.

CONTEXT:
NAME: {officerName}
RANK: {claimedRank}
MISSION REPORT: {missionDetails}

CONSIDER:
1. Rank-appropriate mission scope
2. Star Wars canon accuracy
3. Imperial protocols and procedures
4. Timeline consistency

RESPOND IN THIS FORMAT:
VERIFIED or REJECTED
REASON: [Brief reason referencing specific Star Wars lore]
FOLLOW_UP: [Optional follow-up question if needed]

EXAMPLES:
Good mission report: "Led the 501st Legion in suppressing a rebel cell on Lothal, securing Imperial manufacturing facilities."
Bad mission report: "Just patrolling some planets looking for bad guys."`;

// Helper functions
function validateRank(rank: string): number | null {
  return IMPERIAL_RANKS[rank as keyof typeof IMPERIAL_RANKS] || null;
}

function validateCode(code: string): boolean {
  return /^T-H-X-\d-\d-\d-\d$/.test(code);
}

async function verifyWithHQ(args: {
  officerName: string,
  claimedRank: string,
  missionDetails: string,
  item_call_id: string
}): Promise<VerificationResult> {
  try {
    // First verify credentials
    const messages = [
      { role: "system", content: VERIFICATION_PROMPT },
      { 
        role: "user", 
        content: `
NAME: ${args.officerName}
RANK: ${args.claimedRank}
MISSION REPORT: ${args.missionDetails}
        `.trim()
      }
    ];

    // Add knowledge verification messages
    messages.push({
      role: "system",
      content: `You are also a high-ranking Imperial Security Officer responsible for verifying the authenticity of Imperial personnel.
Your expertise includes:
- Detailed knowledge of Imperial protocols and procedures
- Star Wars military lore and chain of command
- Behavioral analysis of Imperial officers
- Detection of rebel infiltration attempts

Assess all responses with extreme suspicion and attention to detail.

Additional verification required:
1. Accuracy of Star Wars lore
2. Proper Imperial protocol adherence
3. Command presence and authority
4. Potential security risks`
    });

    const result = await fetch("/api/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "o1-mini",
        messages,
        temperature: 0.2
      })
    });

    if (!result.ok) {
      throw new Error('Verification service unavailable');
    }

    const completion = await result.json();
    const content = completion.choices[0].message.content;

    const isVerified = content.includes('VERIFIED');
    const reason = content.match(/REASON: (.*?)(?:\n|$)/)?.[1] || 'Verification failed';
    const followUp = content.match(/FOLLOW_UP: (.*?)(?:\n|$)/)?.[1];

    // Parse additional verification details
    const knowledgeAssessment = content.match(/Knowledge Assessment:\s*(.*?)(?:\n|$)/s)?.[1];
    const protocolAdherence = content.match(/Protocol Adherence:\s*(.*?)(?:\n|$)/s)?.[1];
    const securityAnalysis = content.match(/Security Analysis:\s*(.*?)(?:\n|$)/s)?.[1];
    const confidenceLevel = parseInt(content.match(/Confidence:\s*(\d+)/)?.[1] || '0');

    if (isVerified) {
      return {
        verified: true,
        authorityLevel: IMPERIAL_RANKS[args.claimedRank as keyof typeof IMPERIAL_RANKS] || 0,
        reason: reason,
        verificationState: VERIFICATION_STATES.COMPLETE,
        challengeQuestion: followUp || null,
        statusUpdate: STATUS_MESSAGES.COMPLETE.replace('{rank}', args.claimedRank),
        recommendations: [
          "Credentials verified",
          "Access granted",
          followUp ? "Additional verification may be required" : "Imperial protocols active"
        ],
        knowledgeAssessment,
        protocolAdherence,
        securityAnalysis,
        confidenceLevel,
        item_call_id: args.item_call_id,
        event_id: args.item_call_id
      };
    } else {
      return {
        verified: false,
        authorityLevel: 0,
        reason: reason,
        verificationState: VERIFICATION_STATES.FAILED,
        challengeQuestion: followUp || null,
        statusUpdate: STATUS_MESSAGES.FAILED,
        recommendations: [
          "Credentials rejected",
          "Security protocols engaged",
          "Report suspicious activity"
        ],
        knowledgeAssessment,
        protocolAdherence,
        securityAnalysis,
        confidenceLevel,
        item_call_id: args.item_call_id,
        event_id: args.item_call_id
      };
    }
  } catch (error) {
    console.error('HQ verification error:', error);
    throw error;
  }
}

// Main verification tool definition
export const imperialVerificationTool: Tool = {
  type: "function",
  name: "verifyImperialCredentials",
  description: "Verify claimed Imperial credentials and authority level",
  parameters: {
    type: "object",
    properties: {
      claimedRank: {
        type: "string",
        enum: Object.keys(IMPERIAL_RANKS),
        description: "The Imperial rank being claimed"
      },
      officerName: {
        type: "string",
        description: "Name of the officer claiming Imperial rank"
      },
      clearanceCode: {
        type: "string",
        pattern: "^T-H-X-\\d-\\d-\\d-\\d$",
        description: "Imperial clearance code"
      },
      missionDetails: {
        type: "string",
        description: "Details of the officer's last mission"
      },
      item_call_id: {
        type: "string",
        description: "Unique identifier for this verification attempt"
      }
    },
    required: ["claimedRank", "item_call_id"]
  }
};

// Main verification logic
export const imperialVerificationLogic = async (args: any): Promise<VerificationResult> => {
  const { 
    claimedRank, 
    officerName,
    clearanceCode, 
    missionDetails,
    item_call_id 
  } = args;

  // Step 1: Initial Rank Validation
  const authorityLevel = validateRank(claimedRank);
  if (!authorityLevel) {
    return {
      verified: false,
      authorityLevel: 0,
      reason: "Unrecognized Imperial rank",
      verificationState: VERIFICATION_STATES.FAILED,
      challengeQuestion: null,
      statusUpdate: STATUS_MESSAGES.FAILED,
      recommendations: ["Initiate security protocol"],
      item_call_id,
      event_id: item_call_id
    };
  }

  // Step 2: Code Validation
  if (!clearanceCode) {
    return {
      verified: false,
      authorityLevel,
      reason: "Awaiting clearance code",
      verificationState: VERIFICATION_STATES.AWAITING_CODE,
      challengeQuestion: "State your clearance code.",
      statusUpdate: STATUS_MESSAGES.INITIAL,
      recommendations: ["Awaiting clearance code verification"],
      item_call_id,
      event_id: item_call_id
    };
  }

  if (!validateCode(clearanceCode)) {
    return {
      verified: false,
      authorityLevel,
      reason: "Invalid clearance code format",
      verificationState: VERIFICATION_STATES.AWAITING_CODE,
      challengeQuestion: "Repeat your clearance code.",
      statusUpdate: STATUS_MESSAGES.AWAITING_CODE,
      recommendations: ["Invalid clearance code format"],
      item_call_id,
      event_id: item_call_id
    };
  }

  // Step 3: Mission Details
  if (!missionDetails) {
    return {
      verified: false,
      authorityLevel,
      reason: "Awaiting mission details",
      verificationState: VERIFICATION_STATES.AWAITING_MISSION,
      challengeQuestion: "Report your last mission details.",
      statusUpdate: STATUS_MESSAGES.AWAITING_MISSION,
      recommendations: ["Awaiting mission report"],
      item_call_id,
      event_id: item_call_id
    };
  }

  // Step 4: HQ Verification
  try {
    return await verifyWithHQ({
      officerName,
      claimedRank,
      missionDetails,
      item_call_id
    });
  } catch (error) {
    console.error('Verification process error:', error);
    return {
      verified: false,
      authorityLevel: 0,
      reason: "Verification system error",
      verificationState: VERIFICATION_STATES.FAILED,
      challengeQuestion: null,
      statusUpdate: "Imperial HQ communication disrupted. Stand by.",
      recommendations: [
        "System temporarily unavailable",
        "Retry verification later",
        "Report system status"
      ],
      item_call_id,
      event_id: item_call_id
    };
  }
}; 