/**
 * /api/agents — Agent Models management endpoint
 *
 * GET  → Returns status of all 4 agents (model, health, fallback chain)
 * POST → Override agent model; body: { agentId, model } or { agentId, action: 'reset' }
 */

import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// ── Static agent definitions ──────────────────────────────────────────────────

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

const VALID_AGENT_IDS = AGENT_DEFINITIONS.map((a) => a.id);

const KNOWN_MODELS = [
  'anthropic/claude-haiku-4-5',
  'anthropic/claude-sonnet-4-5',
  'anthropic/claude-sonnet-4-6',
  'openrouter/anthropic/claude-haiku-4-5',
  'openrouter/anthropic/claude-sonnet-4-5',
  'openrouter/anthropic/claude-sonnet-4-6',
  'openrouter/google/gemini-2.5-pro',
  'openrouter/google/gemini-2.5-flash',
  'openrouter/z-ai/glm-5-turbo',
  'openrouter/meta-llama/llama-3.3-70b-instruct',
  'openrouter/qwen/qwen3-32b',
  'openrouter/deepseek/deepseek-chat-v3-0324',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function readConfig() {
  const configPath = process.env.OPENCLAW_CONFIG_PATH || '/home/openclaw/.openclaw/openclaw.json';
  try {
    const raw = readFileSync(configPath, 'utf8');
    return { config: JSON.parse(raw), path: configPath };
  } catch {
    // Config not accessible (e.g. running in cloud/Vercel) — return empty config
    return { config: {}, path: configPath };
  }
}

function writeConfig(configPath, config) {
  try {
    writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  } catch (e) {
    throw new Error(`Cannot write config (cloud deployment cannot modify local openclaw.json): ${e.message}`);
  }
}

function getGatewayRunning() {
  try {
    execSync('openclaw gateway status', { timeout: 5000, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function restartGateway() {
  try {
    execSync('openclaw gateway restart', { timeout: 15000, stdio: 'pipe' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

// ── GET — status ──────────────────────────────────────────────────────────────

function handleGet(req, res) {
  try {
    const { config } = readConfig();
    const isCloudEnv = !config || Object.keys(config).length === 0;
    const agentOverrides = config?.agents?.overrides || {};
    const defaultPrimary = config?.agents?.defaults?.model?.primary;
    const defaultFallbacks = config?.agents?.defaults?.model?.fallbacks || [];

    const agents = AGENT_DEFINITIONS.map((def) => {
      const override = agentOverrides[def.id] || {};
      const currentModel = override.model?.primary || def.primaryModel;
      const fallbackChain = override.model?.fallbacks || def.fallbacks;
      const isOnFallback = !!(override.model?.primary && override.model.primary !== def.primaryModel);

      return {
        id: def.id,
        name: def.name,
        description: def.description,
        currentModel,
        primaryModel: def.primaryModel,
        isOnFallback,
        fallbackChain,
        status: 'ok',
        lastError: override.lastError || null,
        lastUpdated: override.lastUpdated || null,
        hasOverride: !!override.model,
      };
    });

    res.status(200).json({
      agents,
      gateway: { running: isCloudEnv ? null : getGatewayRunning() },
      defaults: { primary: defaultPrimary, fallbacks: defaultFallbacks },
      cloudMode: isCloudEnv,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── POST — override ───────────────────────────────────────────────────────────

function handlePost(req, res) {
  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const { agentId, model, action } = body || {};

    if (!agentId || !VALID_AGENT_IDS.includes(agentId)) {
      return res.status(400).json({
        error: `Invalid agentId. Must be one of: ${VALID_AGENT_IDS.join(', ')}`,
      });
    }

    const { config, path } = readConfig();
    if (!config.agents) config.agents = {};
    if (!config.agents.overrides) config.agents.overrides = {};

    // action=reset — clear override
    if (action === 'reset') {
      delete config.agents.overrides[agentId];
      writeConfig(path, config);
      const restart = restartGateway();
      return res.status(200).json({
        success: true,
        action: 'reset',
        agentId,
        gatewayRestart: restart,
        timestamp: new Date().toISOString(),
      });
    }

    // Set model override
    if (!model || typeof model !== 'string') {
      return res.status(400).json({ error: 'model is required' });
    }

    if (!KNOWN_MODELS.includes(model)) {
      console.warn(`Unknown model: ${model}. Allowing anyway.`);
    }

    if (!config.agents.overrides[agentId]) config.agents.overrides[agentId] = {};
    config.agents.overrides[agentId].model = { primary: model };
    config.agents.overrides[agentId].lastUpdated = new Date().toISOString();

    writeConfig(path, config);
    const restart = restartGateway();

    return res.status(200).json({
      success: true,
      action: 'override',
      agentId,
      model,
      gatewayRestart: restart,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method === 'GET') return handleGet(req, res);
  if (req.method === 'POST') return handlePost(req, res);

  res.status(405).json({ error: 'Method not allowed' });
}
