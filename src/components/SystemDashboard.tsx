import { useState, useEffect, useRef } from 'react'
import { RotateCcw } from 'lucide-react'
import { UsageCard } from './UsageCard'
import { GeorgeLLMConfig } from './GeorgeLLMConfig'


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
  gateway: { running: boolean | null }
  defaults: { primary: string; fallbacks: string[] }
  cloudMode?: boolean
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

// ── Change Model Modal ────────────────────────────────────────────────────────

interface ChangeModalProps {
  agent: AgentInfo
  onClose: () => void
  onApplied: () => void
}

function ChangeModelModal({ agent, onClose, onApplied }: ChangeModalProps) {
  const [selectedModel, setSelectedModel] = useState(agent.currentModel)
  const [phase, setPhase] = useState<'select' | 'pending' | 'done' | 'error'>('select')
  const [requestId, setRequestId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  async function handleApply() {
    setPhase('pending')

    // Strategy 1: Try localhost:9999 directly from the browser (instant, no server hop)
    // This works when browsing MC on the same machine as the OpenClaw server
    try {
      const localController = new AbortController()
      const localTimeout = setTimeout(() => localController.abort(), 2000)
      const localRes = await fetch('http://127.0.0.1:9999/apply-agent-model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, model: selectedModel }),
        signal: localController.signal,
      })
      clearTimeout(localTimeout)
      const localData = await localRes.json()
      if (localData.status === 'applied') {
        // Instant success! Also update Supabase for record-keeping
        fetch('/api/agent-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agentId: agent.id, newModel: selectedModel }),
        }).catch(() => {}) // fire-and-forget
        setPhase('done')
        setTimeout(() => { onApplied(); onClose() }, 1500)
        return
      }
    } catch {
      // Local server unreachable (MC on Vercel, or server not running) — fall through
    }

    // Strategy 2: Server-side via Supabase (queued, applied by 5-min cron)
    try {
      const res = await fetch('/api/agent-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, newModel: selectedModel }),
      })
      const data = await res.json()
      if (!res.ok && !data.success) throw new Error(data.error || 'Failed to submit request')

      // Instant apply (if server-side somehow reached localhost)
      if (data.appliedInstantly) {
        setPhase('done')
        setTimeout(() => { onApplied(); onClose() }, 1500)
        return
      }

      if (!data.id) {
        setPhase('done')
        setTimeout(() => { onApplied(); onClose() }, 1500)
        return
      }

      setRequestId(data.id)

      // Poll for status
      pollRef.current = setInterval(async () => {
        try {
          const pollRes = await fetch(`/api/agent-config?id=${data.id}`)
          const pollData = await pollRes.json()
          if (pollData.status === 'applied') {
            clearInterval(pollRef.current!)
            setPhase('done')
            setTimeout(() => { onApplied(); onClose() }, 1500)
          } else if (pollData.status === 'error') {
            clearInterval(pollRef.current!)
            setErrorMsg(pollData.result || 'Application failed')
            setPhase('error')
          }
        } catch {
          // keep polling
        }
      }, 2000)

      // Timeout after 60s
      setTimeout(() => {
        if (phase === 'pending') {
          clearInterval(pollRef.current!)
          setPhase('done')
          setTimeout(() => { onApplied(); onClose() }, 500)
        }
      }, 60000)

    } catch (e: any) {
      setErrorMsg(e.message)
      setPhase('error')
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: '#00000088', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{
        background: '#0d1320', border: '1px solid #1e3a5f',
        borderRadius: '14px', padding: '1.75rem', width: '420px', maxWidth: '95vw',
        boxShadow: '0 24px 64px #000000bb',
      }}>
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ ...label, marginBottom: '0.25rem' }}>Change Model</div>
          <div style={{ color: '#e2e8f0', fontWeight: 700, fontSize: '1.05rem' }}>{agent.name}</div>
          <div style={{ color: '#475569', fontSize: '0.78rem', marginTop: '0.2rem', fontFamily: 'monospace' }}>
            Current: {agent.currentModel}
          </div>
        </div>

        {phase === 'select' && (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1.25rem' }}>
              {AVAILABLE_MODELS.map((m) => (
                <button
                  key={m.value}
                  onClick={() => setSelectedModel(m.value)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '0.6rem 0.8rem',
                    background: selectedModel === m.value ? '#1e3a5f' : '#060d1a',
                    border: selectedModel === m.value ? '1px solid #00d4aa44' : '1px solid #0d1a2e',
                    borderRadius: '8px',
                    color: selectedModel === m.value ? '#00d4aa' : '#94a3b8',
                    fontSize: '0.82rem', cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {selectedModel === m.value && '✓ '}{m.label}
                  {m.value === agent.currentModel && (
                    <span style={{ marginLeft: '0.5rem', fontSize: '0.65rem', color: '#475569' }}>(current)</span>
                  )}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                style={{ padding: '0.5rem 1rem', background: 'transparent', border: '1px solid #1e3a5f', borderRadius: '8px', color: '#475569', cursor: 'pointer', fontSize: '0.82rem' }}
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={selectedModel === agent.currentModel}
                style={{
                  padding: '0.5rem 1.25rem',
                  background: selectedModel === agent.currentModel ? '#0d1a2e' : '#00d4aa22',
                  border: '1px solid #00d4aa44',
                  borderRadius: '8px', color: '#00d4aa',
                  cursor: selectedModel === agent.currentModel ? 'not-allowed' : 'pointer',
                  fontSize: '0.82rem', fontWeight: 600,
                  opacity: selectedModel === agent.currentModel ? 0.4 : 1,
                }}
              >
                Apply
              </button>
            </div>
          </>
        )}

        {phase === 'pending' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⏳</div>
            <div style={{ color: '#94a3b8', fontWeight: 600 }}>Applying…</div>
            <div style={{ color: '#475569', fontSize: '0.78rem', marginTop: '0.4rem' }}>
              {requestId ? 'Queued via Supabase · polling for cron sync' : 'Sending to local server…'}
            </div>
            {requestId && (
              <div style={{ color: '#334155', fontSize: '0.68rem', marginTop: '0.5rem', fontFamily: 'monospace' }}>
                id: {requestId.slice(0, 8)}… · syncs within 5 min
              </div>
            )}
          </div>
        )}

        {phase === 'done' && (
          <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>✅</div>
            <div style={{ color: '#22c55e', fontWeight: 600 }}>Applied!</div>
            <div style={{ color: '#475569', fontSize: '0.78rem', marginTop: '0.4rem' }}>
              Model updated successfully
            </div>
          </div>
        )}

        {phase === 'error' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>❌</div>
            <div style={{ color: '#ef4444', fontWeight: 600 }}>Failed</div>
            <div style={{ color: '#475569', fontSize: '0.78rem', marginTop: '0.4rem' }}>{errorMsg}</div>
            <button
              onClick={onClose}
              style={{ marginTop: '1rem', padding: '0.5rem 1.25rem', background: 'transparent', border: '1px solid #ef444444', borderRadius: '8px', color: '#ef4444', cursor: 'pointer', fontSize: '0.82rem' }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Agent Models Card ─────────────────────────────────────────────────────────

function AgentModelsCard() {
  const [data, setData] = useState<AgentsStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null)
  const [overriding, setOverriding] = useState<string | null>(null)
  const [overrideMsg, setOverrideMsg] = useState<Record<string, string>>({})
  const [changeModalAgent, setChangeModalAgent] = useState<AgentInfo | null>(null)

  useEffect(() => { fetchAgents() }, [])

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
      setOverrideMsg(prev => ({ ...prev, [agentId]: '✅ Reset to default model — takes effect next message' }))
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
      {changeModalAgent && (
        <ChangeModelModal
          agent={changeModalAgent}
          onClose={() => setChangeModalAgent(null)}
          onApplied={() => { setChangeModalAgent(null); setTimeout(fetchAgents, 1000) }}
        />
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <div style={label}>Agent Models</div>
          <div style={{ color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.1rem' }}>
            {data?.gateway?.running === null
              ? <span style={{ color: '#64748b' }}>● Gateway status N/A</span>
              : data?.gateway?.running
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
              {/* Row: status dot · name · model (plain text) · CHANGE button · expand toggle */}
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

                {/* Model (plain text, not clickable) */}
                <div style={{ flex: 1, minWidth: '180px', color: '#94a3b8', fontSize: '0.78rem', fontFamily: 'monospace' }}>
                  {overriding === agent.id ? '⏳ Applying…' : shortModel(agent.currentModel)}
                </div>

                {/* CHANGE button → opens modal → writes to agent_config_requests */}
                <button
                  onClick={() => setChangeModalAgent(agent)}
                  disabled={overriding === agent.id}
                  style={{
                    padding: '0.35rem 0.65rem',
                    background: '#00d4aa18',
                    border: '1px solid #00d4aa44',
                    borderRadius: '6px',
                    color: '#00d4aa',
                    cursor: overriding === agent.id ? 'wait' : 'pointer',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    flexShrink: 0,
                  }}
                >
                  CHANGE
                </button>

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
  const [loading] = useState(false) // Initially false, cards manage their own loading
  const [error] = useState<string | null>(null)

  // Combined refresh function for all cards
  const refreshAll = () => {
    // This is a placeholder. A better implementation might use a shared context
    // or event bus to trigger re-fetches in child components.
    // For now, we rely on the individual card refresh buttons.
    console.log('Triggering refresh for all system cards...')
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
          onClick={refreshAll}
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

      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>

          {/* ── Token Usage Card (New) ── */}
          <UsageCard />

          {/* ── George LLM Config ── */}
          <GeorgeLLMConfig />

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



        </div>
      )}
    </div>
  )
}
