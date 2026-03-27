import { useState, useEffect, useRef } from 'react'
import { ChevronDown, RotateCcw } from 'lucide-react'

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

interface AgentInfo {
  id: string
  name: string
  description: string
  currentModel: string
  primaryModel: string
  isOnFallback: boolean
  fallbackChain: string[]
  status: 'ok' | 'error' | 'unknown'
  lastError: string | null
  lastUpdated: string | null
  hasOverride: boolean
}

interface AgentsStatusResponse {
  agents: AgentInfo[]
  gateway: { running: boolean }
  defaults: { primary: string; fallbacks: string[] }
  timestamp: string
}

const AVAILABLE_MODELS = [
  { value: 'anthropic/claude-haiku-4-5', label: 'Claude Haiku 4.5 (fast)' },
  { value: 'anthropic/claude-sonnet-4-5', label: 'Claude Sonnet 4.5' },
  { value: 'anthropic/claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (latest)' },
  { value: 'openrouter/google/gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
  { value: 'openrouter/google/gemini-2.5-flash', label: 'Gemini 2.5 Flash (fast)' },
  { value: 'openrouter/z-ai/glm-5-turbo', label: 'GLM-5 Turbo (budget)' },
  { value: 'openrouter/meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
  { value: 'openrouter/qwen/qwen3-32b', label: 'Qwen3 32B' },
  { value: 'openrouter/deepseek/deepseek-chat-v3-0324', label: 'DeepSeek V3' },
]

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

function shortModel(model: string): string {
  // Strip provider prefix for display
  const parts = model.split('/')
  const name = parts[parts.length - 1]
  // Trim long names
  return name.length > 24 ? name.slice(0, 22) + '…' : name
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

// ── Agent Models Card ─────────────────────────────────────────────────────────

function AgentModelsCard() {
  const [data, setData] = useState<AgentsStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [overriding, setOverriding] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null)
  const [overrideMsg, setOverrideMsg] = useState<Record<string, string>>({})
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchAgents() }, [])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function fetchAgents() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/agents')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const d = await res.json()
      setData(d)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function applyOverride(agentId: string, model: string) {
    setOverriding(agentId)
    setDropdownOpen(null)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, model }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || 'Override failed')
      setOverrideMsg(prev => ({
        ...prev,
        [agentId]: result.gatewayRestart?.ok ? '✅ Override applied + gateway restarted' : '✅ Override saved (gateway restart failed)',
      }))
      // Refresh agent data
      setTimeout(() => fetchAgents(), 1500)
      setTimeout(() => setOverrideMsg(prev => { const n = { ...prev }; delete n[agentId]; return n }), 5000)
    } catch (e: any) {
      setOverrideMsg(prev => ({ ...prev, [agentId]: `❌ ${e.message}` }))
      setTimeout(() => setOverrideMsg(prev => { const n = { ...prev }; delete n[agentId]; return n }), 5000)
    } finally {
      setOverriding(null)
    }
  }

  async function resetOverride(agentId: string) {
    setOverriding(agentId)
    try {
      const res = await fetch('/api/agents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, action: 'reset' }),
      })
      const result = await res.json()
      if (!res.ok || !result.success) throw new Error(result.error || 'Reset failed')
      setOverrideMsg(prev => ({ ...prev, [agentId]: '✅ Reset to defaults + gateway restarted' }))
      setTimeout(() => fetchAgents(), 1500)
      setTimeout(() => setOverrideMsg(prev => { const n = { ...prev }; delete n[agentId]; return n }), 5000)
    } catch (e: any) {
      setOverrideMsg(prev => ({ ...prev, [agentId]: `❌ ${e.message}` }))
      setTimeout(() => setOverrideMsg(prev => { const n = { ...prev }; delete n[agentId]; return n }), 5000)
    } finally {
      setOverriding(null)
    }
  }

  return (
    <div style={{ ...card, border: '1px solid #1e3a5f33', gridColumn: '1 / -1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <div style={label}>Agent Models</div>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.1rem' }}>
            {data?.gateway?.running
              ? <span style={{ color: '#22c55e' }}>● Gateway online</span>
              : <span style={{ color: '#ef4444' }}>● Gateway offline</span>}
          </div>
        </div>
        <button
          onClick={fetchAgents}
          style={{ padding: '0.4rem 0.75rem', background: '#0d1320', color: '#00d4aa', border: '1px solid #00d4aa44', borderRadius: '8px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
        >
          ↻ Refresh
        </button>
      </div>

      {loading && <div style={{ color: '#475569', fontSize: '0.85rem' }}>Loading agents…</div>}
      {error && <div style={{ color: '#ef4444', fontSize: '0.82rem' }}>⚠️ {error}</div>}

      {!loading && data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }} ref={dropdownRef}>
          {data.agents.map((agent) => (
            <div
              key={agent.id}
              style={{
                background: '#060d1a',
                borderRadius: '10px',
                padding: '0.9rem 1rem',
                border: expandedAgent === agent.id ? '1px solid #1e3a5f' : '1px solid #0d1a2e',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Row: status dot · name · model dropdown · expand toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>

                {/* Status dot */}
                <div
                  title={agent.status === 'ok' ? 'Healthy' : agent.lastError || 'Error'}
                  style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    flexShrink: 0,
                    background: agent.status === 'ok' ? '#22c55e' : '#ef4444',
                    boxShadow: agent.status === 'ok' ? '0 0 6px #22c55e88' : '0 0 6px #ef444488',
                  }}
                />

                {/* Name + badge */}
                <div style={{ flex: '0 0 auto', minWidth: '110px' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#e2e8f0' }}>{agent.name}</span>
                  {agent.hasOverride && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', background: '#7c3aed22', color: '#a78bfa', border: '1px solid #7c3aed44', borderRadius: '4px', padding: '1px 5px', fontWeight: 600 }}>
                      OVERRIDE
                    </span>
                  )}
                  {agent.isOnFallback && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b44', borderRadius: '4px', padding: '1px 5px', fontWeight: 600 }}>
                      FALLBACK
                    </span>
                  )}
                </div>

                {/* Model dropdown */}
                <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
                  <button
                    onClick={() => setDropdownOpen(dropdownOpen === agent.id ? null : agent.id)}
                    disabled={overriding === agent.id}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.35rem 0.65rem',
                      background: '#0d1a2e',
                      border: '1px solid #1e3a5f',
                      borderRadius: '6px',
                      color: '#94a3b8',
                      fontSize: '0.78rem',
                      fontFamily: 'monospace',
                      cursor: overriding === agent.id ? 'wait' : 'pointer',
                      gap: '0.4rem',
                    }}
                  >
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {overriding === agent.id ? '⏳ Applying…' : shortModel(agent.currentModel)}
                    </span>
                    <ChevronDown size={13} style={{ flexShrink: 0, opacity: 0.6 }} />
                  </button>

                  {/* Dropdown menu */}
                  {dropdownOpen === agent.id && (
                    <div style={{
                      position: 'absolute',
                      top: 'calc(100% + 4px)',
                      left: 0,
                      right: 0,
                      background: '#0d1a2e',
                      border: '1px solid #1e3a5f',
                      borderRadius: '8px',
                      zIndex: 100,
                      overflow: 'hidden',
                      boxShadow: '0 8px 32px #00000066',
                    }}>
                      {AVAILABLE_MODELS.map((m) => (
                        <button
                          key={m.value}
                          onClick={() => applyOverride(agent.id, m.value)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            padding: '0.55rem 0.75rem',
                            background: m.value === agent.currentModel ? '#1e3a5f' : 'transparent',
                            border: 'none',
                            color: m.value === agent.currentModel ? '#00d4aa' : '#94a3b8',
                            fontSize: '0.78rem',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={e => { if (m.value !== agent.currentModel) (e.target as HTMLElement).style.background = '#0a1520' }}
                          onMouseLeave={e => { if (m.value !== agent.currentModel) (e.target as HTMLElement).style.background = 'transparent' }}
                        >
                          {m.value === agent.currentModel && '✓ '}{m.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reset override button */}
                {agent.hasOverride && (
                  <button
                    onClick={() => resetOverride(agent.id)}
                    title="Reset to default model"
                    disabled={overriding === agent.id}
                    style={{ background: 'transparent', border: '1px solid #1e3a5f', borderRadius: '6px', color: '#475569', cursor: 'pointer', padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center' }}
                  >
                    <RotateCcw size={12} />
                  </button>
                )}

                {/* Expand toggle */}
                <button
                  onClick={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
                  style={{ background: 'transparent', border: 'none', color: '#334155', cursor: 'pointer', fontSize: '0.72rem', padding: '0.25rem 0.4rem', marginLeft: 'auto', flexShrink: 0 }}
                >
                  {expandedAgent === agent.id ? '▲' : '▼'}
                </button>
              </div>

              {/* Override status message */}
              {overrideMsg[agent.id] && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: overrideMsg[agent.id].startsWith('✅') ? '#22c55e' : '#ef4444' }}>
                  {overrideMsg[agent.id]}
                </div>
              )}

              {/* Expanded details */}
              {expandedAgent === agent.id && (
                <div style={{ marginTop: '0.9rem', borderTop: '1px solid #0d1a2e', paddingTop: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ ...label, marginBottom: '0.1rem' }}>Primary Model</div>
                      <code style={{ fontSize: '0.75rem', color: '#64748b' }}>{agent.primaryModel}</code>
                    </div>
                    <div>
                      <div style={{ ...label, marginBottom: '0.1rem' }}>Active Model</div>
                      <code style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{agent.currentModel}</code>
                    </div>
                  </div>

                  {agent.fallbackChain.length > 0 && (
                    <div>
                      <div style={{ ...label, marginBottom: '0.4rem' }}>Fallback Chain</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {agent.fallbackChain.map((m, i) => (
                          <span key={m} style={{ fontSize: '0.7rem', fontFamily: 'monospace', background: '#0d1a2e', border: '1px solid #1e3a5f', borderRadius: '4px', padding: '2px 7px', color: '#475569' }}>
                            {i + 1}. {shortModel(m)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {agent.lastError && (
                    <div>
                      <div style={{ ...label, marginBottom: '0.2rem', color: '#ef444488' }}>Last Error</div>
                      <div style={{ fontSize: '0.78rem', color: '#ef4444', background: '#ef444410', border: '1px solid #ef444430', borderRadius: '6px', padding: '0.5rem 0.75rem', fontFamily: 'monospace' }}>
                        {agent.lastError}
                      </div>
                    </div>
                  )}

                  <div style={{ fontSize: '0.7rem', color: '#334155' }}>
                    {agent.description}
                    {agent.lastUpdated && <span> · Last changed: {new Date(agent.lastUpdated).toLocaleString('en-AU')}</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main SystemDashboard ──────────────────────────────────────────────────────

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
          <p style={{ color: '#475569', margin: '0.15rem 0 0', fontSize: '0.72rem' }}>Spend · Services · Budget · Agents</p>
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

          {/* ── Agent Models Card ── */}
          <AgentModelsCard />

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
