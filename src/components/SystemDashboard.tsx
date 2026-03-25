import { useState, useEffect } from 'react'

interface SystemStatus {
  usage: {
    daily_usd: number
    weekly_usd: number
    monthly_usd: number
    daily_aud: number
    weekly_aud: number
    monthly_aud: number
  }
  budget: {
    monthly_limit_aud: number
    daily_alert_threshold_aud: number
    percent_used: number
  }
}

const SERVICES = [
  { name: 'Gateway', desc: 'OpenClaw core' },
  { name: 'George Voice Agent', desc: 'Conversational AI' },
  { name: 'SearXNG', desc: 'Private search' },
  { name: 'Morning Briefing', desc: 'Daily digest' },
]

function spendColor(daily_aud: number): string {
  if (daily_aud < 8) return '#22c55e'
  if (daily_aud < 15) return '#f59e0b'
  return '#ef4444'
}

const card: React.CSSProperties = {
  background: '#0d1320',
  borderRadius: '12px',
  padding: '1.5rem',
}

const label: React.CSSProperties = {
  color: '#64748b',
  fontSize: '0.72rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '0.25rem',
}

export function SystemDashboard() {
  const [status, setStatus] = useState<SystemStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStatus()
  }, [])

  async function fetchStatus() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/system-status')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setStatus(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>System</h3>
          <p style={{ color: '#475569', margin: '0.15rem 0 0', fontSize: '0.72rem' }}>Spend · Services · Budget</p>
        </div>
        <button
          onClick={fetchStatus}
          style={{ padding: '0.5rem 1rem', background: '#0d1320', color: '#00d4aa', border: '1px solid #00d4aa44', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}
        >
          ↻ Refresh
        </button>
      </div>

      {loading && (
        <div style={{ color: '#475569', fontSize: '0.9rem' }}>Loading usage data…</div>
      )}

      {error && (
        <div style={{ ...card, border: '1px solid #ef444433', color: '#ef4444', fontSize: '0.85rem' }}>
          ⚠️ Could not load usage: {error}
        </div>
      )}

      {!loading && status && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>

          {/* ── Spend Card ── */}
          <div style={{ ...card, gridColumn: '1 / -1', border: '1px solid #00d4aa22' }}>
            <div style={label}>AI Spend</div>

            {/* Today — big number */}
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '1.5rem' }}>
              <span style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, color: spendColor(status.usage.daily_aud) }}>
                ${status.usage.daily_aud.toFixed(2)}
              </span>
              <span style={{ color: '#475569', marginBottom: '0.4rem', fontSize: '0.85rem' }}>AUD today</span>
            </div>

            {/* Row: week & month */}
            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              <div>
                <div style={label}>This week</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e2e8f0' }}>
                  ${status.usage.weekly_aud.toFixed(2)} <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 400 }}>AUD</span>
                </div>
              </div>
              <div>
                <div style={label}>This month</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e2e8f0' }}>
                  ${status.usage.monthly_aud.toFixed(2)} <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 400 }}>AUD</span>
                </div>
              </div>
            </div>

            {/* Budget progress bar */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <span style={{ ...label, marginBottom: 0 }}>Monthly budget</span>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  ${status.usage.monthly_aud.toFixed(2)} of ${status.budget.monthly_limit_aud} AUD used
                  &nbsp;·&nbsp;{status.budget.percent_used}%
                </span>
              </div>
              <div style={{ height: '8px', background: '#1e293b', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  borderRadius: '999px',
                  background: status.budget.percent_used > 80 ? '#ef4444' : status.budget.percent_used > 50 ? '#f59e0b' : '#00d4aa',
                  width: `${Math.min(100, status.budget.percent_used)}%`,
                  transition: 'width 0.6s ease',
                }} />
              </div>
            </div>

            <div style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.5rem' }}>
              Heartbeats on Haiku · Chat on Sonnet
            </div>
          </div>

          {/* ── Services Card ── */}
          <div style={{ ...card }}>
            <div style={{ ...label, marginBottom: '1rem' }}>Services</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {SERVICES.map((svc) => (
                <div key={svc.name} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {/* Green status dot */}
                  <div style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#22c55e',
                    boxShadow: '0 0 6px #22c55e88',
                    flexShrink: 0,
                  }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#e2e8f0' }}>{svc.name}</div>
                    <div style={{ color: '#475569', fontSize: '0.75rem' }}>{svc.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '1rem', fontSize: '0.7rem', color: '#334155' }}>
              Live ping coming soon
            </div>
          </div>

          {/* ── Budget Rules Card ── */}
          <div style={{ ...card }}>
            <div style={{ ...label, marginBottom: '1rem' }}>Budget Rules</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Monthly budget</span>
                <span style={{ fontWeight: 700, color: '#00d4aa' }}>${status.budget.monthly_limit_aud} AUD</span>
              </div>
              <div style={{ borderBottom: '1px solid #1e293b' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Alert threshold</span>
                <span style={{ fontWeight: 700, color: '#f59e0b' }}>${status.budget.daily_alert_threshold_aud} AUD/day</span>
              </div>
              <div style={{ borderBottom: '1px solid #1e293b' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Auto top-up</span>
                <span style={{ color: '#475569', fontSize: '0.82rem', fontStyle: 'italic' }}>Coming soon</span>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
