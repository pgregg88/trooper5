import { AgentConfig } from '../../types';
import { baseMode } from './modes/base';
import { interrogationMode } from './modes/interrogation';
import { jediInfluenceMode } from './modes/jediInfluence';
import { injectTransferTools } from '../utils';

// Connect the modes bidirectionally
baseMode.downstreamAgents = [interrogationMode, jediInfluenceMode];
interrogationMode.downstreamAgents = [baseMode];
jediInfluenceMode.downstreamAgents = [baseMode];

// Inject transfer tools and export
const agents: AgentConfig[] = injectTransferTools([
  baseMode,
  interrogationMode,
  jediInfluenceMode
]);

export default agents; 