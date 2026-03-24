import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zjyrillpennxowntwebo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDA4MiwiZXhwIjoyMDg4MDEwMDgyfQ.qs_YCiL_rfyVVNl2jHyFGDi9lhafOXXSnXjYtogUmXY'
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { client_name, notes, follow_up_date, status, next_action, priority } = req.body;

  if (!client_name) {
    return res.status(400).json({ error: 'client_name is required' });
  }

  // Validate optional enum fields
  const validStatuses = ['LAP', 'Listed', 'Sold', 'Dead'];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
  }

  const validPriorities = ['Urgent', 'High', 'Normal', 'Low'];
  if (priority && !validPriorities.includes(priority)) {
    return res.status(400).json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` });
  }

  try {
    // Fuzzy search by client_name
    const { data: matches, error: searchError } = await supabase
      .from('laps')
      .select('id, client_name')
      .ilike('client_name', `%${client_name}%`);

    if (searchError) throw searchError;

    if (!matches || matches.length === 0) {
      return res.status(404).json({ error: `No LAP found matching "${client_name}"` });
    }

    if (matches.length > 1) {
      const names = matches.map(m => m.client_name).join(', ');
      return res.status(409).json({
        error: `Multiple LAPs match "${client_name}". Please be more specific.`,
        matches: matches.map(m => m.client_name),
      });
    }

    const lap = matches[0];

    // Build patch — only include provided fields
    const patch = {};
    if (notes !== undefined) patch.notes = notes;
    if (follow_up_date !== undefined) patch.follow_up_date = follow_up_date;
    if (status !== undefined) patch.status = status;
    if (next_action !== undefined) patch.next_action = next_action;
    if (priority !== undefined) patch.priority = priority;

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ error: 'No fields provided to update' });
    }

    const { error: updateError } = await supabase
      .from('laps')
      .update(patch)
      .eq('id', lap.id);

    if (updateError) throw updateError;

    return res.status(200).json({
      success: true,
      updated: lap.client_name,
      fields: Object.keys(patch),
      changes: patch,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
