/**
 * /api/agent-config — Agent config request endpoint
 *
 * POST → Try local port 9999 first (instant apply).
 *         If offline, write pending state to Supabase (picked up by 5-min cron).
 *   Body: { agentId, newModel }
 *   Returns: { success, id?, status, appliedInstantly }
 *
 * GET  → Poll status of a config request
 *   Query: ?id=<uuid>
 *   Returns: { id, agentId, newModel, status, requestedAt, appliedAt, result }
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zjyrillpennxowntwebo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDA4MiwiZXhwIjoyMDg4MDEwMDgyfQ.qs_YCiL_rfyVVNl2jHyFGDi9lhafOXXSnXjYtogUmXY'
);

const LOCAL_ENDPOINT = 'http://127.0.0.1:9999/apply-agent-model';
const REMOTE_ENDPOINT = 'https://demands-everywhere-verbal-needs.trycloudflare.com/apply-agent-model';
const VALID_AGENT_IDS = ['main', 'coder', 'researcher', 'analyst', 'main-chat'];

async function tryEndpoint(url, agentId, model) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentId, model }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const data = await res.json();
    return { ok: data.status === 'applied', result: data.result, status: data.status };
  } catch (e) {
    return { ok: false, result: e.message, offline: true };
  }
}

async function tryLocalEndpoint(agentId, model) {
  // Note: MC runs in browser (Vercel), so localhost won't work
  // Try remote tunnel first (works from browser)
  let result = await tryEndpoint(REMOTE_ENDPOINT, agentId, model);
  // If that fails and we're somehow local, try localhost
  if (!result.ok && result.offline) {
    result = await tryEndpoint(LOCAL_ENDPOINT, agentId, model);
  }
  return result;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // POST — apply model change (instant if local online, else Supabase pending)
  if (req.method === 'POST') {
    try {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch { body = {}; }
      }

      const { agentId, newModel } = body || {};

      if (!agentId || !VALID_AGENT_IDS.includes(agentId)) {
        return res.status(400).json({
          error: `Invalid agentId. Must be one of: ${VALID_AGENT_IDS.join(', ')}`,
        });
      }

      if (!newModel || typeof newModel !== 'string') {
        return res.status(400).json({ error: 'newModel is required' });
      }

      // 1. Try local endpoint first (instant apply)
      const local = await tryLocalEndpoint(agentId, newModel);

      if (local.ok) {
        // Instant success — also update agent_models table for record-keeping
        await supabase
          .from('agent_models')
          .update({
            model: newModel,
            pendingModel: null,
            updatedAt: new Date().toISOString(),
            lastSyncAt: new Date().toISOString(),
            source: 'dashboard',
          })
          .eq('id', agentId);

        return res.status(200).json({
          success: true,
          status: 'applied',
          appliedInstantly: true,
          result: local.result,
          agentId,
          newModel,
        });
      }

      // 2. Local endpoint offline — write pending to Supabase
      console.log(`[agent-config] Local endpoint offline (${local.result}), writing to Supabase...`);

      // Update agent_models table with pendingModel (cron will pick it up)
      const { error: amError } = await supabase
        .from('agent_models')
        .update({
          pendingModel: newModel,
          updatedAt: new Date().toISOString(),
          source: 'dashboard-pending',
        })
        .eq('id', agentId);

      if (amError) {
        console.error('Supabase agent_models update failed:', amError);
      }

      // Also write legacy config request for backward compat
      const { data, error } = await supabase
        .from('agent_config_requests')
        .insert({
          agentId,
          newModel,
          requestedAt: new Date().toISOString(),
          status: 'pending',
        })
        .select()
        .single();

      if (error) throw error;

      return res.status(202).json({
        success: true,
        id: data.id,
        agentId: data.agentId,
        newModel: data.newModel,
        status: 'pending',
        appliedInstantly: false,
        message: 'Local server offline — queued for 5-min cron sync',
        requestedAt: data.requestedAt,
      });

    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // GET — poll status of a legacy request
  if (req.method === 'GET') {
    try {
      const id = req.query?.id;

      if (!id) {
        return res.status(400).json({ error: 'id query param is required' });
      }

      const { data, error } = await supabase
        .from('agent_config_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error || !data) {
        return res.status(404).json({ error: 'Request not found' });
      }

      return res.status(200).json(data);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
