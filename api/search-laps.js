import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zjyrillpennxowntwebo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDA4MiwiZXhwIjoyMDg4MDEwMDgyfQ.qs_YCiL_rfyVVNl2jHyFGDi9lhafOXXSnXjYtogUmXY'
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
