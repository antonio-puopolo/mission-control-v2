const ICS_URL = 'https://outlook.office365.com/owa/calendar/07f56935aa514c53a9b25c4cd91ab770@eplace.com.au/15298fe26beb432fa81e6a151d8ea95c8741059819679929176/S-1-8-4263074342-955477810-1291768194-2244477723/reachcalendar.ics';

function parseICSDate(str) {
  if (!str) return null;
  // Handle TZID format: TZID=Australia/Brisbane:20260306T090000
  const match = str.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  // Timestamps are already in Brisbane time per TOOLS.md
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}+10:00`);
}

function parseICS(text) {
  const events = [];
  const blocks = text.split('BEGIN:VEVENT');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const get = (key) => {
      const match = block.match(new RegExp(`${key}[^:]*:([^\\r\\n]+)`));
      return match ? match[1].trim() : null;
    };
    const summary = get('SUMMARY');
    const dtstart = get('DTSTART');
    const dtend = get('DTEND');
    const location = get('LOCATION');
    const description = get('DESCRIPTION');
    const start = parseICSDate(dtstart);
    const end = parseICSDate(dtend);
    if (summary && start) {
      events.push({ summary, start, end, location, description });
    }
  }
  return events;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const response = await fetch(ICS_URL);
    if (!response.ok) throw new Error(`ICS fetch failed: ${response.status}`);
    const text = await response.text();
    const events = parseICS(text);

    const now = new Date();
    // Brisbane is UTC+10
    const brisNow = new Date(now.toLocaleString('en-AU', { timeZone: 'Australia/Brisbane' }));
    const todayStr = brisNow.toISOString().split('T')[0];
    const tomorrowStr = new Date(brisNow.getTime() + 86400000).toISOString().split('T')[0];
    const weekStr = new Date(brisNow.getTime() + 7 * 86400000).toISOString().split('T')[0];

    const fmt = (e) => ({
      title: e.summary,
      start: e.start?.toISOString(),
      end: e.end?.toISOString(),
      location: e.location || null,
    });

    const upcoming = events
      .filter(e => e.start >= brisNow)
      .sort((a, b) => a.start - b.start);

    const today = upcoming.filter(e => e.start.toISOString().split('T')[0] === todayStr);
    const tomorrow = upcoming.filter(e => e.start.toISOString().split('T')[0] === tomorrowStr);
    const thisWeek = upcoming.filter(e => e.start.toISOString().split('T')[0] <= weekStr);
    const next = upcoming[0];

    // Next event within 2 hours
    const nextTwoHours = next && (next.start - brisNow) < 2 * 60 * 60 * 1000 ? fmt(next) : null;

    res.status(200).json({
      now: brisNow.toISOString(),
      next_event: next ? fmt(next) : null,
      alert_within_2h: nextTwoHours,
      today: today.map(fmt),
      tomorrow: tomorrow.map(fmt),
      this_week_count: thisWeek.length,
      this_week: thisWeek.slice(0, 10).map(fmt),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
