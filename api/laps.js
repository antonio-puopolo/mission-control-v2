import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zauqqaifszugluyactcv.supabase.co',
  'sb_publishable_ZTH04R87aWDjog6FpG7wAw_stLW9yqc'
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { data, error } = await supabase
      .from('laps')
      .select('*')
      .order('priority', { ascending: true });

    if (error) throw error;

    // Priority order for sorting
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };

    const sorted = [...(data || [])].sort((a, b) => {
      const pa = priorityOrder[a.priority?.toLowerCase()] ?? 99;
      const pb = priorityOrder[b.priority?.toLowerCase()] ?? 99;
      return pa - pb;
    });

    // Build a voice-friendly summary
    const urgent = sorted.filter(l => l.priority?.toLowerCase() === 'urgent');
    const high = sorted.filter(l => l.priority?.toLowerCase() === 'high');
    const today = new Date().toISOString().split('T')[0];
    const overdue = sorted.filter(l => l.follow_up_date && l.follow_up_date < today);

    const summary = {
      total: sorted.length,
      urgent_count: urgent.length,
      high_count: high.length,
      overdue_count: overdue.length,
      top_priority: sorted.slice(0, 5).map(l => ({
        name: l.name,
        address: l.address,
        priority: l.priority,
        pipeline: l.pipeline_section,
        next_action: l.next_action,
        follow_up_date: l.follow_up_date,
        notes: l.notes,
      })),
      overdue: overdue.slice(0, 3).map(l => ({
        name: l.name,
        address: l.address,
        follow_up_date: l.follow_up_date,
        next_action: l.next_action,
      })),
    };

    res.status(200).json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
