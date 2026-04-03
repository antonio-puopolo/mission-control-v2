import { useState, useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

interface UsageData {
  usage: {
    daily_tokens: number
    daily_aud: number
    weekly_tokens: number
    weekly_aud: number
    monthly_tokens: number
    monthly_aud: number
  }
  breakdown: {
    by_agent: Record<string, number>
    by_model: Record<string, number>
  }
  budget: {
    monthly_limit_aud: number
    percent_used: number
    daily_alert_threshold_aud: number
    is_over_daily_threshold: boolean
  }
}

const card: React.CSSProperties = {
  background: '#0d1320',
  borderRadius: '12px',
  padding: '1.5rem',
  border: '1px solid #1e3a5f33',
}

const label: React.CSSProperties = {
  color: '#64748b',
  fontSize: '0.72rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '0.25rem',
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}K`
  }
  return tokens.toString()
}

function spendColor(daily: number): string {
  if (daily < 8) return '#22c55e'
  if (daily < 15) return '#f59e0b'
  return '#ef4444'
}

export function UsageCard() {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<'overview' | 'agents' | 'models'>('overview')

  useEffect(() => {
    fetchUsage()
  }, [])

  async function fetchUsage() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/system-status')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      // Map system-status response to UsageData format
      const mapped: UsageData = {
        usage: {
          daily_tokens: Math.round((json.usage.daily_usd / 0.0025) * 1000), // Rough token estimate
          daily_aud: json.usage.daily_aud,
          weekly_tokens: Math.round((json.usage.weekly_usd / 0.0025) * 1000),
          weekly_aud: json.usage.weekly_aud,
          monthly_tokens: Math.round((json.usage.monthly_usd / 0.0025) * 1000),
          monthly_aud: json.usage.monthly_aud,
        },
        breakdown: {
          by_agent: {},
          by_model: {},
        },
        budget: {
          monthly_limit_aud: json.budget.monthly_limit_aud,
          percent_used: json.budget.percent_used,
          daily_alert_threshold_aud: json.budget.daily_alert_threshold_aud,
          is_over_daily_threshold: json.usage.daily_aud > json.budget.daily_alert_threshold_aud,
        },
      }
      setData(mapped)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ ...card, gridColumn: '1 / -1' }}>
        <div style={{ color: '#475569', fontSize: '0.85rem' }}>Loading usage data…</div>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ ...card, gridColumn: '1 / -1', border: '1px solid #ef444433' }}>
        <div style={{ color: '#ef4444', fontSize: '0.85rem' }}>
          ⚠️ Could not load usage: {error}
        </div>
      </div>
    )
  }

  if (!data) return null

  const { usage, breakdown, budget } = data
  const dailyColor = spendColor(usage.daily_aud)
  
  // Calculate percentages for agent breakdown
  const totalTokens = usage.monthly_tokens
  const agentPercentages = Object.entries(breakdown.by_agent).map(([name, tokens]) => ({
    name,
    tokens,
    percent: totalTokens > 0 ? Math.round((tokens / totalTokens) * 100) : 0,
  })).sort((a, b) => b.tokens - a.tokens)

  // Calculate percentages for model breakdown
  const modelPercentages = Object.entries(breakdown.by_model).map(([name, tokens]) => ({
    name,
    tokens,
    percent: totalTokens > 0 ? Math.round((tokens / totalTokens) * 100) : 0,
  })).sort((a, b) => b.tokens - a.tokens)

  return (
    <div style={{ ...card, gridColumn: '1 / -1', border: '1px solid #00d4aa22' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={label}>Token Usage</div>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.1rem' }}>
            AI spend tracking across all agents
          </div>
        </div>
        <button
          onClick={fetchUsage}
          style={{
            padding: '0.4rem 0.75rem',
            background: '#0d1320',
            color: '#00d4aa',
            border: '1px solid #00d4aa44',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '0.78rem',
            fontWeight: 600,
          }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Main metrics */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <span style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1, color: dailyColor }}>
          ${usage.daily_aud.toFixed(2)}
        </span>
        <span style={{ color: '#475569', marginBottom: '0.4rem', fontSize: '0.85rem' }}>
          AUD today
        </span>
        {budget.is_over_daily_threshold && (
          <AlertCircle 
            size={20} 
            style={{ color: '#ef4444', marginLeft: '0.5rem', marginBottom: '0.4rem' }}
          />
        )}
      </div>

      {/* Period breakdowns */}
      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        <div>
          <div style={label}>This week</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e2e8f0' }}>
            ${usage.weekly_aud.toFixed(2)}
            <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 400 }}> AUD</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>
            {formatTokens(usage.weekly_tokens)} tokens
          </div>
        </div>
        <div>
          <div style={label}>This month</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e2e8f0' }}>
            ${usage.monthly_aud.toFixed(2)}
            <span style={{ fontSize: '0.8rem', color: '#475569', fontWeight: 400 }}> AUD</span>
          </div>
          <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>
            {formatTokens(usage.monthly_tokens)} tokens
          </div>
        </div>
      </div>

      {/* Budget progress bar */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
          <span style={{ ...label, marginBottom: 0 }}>Monthly budget</span>
          <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            ${usage.monthly_aud.toFixed(2)} of ${budget.monthly_limit_aud} AUD used · {budget.percent_used}%
          </span>
        </div>
        <div style={{ height: '8px', background: '#1e293b', borderRadius: '999px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              borderRadius: '999px',
              background: budget.percent_used > 80 ? '#ef4444' :
                        budget.percent_used > 50 ? '#f59e0b' : '#00d4aa',
              width: `${Math.min(100, budget.percent_used)}%`,
              transition: 'width 0.6s ease',
            }}
          />
        </div>
      </div>

      {/* View selector */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.75rem' }}>
        {(['overview', 'agents', 'models'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            style={{
              padding: '0.4rem 0.8rem',
              background: view === v ? 'rgba(0, 212, 170, 0.1)' : 'transparent',
              border: view === v ? '1px solid #00d4aa44' : '1px solid transparent',
              borderRadius: '6px',
              color: view === v ? '#00d4aa' : '#64748b',
              cursor: 'pointer',
              fontSize: '0.78rem',
              fontWeight: 600,
              textTransform: 'capitalize',
            }}
          >
            {v === 'agents' ? 'By Agent' : v === 'models' ? 'By Model' : v}
          </button>
        ))}
      </div>

      {/* Content based on view */}
      {view === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          <div style={{ background: '#060d1a', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ ...label, marginBottom: '0.5rem' }}>Top Agent</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0' }}>
              {agentPercentages[0]?.name || 'N/A'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>
              {agentPercentages[0] ? `${agentPercentages[0].percent}% of usage` : ''}
            </div>
          </div>
          <div style={{ background: '#060d1a', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ ...label, marginBottom: '0.5rem' }}>Top Model</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#e2e8f0' }}>
              {modelPercentages[0]?.name || 'N/A'}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>
              {modelPercentages[0] ? `${modelPercentages[0].percent}% of usage` : ''}
            </div>
          </div>
          <div style={{ background: '#060d1a', borderRadius: '8px', padding: '1rem' }}>
            <div style={{ ...label, marginBottom: '0.5rem' }}>Daily Alert</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: budget.is_over_daily_threshold ? '#ef4444' : '#22c55e' }}>
              ${budget.daily_alert_threshold_aud} AUD
            </div>
            <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: '0.2rem' }}>
              {budget.is_over_daily_threshold ? 'Threshold exceeded!' : 'Under threshold'}
            </div>
          </div>
        </div>
      )}

      {view === 'agents' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {agentPercentages.length === 0 ? (
            <div style={{ color: '#475569', fontSize: '0.82rem' }}>No agent data yet</div>
          ) : (
            agentPercentages.map(agent => (
              <div
                key={agent.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem',
                  background: '#060d1a',
                  borderRadius: '6px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{agent.name}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  {formatTokens(agent.tokens)} tokens
                </div>
                <div
                  style={{
                    width: '80px',
                    height: '6px',
                    background: '#1e293b',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      background: '#00d4aa',
                      width: `${agent.percent}%`,
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.82rem', color: '#00d4aa', width: '40px', textAlign: 'right' }}>
                  {agent.percent}%
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {view === 'models' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {modelPercentages.length === 0 ? (
            <div style={{ color: '#475569', fontSize: '0.82rem' }}>No model data yet</div>
          ) : (
            modelPercentages.map(model => (
              <div
                key={model.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                  padding: '0.5rem',
                  background: '#060d1a',
                  borderRadius: '6px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{model.name}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
                  {formatTokens(model.tokens)} tokens
                </div>
                <div
                  style={{
                    width: '80px',
                    height: '6px',
                    background: '#1e293b',
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      background: '#f59e0b',
                      width: `${model.percent}%`,
                    }}
                  />
                </div>
                <div style={{ fontSize: '0.82rem', color: '#f59e0b', width: '40px', textAlign: 'right' }}>
                  {model.percent}%
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}