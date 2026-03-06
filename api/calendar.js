const ICS_URL = 'https://outlook.office365.com/owa/calendar/07f56935aa514c53a9b25c4cd91ab770@eplace.com.au/15298fe26beb432fa81e6a151d8ea95c8741059819679929176/S-1-8-4263074342-955477810-1291768194-2244477723/reachcalendar.ics';

// Get date string in Brisbane timezone (YYYY-MM-DD)
function toBrisDate(date) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Brisbane',
    year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(date);
}

function parseICSDate(str) {
  if (!str) return null;
  const match = str.match(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/);
  if (!match) return null;
  const [, y, mo, d, h, mi, s] = match;
  // Timestamps from this calendar are already in Brisbane time (UTC+10)
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}+10:00`);
}

function parseICS(text) {
  const events = [];
  const blocks = text.split('BEGIN:VEVENT');
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const get = (key) => {
      const match = block.match(new RegExp(`${key}[^:\\r\\n]*:([^\\r\\n]+)`));
      return match ? match[1].trim() : null;
    };
    const summary = get('SUMMARY');
    const dtstart = get('DTSTART');
    const dtend = get('DTEND');
    const location = get('LOCATION');
    const start = parseICSDate(dtstart);
    const end = parseICSDate(dtend);
    if (summary && start) {
      events.push({ summary, start, end, location });
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
    const todayStr = toBrisDate(now);
    const tomorrow = new Date(now.getTime() + 86400000);
    const tomorrowStr = toBrisDate(tomorrow);
    const weekAhead = new Date(now.getTime() + 7 * 86400000);

    const fmt = (e) => ({
      title: e.summary,
      start: new Intl.DateTimeFormat('en-AU', {
        timeZone: 'Australia/Brisbane',
        weekday: 'short', month: 'short', day: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true
      }).format(e.start),
      end: e.end ? new Intl.DateTimeFormat('en-AU', {
        timeZone: 'Australia/Brisbane',
        hour: 'numeric', minute: '2-digit', hour12: true
      }).format(e.end) : null,
      location: e.location || null,
    });

    const upcoming = events
      .filter(e => e.start >= now)
      .sort((a, b) => a.start - b.start);

    const todayEvents = upcoming.filter(e => toBrisDate(e.start) === todayStr);
    const tomorrowEvents = upcoming.filter(e => toBrisDate(e.start) === tomorrowStr);
    const thisWeek = upcoming.filter(e => e.start <= weekAhead);
    const next = upcoming[0];
    const alertWithin2h = next && (next.start - now) < 2 * 60 * 60 * 1000 ? fmt(next) : null;

    res.status(200).json({
      brisbane_date: todayStr,
      next_event: next ? fmt(next) : null,
      alert_within_2h: alertWithin2h,
      today: todayEvents.map(fmt),
      tomorrow: tomorrowEvents.map(fmt),
      this_week_count: thisWeek.length,
      this_week: thisWeek.slice(0, 10).map(fmt),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
