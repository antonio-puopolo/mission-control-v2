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
      .not('status', 'eq', 'Dead')
      .order('follow_up_date', { ascending: true });

    if (error) throw error;

    const today = new Date().toISOString().split('T')[0];

    const overdue = (data || []).filter(l => l.follow_up_date && l.follow_up_date < today);
    const dueThisWeek = (data || []).filter(l => {
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
      total_active: (data || []).length,
      overdue_count: overdue.length,
      due_this_week_count: dueThisWeek.length,
      next_follow_ups: (data || []).slice(0, 5).map(format),
      overdue: overdue.slice(0, 5).map(format),
      due_this_week: dueThisWeek.slice(0, 5).map(format),
    };

    res.status(200).json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
