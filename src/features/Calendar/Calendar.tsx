import { useState, useEffect } from 'react'

interface CalEvent {
  summary: string
  start: Date
  end?: Date
  location?: string
  isAllDay: boolean
}

const ICS_URL = 'https://outlook.office365.com/owa/calendar/07f56935aa514c53a9b25c4cd91ab770@eplace.com.au/15298fe26beb432fa81e6a151d8ea95c8741059819679929176/S-1-8-4263074342-955477810-1291768194-2244477723/reachcalendar.ics'

function parseICS(text: string): CalEvent[] {
  const events: CalEvent[] = []
  const lines = text.replace(/\r\n /g, '').replace(/\r\n\t/g, '').split(/\r?\n/)
  let current: Record<string, string> = {}
  let inEvent = false

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { inEvent = true; current = {} }
    else if (line === 'END:VEVENT') {
      inEvent = false
      const startRaw = current['DTSTART'] || current['DTSTART;VALUE=DATE'] || ''
      const endRaw = current['DTEND'] || current['DTEND;VALUE=DATE'] || ''
      const isAllDay = !startRaw.includes('T')
      try {
        const parseDate = (s: string) => {
          if (!s) return null
          if (s.includes('T')) {
            // local time - already Brisbane
            const y = +s.slice(0,4), mo = +s.slice(4,6)-1, d = +s.slice(6,8)
            const h = +s.slice(9,11), m = +s.slice(11,13), sec = +s.slice(13,15)
            return new Date(y, mo, d, h, m, sec)
          } else {
            const y = +s.slice(0,4), mo = +s.slice(4,6)-1, d = +s.slice(6,8)
            return new Date(y, mo, d)
          }
        }
        const start = parseDate(startRaw)
        const end = endRaw ? parseDate(endRaw) : null
        if (start) events.push({ summary: current['SUMMARY'] || 'No title', start, end: end || undefined, location: current['LOCATION']?.replace(/\\,/g, ',').replace(/\\/g, ''), isAllDay })
      } catch {}
    } else if (inEvent && line.includes(':')) {
      const [rawKey, ...rest] = line.split(':')
      const key = rawKey.split(';')[0]
      current[key] = rest.join(':')
    }
  }
  return events
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-AU', { hour: 'numeric', minute: '2-digit', hour12: true })
}
function formatDate(d: Date) {
  return d.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function Calendar() {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(ICS_URL)}`)
      .then(r => r.text())
      .then(text => {
        const parsed = parseICS(text)
        parsed.sort((a, b) => a.start.getTime() - b.start.getTime())
        setEvents(parsed)
        setLoading(false)
      })
      .catch(() => {
        setError('Could not load calendar. Check network connection.')
        setLoading(false)
      })
  }, [])

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayEnd = new Date(todayStart.getTime() + 86400000)
  const weekEnd = new Date(todayStart.getTime() + 7 * 86400000)

  const todayEvents = events.filter(e => e.start >= todayStart && e.start < todayEnd)
  const upcomingEvents = events.filter(e => e.start >= todayEnd && e.start < weekEnd)

  if (loading) return <div style={{ color: '#a0a0b0', textAlign: 'center', padding: '3rem' }}>Loading calendar...</div>
  if (error) return <div style={{ color: '#ff6b6b', padding: '1rem' }}>{error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ margin: 0 }}>Calendar</h2>
        <p style={{ color: '#a0a0b0', margin: '0.25rem 0 0' }}>{formatDate(now)} • Work schedule</p>
      </div>

      {/* Today */}
      <div>
        <h3 style={{ color: '#00D4AA', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Today — {todayEvents.length} event{todayEvents.length !== 1 ? 's' : ''}</h3>
        {todayEvents.length === 0 ? (
          <div style={{ color: '#a0a0b0', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>No events today 🎉</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {todayEvents.map((e, i) => <EventCard key={i} event={e} accent="#00D4AA" />)}
          </div>
        )}
      </div>

      {/* Upcoming week */}
      <div>
        <h3 style={{ color: '#6c63ff', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>This Week — {upcomingEvents.length} events</h3>
        {upcomingEvents.length === 0 ? (
          <div style={{ color: '#a0a0b0', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>Nothing else this week</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {upcomingEvents.map((e, i) => <EventCard key={i} event={e} accent="#6c63ff" showDate />)}
          </div>
        )}
      </div>
    </div>
  )
}

function EventCard({ event, accent, showDate }: { event: CalEvent; accent: string; showDate?: boolean }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${accent}`, borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      <div style={{ color: accent, fontSize: '0.8rem', fontWeight: '600', minWidth: '70px', paddingTop: '0.1rem' }}>
        {showDate && <div style={{ color: '#a0a0b0', fontSize: '0.75rem' }}>{formatDate(event.start)}</div>}
        {event.isAllDay ? 'All day' : formatTime(event.start)}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{event.summary}</div>
        {event.location && <div style={{ color: '#a0a0b0', fontSize: '0.8rem', marginTop: '0.2rem' }}>📍 {event.location}</div>}
      </div>
    </div>
  )
}
