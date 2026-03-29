import { createClient } from '@supabase/supabase-js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const tenant = require('../config/tenant.json');

const supabase = createClient(
  'https://zjyrillpennxowntwebo.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDA4MiwiZXhwIjoyMDg4MDEwMDgyfQ.qs_YCiL_rfyVVNl2jHyFGDi9lhafOXXSnXjYtogUmXY'
);

function getBrisbaneDate() {
  // Brisbane is UTC+10, no DST
  const now = new Date();
  const brisOffset = 10 * 60; // minutes
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const bris = new Date(utcMs + brisOffset * 60000);

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
                  'July', 'August', 'September', 'October', 'November', 'December'];

  const dayName = days[bris.getDay()];
  const monthName = months[bris.getMonth()];
  const dateNum = bris.getDate();
  const year = bris.getFullYear();
  const hour = bris.getHours();

  const todayIso = `${year}-${String(bris.getMonth() + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;

  let timeOfDay;
  if (hour < 12) timeOfDay = 'morning';
  else if (hour < 17) timeOfDay = 'afternoon';
  else timeOfDay = 'evening';

  return {
    iso: todayIso,
    formatted: `${dayName} ${dateNum} ${monthName} ${year}`,
    greeting_context: `It's ${dayName} ${timeOfDay} in Brisbane`,
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const brisbane = getBrisbaneDate();
  const today = brisbane.iso;

  // Run DB queries in parallel
  const [lapsResult, urgentResult, projectsResult] = await Promise.allSettled([
    supabase
      .from('laps')
      .select('client_name, phone, address, follow_up_date, status')
      .eq('status', 'LAP')
      .order('follow_up_date', { ascending: true }),
    supabase
      .from('laps')
      .select('client_name, phone, address, follow_up_date, priority, next_action, notes')
      .lte('follow_up_date', today)
      .order('priority', { ascending: true })
      .order('follow_up_date', { ascending: true })
      .limit(3),
    supabase
      .from('projects')
      .select('title, status, description')
      .eq('category', 'hamm'),
  ]);

  // --- lap_summary ---
  let lap_summary = { error: 'unavailable' };
  if (lapsResult.status === 'fulfilled' && !lapsResult.value.error) {
    const laps = lapsResult.value.data || [];

    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    const weekIso = in7Days.toISOString().split('T')[0];

    const overdue = laps.filter(l => l.follow_up_date && l.follow_up_date < today);
    const dueToday = laps.filter(l => l.follow_up_date === today);
    const dueThisWeek = laps.filter(l =>
      l.follow_up_date && l.follow_up_date >= today && l.follow_up_date <= weekIso
    );

    const toContact = l => ({ name: l.client_name, phone: l.phone, address: l.address });

    lap_summary = {
      total_active: laps.length,
      overdue_count: overdue.length,
      due_today: dueToday.map(toContact),
      due_this_week: dueThisWeek.length,
      next_follow_up: laps.length > 0 ? toContact(laps[0]) : null,
    };
  }

  // --- urgent_laps (overdue or due today, highest priority first) ---
  let urgent_laps = [];
  if (urgentResult.status === 'fulfilled' && !urgentResult.value.error) {
    urgent_laps = (urgentResult.value.data || []).map(l => ({
      name: l.client_name,
      phone: l.phone,
      address: l.address,
      priority: l.priority,
      follow_up_date: l.follow_up_date,
      next_action: l.next_action,
      notes: l.notes,
    }));
  }

  // --- hamm_goals ---
  let hamm_goals = [];
  if (projectsResult.status === 'fulfilled' && !projectsResult.value.error) {
    hamm_goals = (projectsResult.value.data || []).map(p => ({
      title: p.title,
      status: p.status,
      description: p.description,
    }));
  }

  return res.status(200).json({
    user: {
      name: tenant.agentName,
      age: tenant.agentAge,
      location: tenant.agentLocation,
      timezone: tenant.agentTimezone,
      family: tenant.agentFamily,
    },
    work: {
      role: 'Real Estate Salesperson',
      team: `${tenant.teamName} at ${tenant.brokerage}`,
      focus: `${tenant.focusSuburb}, ${tenant.focusCity}`,
      boss: tenant.boss,
      kpis: tenant.kpis,
      crm: tenant.crm,
    },
    lap_summary,
    urgent_laps,
    hamm_goals,
    today: {
      date: brisbane.formatted,
      greeting_context: brisbane.greeting_context,
    },
    assistant: {
      name: 'Hamm (George voice)',
      purpose: 'Help Antonio Make Money — personal AI for real estate productivity',
    },
  });
}
