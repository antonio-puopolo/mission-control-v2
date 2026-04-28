import { useState, useEffect } from 'react'

interface CalEvent {
  title: string
  start: string
  end?: string | null
  location?: string | null
}

export function Calendar() {
  const [today, setToday] = useState<CalEvent[]>([])
  const [thisWeek, setThisWeek] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadCalendar = () => {
    setLoading(true)
    fetch('/api/calendar')
      .then(r => r.json())
      .then(data => {
        if (data.error) throw new Error(data.error)
        setToday(data.today || [])
        // this_week includes today — filter it out for the "this week" section
        const todayItems: CalEvent[] = data.today || []
        const week = (data.this_week || []).filter((e: CalEvent) => {
          return !todayItems.some((t: CalEvent) => t.title === e.title && t.start === e.start)
        })
        setThisWeek(week)
        setLoading(false)
      })
      .catch(err => {
        setError('Could not load calendar: ' + err.message)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadCalendar()
    const interval = setInterval(loadCalendar, 30 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const now = new Date()
  const dateLabel = now.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })

  if (loading) return <div style={{ color: '#555', textAlign: 'center', padding: '3rem' }}>Loading calendar...</div>
  if (error) return <div style={{ color: '#ff6b6b', padding: '1rem' }}>{error}</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Calendar</h3>
        <p style={{ color: '#555', margin: '0.15rem 0 0', fontSize: '0.72rem' }}>{dateLabel} • Work schedule</p>
      </div>

      {/* Today */}
      <div>
        <h3 style={{ color: '#EAEAE0', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Today — {today.length} event{today.length !== 1 ? 's' : ''}
        </h3>
        {today.length === 0 ? (
          <div style={{ color: '#555', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>No events today 🎉</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {today.map((e, i) => <EventCard key={i} event={e} accent="#EAEAE0" />)}
          </div>
        )}
      </div>

      {/* This week */}
      <div>
        <h3 style={{ color: '#60a5fa', marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          This Week — {thisWeek.length} event{thisWeek.length !== 1 ? 's' : ''}
        </h3>
        {thisWeek.length === 0 ? (
          <div style={{ color: '#555', background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>Nothing else this week</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {thisWeek.map((e, i) => <EventCard key={i} event={e} accent="#60a5fa" showDate />)}
          </div>
        )}
      </div>
    </div>
  )
}

function EventCard({ event, accent, showDate }: { event: CalEvent; accent: string; showDate?: boolean }) {
  // start string from API is like "Mon, 9 Mar, 2:30 pm"
  // split on comma to get date vs time parts
  const parts = event.start.split(', ')
  const timePart = parts.length >= 3 ? parts[parts.length - 1] : event.start
  const datePart = parts.length >= 2 ? parts.slice(0, 2).join(', ') : ''

  return (
    <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderLeft: `3px solid ${accent}`, borderRadius: '8px', padding: '0.75rem 1rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      <div style={{ color: accent, fontSize: '0.8rem', fontWeight: '600', minWidth: '80px', paddingTop: '0.1rem' }}>
        {showDate && <div style={{ color: '#555', fontSize: '0.75rem' }}>{datePart}</div>}
        <div>{timePart}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: '500', fontSize: '0.9rem' }}>{event.title}</div>
        {event.location && <div style={{ color: '#555', fontSize: '0.8rem', marginTop: '0.2rem' }}>📍 {event.location}</div>}
        {event.end && <div style={{ color: '#555', fontSize: '0.75rem', marginTop: '0.2rem' }}>Until {event.end}</div>}
      </div>
    </div>
  )
}
