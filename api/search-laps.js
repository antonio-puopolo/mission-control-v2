import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zauqqaifszugluyactcv.supabase.co',
  'sb_publishable_ZTH04R87aWDjog6FpG7wAw_stLW9yqc'
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Provide a search query: ?q=name' });
  }

  try {
    const { data, error } = await supabase
      .from('laps')
      .select('*')
      .or(`client_name.ilike.%${q}%,address.ilike.%${q}%`)
      .limit(5);

    if (error) throw error;

    const results = (data || []).map(l => ({
      name: l.client_name,
      address: l.address,
      phone: l.phone,
      email: l.email,
      status: l.status,
      follow_up_date: l.follow_up_date,
      notes: l.notes,
    }));

    res.status(200).json({ query: q, count: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
