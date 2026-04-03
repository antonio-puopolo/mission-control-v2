/**
 * /api/george-llm — George LLM provider configuration
 *
 * GET    → Get current George LLM config (provider, model, masked key)
 * POST   → Save config; body: { provider, apiKey, model } or { action: 'test', provider, apiKey, model }
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://zjyrillpennxowntwebo.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDA4MiwiZXhwIjoyMDg4MDEwMDgyfQ.qs_YCiL_rfyVVNl2jHyFGDi9lhafOXXSnXjYtogUmXY';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Provider definitions
const PROVIDERS = {
  hamm: {
    name: 'Hamm (OpenClaw)',
    baseUrl: 'http://192.168.50.207:18789/v1',
    defaultModel: 'hamm:main',
    models: [
      { id: 'hamm:main', label: 'Hamm (Full Context)' },
    ],
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    models: [
      { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (balanced)' },
      { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (fast)' },
      { id: 'llama-4-scout-17b-16e-instruct', label: 'Llama 4 Scout' },
      { id: 'deepseek-r1-distill-llama-70b', label: 'DeepSeek R1 Distill 70B' },
    ],
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    models: [
      { id: 'gpt-4o', label: 'GPT-4o (balanced)' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini (fast)' },
      { id: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    ],
  },
  anthropic: {
    name: 'Anthropic Claude',
    baseUrl: null, // Uses anthropic SDK format
    defaultModel: 'claude-sonnet-4-20250514',
    models: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4' },
      { id: 'claude-haiku-4-5-20250414', label: 'Claude Haiku 4.5 (fast)' },
    ],
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    models: [
      { id: 'deepseek-chat', label: 'DeepSeek V3' },
      { id: 'deepseek-reasoner', label: 'DeepSeek R1 (reasoning)' },
    ],
  },
  mistral: {
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-large-latest',
    models: [
      { id: 'mistral-large-latest', label: 'Mistral Large' },
      { id: 'mistral-medium-latest', label: 'Mistral Medium' },
      { id: 'open-mistral-7b', label: 'Mistral 7B (fast)' },
    ],
  },
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'openai/gpt-4o',
    models: [
      { id: 'openai/gpt-4o', label: 'GPT-4o via OpenRouter' },
      { id: 'anthropic/claude-sonnet-4-20250514', label: 'Claude Sonnet 4 via OpenRouter' },
      { id: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek V3 via OpenRouter' },
    ],
  },
};

async function ensureTable() {
  // Check if table exists — if not, log a clear message (table must be created via Supabase dashboard)
  const { data, error } = await supabase.from('george_llm_config').select('id').limit(1);
  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01' || error.message?.includes('does not exist')) {
      // Table doesn't exist yet — try to seed it via insert (will fail if table missing, that's ok)
      console.log('[george-llm] george_llm_config table not found. Run migration 004_george_llm_config.sql in Supabase SQL editor.');
      // Attempt insert — Supabase REST will create schema-cached tables if they exist
      await supabase.from('george_llm_config').insert({
        provider: 'hamm',
        model: 'hamm:main',
        api_key: '0f7ae70c482a469d98a1b922cc1757b2e344b1447c432aae0df47094d0cfdb85',
      }).select().catch(() => {});
    }
  } else if (data && data.length === 0) {
    // Table exists but empty — seed with Hamm default
    await supabase.from('george_llm_config').insert({
      provider: 'hamm',
      model: 'hamm:main',
      api_key: '0f7ae70c482a469d98a1b922cc1757b2e344b1447c432aae0df47094d0cfdb85',
    }).select().catch(() => {});
  }
}

function maskKey(key) {
  if (!key || key.length < 8) return '••••';
  return key.slice(0, 4) + '••••••' + key.slice(-4);
}

async function testApiKey(provider, apiKey, model) {
  const prov = PROVIDERS[provider];
  if (!prov) return { ok: false, error: `Unknown provider: ${provider}` };
  if (!apiKey) return { ok: false, error: 'API key is required' };

  const baseUrl = prov.baseUrl;
  if (!baseUrl) {
    // Anthropic - use Messages API format
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: model || prov.defaultModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${err.slice(0, 200)}` };
    }
    return { ok: true };
  }

  // OpenAI-compatible providers
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: model || prov.defaultModel,
      max_tokens: 10,
      messages: [{ role: 'user', content: 'Hi' }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    return { ok: false, error: `HTTP ${res.status}: ${err.slice(0, 200)}` };
  }
  return { ok: true };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await ensureTable();
  } catch (e) {
    console.error('Table check failed:', e);
  }

  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('george_llm_config')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // Table might not exist yet, return defaults
        return res.json({
          provider: 'hamm',
          model: 'hamm:main',
          hasApiKey: true,
          providers: PROVIDERS,
        });
      }

      return res.json({
        provider: data?.provider || 'hamm',
        model: data?.model || 'hamm:main',
        hasApiKey: !!data?.api_key,
        maskedKey: maskKey(data?.api_key),
        updatedAt: data?.updated_at,
        providers: PROVIDERS,
      });
    } catch (e) {
      return res.json({
        provider: 'hamm',
        model: 'hamm:main',
        hasApiKey: true,
        providers: PROVIDERS,
      });
    }
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action, provider, apiKey, model } = body;

    if (action === 'test') {
      const result = await testApiKey(provider, apiKey, model);
      return res.json(result);
    }

    // Save config
    if (!provider || !PROVIDERS[provider]) {
      return res.status(400).json({ error: `Invalid provider. Must be: ${Object.keys(PROVIDERS).join(', ')}` });
    }

    const updateData = {
      provider,
      model: model || PROVIDERS[provider].defaultModel,
      updated_at: new Date().toISOString(),
    };

    // Only update API key if provided
    if (apiKey && apiKey.trim()) {
      updateData.api_key = apiKey.trim();
    }

    // Upsert
    const { error: upsertErr } = await supabase
      .from('george_llm_config')
      .upsert(updateData, { onConflict: 'id' });

    if (upsertErr) {
      // Might be first insert without id conflict
      if (upsertErr.code === '42P01') {
        return res.status(500).json({ error: 'Table not created yet. Please try again in a moment.' });
      }
      return res.status(500).json({ error: upsertErr.message });
    }

    // Notify George to reload config
    try {
      await fetch('http://127.0.0.1:8765/reload-config', {
        method: 'POST',
        signal: AbortSignal.timeout(2000),
      }).catch(() => {}); // fire and forget
    } catch {}

    return res.json({
      success: true,
      provider: updateData.provider,
      model: updateData.model,
      hasApiKey: !!updateData.api_key || !!apiKey,
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
