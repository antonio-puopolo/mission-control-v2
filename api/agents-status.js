import { readFileSync } from 'fs';
import { execSync } from 'child_process';

// Static agent definitions — the 4 configured agents
const AGENT_DEFINITIONS = [
  {
    id: 'main',
    name: 'Main Chat',
    description: 'Primary conversation agent (Haiku)',
    primaryModel: 'anthropic/claude-haiku-4-5',
    fallbacks: [
      'openrouter/z-ai/glm-5-turbo',
      'openrouter/google/gemini-2.5-flash',
    ],
  },
  {
    id: 'coder',
    name: 'Coder',
    description: 'Code generation and software development',
    primaryModel: 'anthropic/claude-sonnet-4-6',
    fallbacks: [
      'openrouter/google/gemini-2.5-pro',
      'openrouter/anthropic/claude-sonnet-4-5',
      'openrouter/z-ai/glm-5-turbo',
    ],
  },
  {
    id: 'researcher',
    name: 'Researcher',
    description: 'Deep research and web analysis',
    primaryModel: 'anthropic/claude-sonnet-4-6',
    fallbacks: [
      'openrouter/google/gemini-2.5-pro',
      'openrouter/anthropic/claude-sonnet-4-5',
    ],
  },
  {
    id: 'analyst',
    name: 'Analyst',
    description: 'Data analysis and insights',
    primaryModel: 'anthropic/claude-sonnet-4-6',
    fallbacks: [
      'openrouter/google/gemini-2.5-pro',
      'openrouter/z-ai/glm-5-turbo',
    ],
  },
];

function readOpenclaw() {
  try {
    const configPath = process.env.OPENCLAW_CONFIG_PATH || '/home/openclaw/.openclaw/openclaw.json';
    const raw = readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getGatewayStatus() {
  try {
    execSync('openclaw gateway status', { timeout: 5000, stdio: 'pipe' });
    return { running: true };
  } catch {
    return { running: false };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Content-Type', 'application/json');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const config = readOpenclaw();
    const agentOverrides = config?.agents?.overrides || {};
    const defaultPrimary = config?.agents?.defaults?.model?.primary;
    const defaultFallbacks = config?.agents?.defaults?.model?.fallbacks || [];

    const agents = AGENT_DEFINITIONS.map((def) => {
      const override = agentOverrides[def.id] || {};
      const currentModel = override.model?.primary || def.primaryModel;
      const fallbackChain = override.model?.fallbacks || def.fallbacks;

      // Determine if we're running on a fallback (override sets a model that isn't primary)
      const isOnFallback = override.model?.primary && override.model.primary !== def.primaryModel;

      return {
        id: def.id,
        name: def.name,
        description: def.description,
        currentModel,
        primaryModel: def.primaryModel,
        isOnFallback,
        fallbackChain,
        status: 'ok', // Static OK — no live health probe yet
        lastError: override.lastError || null,
        lastUpdated: override.lastUpdated || null,
        defaultFallbacks: defaultFallbacks,
        hasOverride: !!override.model,
      };
    });

    // Gateway health
    const gatewayRunning = getGatewayStatus().running;

    res.status(200).json({
      agents,
      gateway: { running: gatewayRunning },
      defaults: {
        primary: defaultPrimary,
        fallbacks: defaultFallbacks,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
