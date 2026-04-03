import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zjyrillpennxowntwebo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDA4MiwiZXhwIjoyMDg4MDEwMDgyfQ.qs_YCiL_rfyVVNl2jHyFGDi9lhafOXXSnXjYtogUmXY'
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — return LAP summary (used by AI agents)
  if (req.method === 'GET') {
    try {
      const { data, error } = await supabase
        .from('laps')
        .select('*')
        .order('follow_up_date', { ascending: true });

      if (error) throw error;

      const all = data || [];
      const today = new Date().toISOString().split('T')[0];

      const needsAction = all.filter(l => l.status === 'LAP');
      const overdue = needsAction.filter(l => l.follow_up_date && l.follow_up_date < today);
      const dueThisWeek = needsAction.filter(l => {
        if (!l.follow_up_date || l.follow_up_date < today) return false;
        const diff = (new Date(l.follow_up_date) - new Date(today)) / (1000 * 60 * 60 * 24);
        return diff <= 7;
      });

      const format = l => ({
        name: l.client_name,
        address: l.address,
        status: l.status,
        follow_up_date: l.follow_up_date,
        notes: l.notes,
        phone: l.phone,
      });

      const summary = {
        total_active: needsAction.length,
        overdue_count: overdue.length,
        due_this_week_count: dueThisWeek.length,
        pipeline: {
          lap: needsAction.length,
          listed: all.filter(l => l.status === 'Listed').length,
          sold: all.filter(l => l.status === 'Sold').length,
        },
        next_follow_ups: needsAction.slice(0, 5).map(format),
        overdue: overdue.slice(0, 5).map(format),
        due_this_week: dueThisWeek.slice(0, 5).map(format),
      };

      return res.status(200).json(summary);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // POST — update a LAP by client_name (used by AI agents)
  if (req.method === 'POST') {
    const { client_name, notes, follow_up_date, status, next_action, priority } = req.body;

    if (!client_name) {
      return res.status(400).json({ error: 'client_name is required' });
    }

    const validStatuses = ['LAP', 'Listed', 'Sold', 'Dead'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    const validPriorities = ['Urgent', 'High', 'Normal', 'Low'];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ error: `Invalid priority. Must be one of: ${validPriorities.join(', ')}` });
    }

    try {
      const { data: matches, error: searchError } = await supabase
        .from('laps')
        .select('id, client_name')
        .ilike('client_name', `%${client_name}%`);

      if (searchError) throw searchError;

      if (!matches || matches.length === 0) {
        return res.status(404).json({ error: `No LAP found matching "${client_name}"` });
      }

      if (matches.length > 1) {
        return res.status(409).json({
          error: `Multiple LAPs match "${client_name}". Please be more specific.`,
          matches: matches.map(m => m.client_name),
        });
      }

      const lap = matches[0];
      const patch = {};
      if (notes !== undefined) patch.notes = notes;
      if (follow_up_date !== undefined) patch.follow_up_date = follow_up_date || null;
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

  return res.status(405).json({ error: 'Method not allowed' });
}
