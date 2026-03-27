import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const VALID_AGENT_IDS = ['main', 'coder', 'researcher', 'analyst'];

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

function readConfig() {
  const configPath = process.env.OPENCLAW_CONFIG_PATH || '/home/openclaw/.openclaw/openclaw.json';
  const raw = readFileSync(configPath, 'utf8');
  return { config: JSON.parse(raw), path: configPath };
}

function writeConfig(configPath, config) {
  writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
}

function restartGateway() {
  try {
    execSync('openclaw gateway restart', { timeout: 15000, stdio: 'pipe' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const { agentId, model, action } = body || {};

    // Validate agentId
    if (!agentId || !VALID_AGENT_IDS.includes(agentId)) {
      return res.status(400).json({
        error: `Invalid agentId. Must be one of: ${VALID_AGENT_IDS.join(', ')}`,
      });
    }

    // action=reset clears override
    if (action === 'reset') {
      const { config, path } = readConfig();
      if (!config.agents) config.agents = {};
      if (!config.agents.overrides) config.agents.overrides = {};
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

    // Validate model for set action
    if (!model || typeof model !== 'string') {
      return res.status(400).json({ error: 'model is required' });
    }

    if (!KNOWN_MODELS.includes(model)) {
      // Allow unknown models but warn
      console.warn(`Unknown model: ${model}. Proceeding anyway.`);
    }

    const { config, path } = readConfig();

    // Ensure nested structure
    if (!config.agents) config.agents = {};
    if (!config.agents.overrides) config.agents.overrides = {};
    if (!config.agents.overrides[agentId]) config.agents.overrides[agentId] = {};

    // Set override
    config.agents.overrides[agentId].model = {
      primary: model,
    };
    config.agents.overrides[agentId].lastUpdated = new Date().toISOString();

    writeConfig(path, config);

    // Restart gateway so new model takes effect
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
