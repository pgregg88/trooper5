# Realtime API Agents Demo

This is a simple demonstration of more advanced, agentic patterns built on top of the Realtime API. In particular, this demonstrates:

- Sequential agent handoffs according to a defined agent graph (taking inspiration from [OpenAI Swarm](https://github.com/openai/swarm))
- Background escalation to more intelligent models like o1-mini for high-stakes decisions
- Prompting models to follow a state machine, for example to accurately collect things like names and phone numbers with confirmation character by character to authenticate a user.

You should be able to use this repo to prototype your own multi-agent realtime voice app in less than 20 minutes!

![Screenshot of the Realtime API Agents Demo](/public/screenshot.png)

## Setup

- This is a Next.js typescript app
- Install dependencies with `npm i`
- Add your `OPENAI_API_KEY` to your env
- Start the server with `npm run dev`
- Open your browser to [http://localhost:3000](http://localhost:3000) to see the app. It should automatically connect to the `simpleExample` Agent Set.

## Configuring Agents

Configuration in `src/app/agentConfigs/simpleExample.ts`

```javascript
import { AgentConfig } from "@/app/types";
import { injectTransferTools } from "./utils";

// Define agents
const haiku: AgentConfig = {
  name: "haiku",
  publicDescription: "Agent that writes haikus.", // Context for the agent_transfer tool
  instructions:
    "Ask the user for a topic, then reply with a haiku about that topic.",
  tools: [],
};

const greeter: AgentConfig = {
  name: "greeter",
  publicDescription: "Agent that greets the user.",
  instructions:
    "Please greet the user and ask them if they'd like a Haiku. If yes, transfer them to the 'haiku' agent.",
  tools: [],
  downstreamAgents: [haiku],
};

// add the transfer tool to point to downstreamAgents
const agents = injectTransferTools([greeter, haiku]);

export default agents;
```

This fully specifies the agent set that was used in the interaction shown in the screenshot above.

### Next steps

- Check out the configs in `src/app/agentConfigs`. The example above is a minimal demo that illustrates the core concepts.
- [frontDeskAuthentication](src/app/agentConfigs/frontDeskAuthentication) Guides the user through a step-by-step authentication flow, confirming each value character-by-character, authenticates the user with a tool call, and then transfers to another agent. Note that the second agent is intentionally "bored" to show how to prompt for personality and tone.
- [customerServiceRetail](src/app/agentConfigs/customerServiceRetail) Also guides through an authentication flow, reads a long offer from a canned script verbatim, and then walks through a complex return flow which requires looking up orders and policies, gathering user context, and checking with `o1-mini` to ensure the return is eligible. To test this flow, say that you'd like to return your snowboard and go through the necessary prompts!

### Defining your own agents

- You can copy these to make your own multi-agent voice app! Once you make a new agent set config, add it to `src/app/agentConfigs/index.ts` and you should be able to select it in the UI in the "Scenario" dropdown menu.
- To see how to define tools and toolLogic, including a background LLM call, see [src/app/agentConfigs/customerServiceRetail/returns.ts](src/app/agentConfigs/customerServiceRetail/returns.ts)
- To see how to define a detailed personality and tone, and use a prompt state machine to collect user information step by step, see [src/app/agentConfigs/frontDeskAuthentication/authentication.ts](src/app/agentConfigs/frontDeskAuthentication/authentication.ts)
- To see how to wire up Agents into a single Agent Set, see [src/app/agentConfigs/frontDeskAuthentication/index.ts](src/app/agentConfigs/frontDeskAuthentication/index.ts)
- If you want help creating your own prompt using these conventions, we've included a metaprompt [here](src/app/agentConfigs/voiceAgentMetaprompt.txt), or you can use our [Voice Agent Metaprompter GPT](https://chatgpt.com/g/g-678865c9fb5c81918fa28699735dd08e-voice-agent-metaprompt-gpt)

## UI

- You can select agent scenarios in the Scenario dropdown, and automatically switch to a specific agent with the Agent dropdown.
- The conversation transcript is on the left, including tool calls, tool call responses, and agent changes. Click to expand non-message elements.
- The event log is on the right, showing both client and server events. Click to see the full payload.
- On the bottom, you can disconnect, toggle between automated voice-activity detection or PTT, turn off audio playback, and toggle logs.

## Core Contributors

- Noah MacCallum - [noahmacca](https://x.com/noahmacca)
- Ilan Bigio - [ibigio](https://github.com/ibigio)

## Custom Implementation: Stormtrooper Voice Game

This repository is a fork of the [Realtime API Agents Demo](https://github.com/replit/realtime-agents-demo) that implements a Star Wars-themed interactive voice game featuring stormtrooper agents.

### Development Workflow

This project follows a specific branching strategy to maintain synchronization with the upstream repository while developing custom features:

- `main` branch: Syncs with upstream main branch
- `develop` branch: Main development branch for custom features
- Feature branches: Created from `develop` for specific implementations

To sync with upstream changes:

```bash
git fetch upstream
git checkout main
git merge upstream/main
git checkout develop
git merge main
```

### Custom Components

Custom stormtrooper-specific implementations are organized in the following structure:

- `src/app/agentConfigs/stormtrooper/` - Stormtrooper agent configurations
- `src/app/agentConfigs/stormtrooper/modes/` - Different stormtrooper behavior modes
- `src/app/agentConfigs/stormtrooper/prompts/` - Custom prompts and personality definitions

For more details about the stormtrooper game mechanics and rules, see the [Stormtrooper Game Documentation](docs/STORMTROOPER.md).

### Fork Setup and Maintenance

To set up this fork for development:

1. Clone your fork:

   ```bash
   git clone https://github.com/YOUR_USERNAME/trooper5.git
   cd trooper5
   ```

2. Add upstream remote:

   ```bash
   git remote add upstream https://github.com/replit/realtime-agents-demo.git
   ```

3. Create development branch:

   ```bash
   git checkout -b develop
   ```

4. Install dependencies and set up environment:

   ```bash
   npm install
   cp .env.example .env  # Then add your OPENAI_API_KEY
   ```

### Development Process

1. Create feature branches from `develop` for new features:

   ```bash
   git checkout -b feature/new-stormtrooper-mode
   ```

2. Make changes following the structure in `Custom Components`

3. Test changes:
   - Run the development server: `npm run dev`
   - Test in browser at <http://localhost:3000>
   - Select "Stormtrooper" scenario from dropdown

4. Commit changes with descriptive messages:

   ```bash
   git commit -m "feat: Add new stormtrooper patrol mode"
   ```

5. Merge upstream changes when needed:

   ```bash
   git fetch upstream
   git checkout main
   git merge upstream/main
   git checkout develop
   git merge main
   ```

6. Push changes to your fork:

   ```bash
   git push origin develop
   ```

For more details about implementing specific agent modes and behaviors, see the [Stormtrooper Game Documentation](docs/STORMTROOPER.md).
