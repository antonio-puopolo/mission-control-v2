import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zjyrillpennxowntwebo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDA4MiwiZXhwIjoyMDg4MDEwMDgyfQ.qs_YCiL_rfyVVNl2jHyFGDi9lhafOXXSnXjYtogUmXY'
);

// Known targets from Antonio's goals
const TARGETS = {
  bap_per_week: 5,
  map_per_week: 2,
  lap_per_week: 1,
  laps_per_month: 4,
  listings_per_qtr: 3,
  gci_per_qtr: 60000,
};

function getQuarterStart() {
  const now = new Date();
  const month = now.getMonth();
  const qtrStartMonth = Math.floor(month / 3) * 3;
  return new Date(now.getFullYear(), qtrStartMonth, 1).toISOString().split('T')[0];
}

function getWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Mon
  return new Date(now.setDate(diff)).toISOString().split('T')[0];
}

function getMonthStart() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const qtrStart = getQuarterStart();
    const weekStart = getWeekStart();
    const monthStart = getMonthStart();

    // Get all active laps
    const { data: allLaps } = await supabase
      .from('laps')
      .select('*')
      .not('status', 'eq', 'Dead');

    const laps = allLaps || [];

    // Listings this quarter = LAPs that became Listed/Sold
    const listedThisQtr = laps.filter(l =>
      (l.status === 'Listed' || l.status === 'Sold') &&
      l.updated_at >= qtrStart
    ).length;

    // LAPs added this month (new entries)
    const lapsThisMonth = laps.filter(l =>
      l.created_at >= monthStart && l.status === 'LAP'
    ).length;

    // Total pipeline
    const pipeline = {
      total: laps.length,
      lap: laps.filter(l => l.status === 'LAP').length,
      listed: laps.filter(l => l.status === 'Listed').length,
      sold: laps.filter(l => l.status === 'Sold').length,
    };

    // Overdue contacts = urgency signal for BAP/MAP
    const today = new Date().toISOString().split('T')[0];
    const overdue = laps.filter(l => l.follow_up_date && l.follow_up_date < today).length;

    const summary = {
      targets: TARGETS,
      this_quarter: {
        listings: listedThisQtr,
        listings_target: TARGETS.listings_per_qtr,
        listings_pct: Math.round((listedThisQtr / TARGETS.listings_per_qtr) * 100),
      },
      this_month: {
        new_laps: lapsThisMonth,
        laps_target: TARGETS.laps_per_month,
        laps_pct: Math.round((lapsThisMonth / TARGETS.laps_per_month) * 100),
      },
      pipeline,
      overdue_follow_ups: overdue,
      note: 'BAP/MAP counts are not yet tracked in the system — check manually or ask Antonio to log them.',
    };

    res.status(200).json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
