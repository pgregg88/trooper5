import { CORE_PERSONALITY } from './personality';
import { COMMUNICATION_PROTOCOLS } from './protocols';
import { BEHAVIORAL_CONSTRAINTS } from './constraints';

export * from './personality';
export * from './protocols';
export * from './constraints';

// Combined prompt that includes all components
export const COMPLETE_STORMTROOPER_PROMPT = `
${CORE_PERSONALITY}

${COMMUNICATION_PROTOCOLS}

${BEHAVIORAL_CONSTRAINTS}
`; 