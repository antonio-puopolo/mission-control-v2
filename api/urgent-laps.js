import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zjyrillpennxowntwebo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDA4MiwiZXhwIjoyMDg4MDEwMDgyfQ.qs_YCiL_rfyVVNl2jHyFGDi9lhafOXXSnXjYtogUmXY'
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Get today's date in YYYY-MM-DD format (Brisbane time)
    const today = new Date(new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' }))
      .toISOString()
      .split('T')[0];

    // Query for LAPs with follow_up_date <= today (overdue or due today)
    const { data: overdue, error: overdueError } = await supabase
      .from('laps')
      .select('*')
      .lte('follow_up_date', today)
      .order('priority', { ascending: true }) // Urgent first
      .order('follow_up_date', { ascending: true }); // Oldest first within same priority

    if (overdueError) throw overdueError;

    // Also get upcoming (due within next 7 days) for context
    const nextWeek = new Date(new Date().toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' }));
    nextWeek.setDate(nextWeek.getDate() + 7);
    const nextWeekDate = nextWeek.toISOString().split('T')[0];

    const { data: upcoming, error: upcomingError } = await supabase
      .from('laps')
      .select('*')
      .gt('follow_up_date', today)
      .lte('follow_up_date', nextWeekDate)
      .order('follow_up_date', { ascending: true });

    if (upcomingError) throw upcomingError;

    // Format response
    const formatLap = (l) => ({
      id: l.id,
      name: l.client_name,
      address: l.address,
      phone: l.phone,
      email: l.email,
      priority: l.priority || 'Normal',
      status: l.status,
      follow_up_date: l.follow_up_date,
      next_action: l.next_action,
      notes: l.notes,
      days_overdue: Math.floor((new Date(today) - new Date(l.follow_up_date)) / (1000 * 60 * 60 * 24)),
    });

    res.status(200).json({
      today,
      overdue: (overdue || []).map(formatLap),
      upcoming: (upcoming || []).map(formatLap),
      summary: {
        urgent_count: (overdue || []).filter(l => l.priority === 'Urgent').length,
        overdue_count: (overdue || []).length,
        upcoming_week_count: (upcoming || []).length,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
