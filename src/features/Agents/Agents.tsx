import { useState, useEffect } from 'react'
import { useAgentSpawn } from '@/hooks/useAgentSpawn'

interface Agent {
  id: string
  name: string
  icon: string
  description: string
  smartModel: string
  smartReason: string
  color: string
}

// Cost per 1M tokens (input+output blended estimate), in USD
const MODEL_META: Record<string, { name: string; costPer1M: number; badge: string; badgeColor: string }> = {
  'haiku':      { name: 'Claude Haiku 3.5',      costPer1M: 1.00,  badge: '⚡ Fast & Cheap',    badgeColor: '#00D4AA' },
  'deepseek':   { name: 'DeepSeek v3',            costPer1M: 0.40,  badge: '💰 Ultra Cheap',     badgeColor: '#00D4AA' },
  'llama':      { name: 'Llama 3.3 70B',          costPer1M: 0.60,  badge: '🆓 Open Source',     badgeColor: '#6c63ff' },
  'sonnet':     { name: 'Claude Sonnet 4',         costPer1M: 15.00, badge: '🧠 Balanced',        badgeColor: '#ffa502' },
  'gpt-4o':     { name: 'GPT-4o',                 costPer1M: 10.00, badge: '🧠 Balanced',        badgeColor: '#ffa502' },
  'gemini-pro': { name: 'Gemini 2.5 Pro',         costPer1M: 7.00,  badge: '🧠 Balanced',        badgeColor: '#ffa502' },
  'opus':       { name: 'Claude Opus 4',           costPer1M: 75.00, badge: '💎 Most Powerful',   badgeColor: '#ff6b6b' },
}

// Typical tokens per task (rough estimate)
const AVG_TOKENS = 2000

function estimateCost(modelId: string): string {
  const m = MODEL_META[modelId]
  if (!m) return ''
  const cost = (m.costPer1M / 1_000_000) * AVG_TOKENS
  if (cost < 0.001) return '< $0.001'
  return `~$${cost.toFixed(3)}`
}

const agents: Agent[] = [
  {
    id: 'analyst',
    name: 'Analyst',
    icon: '📊',
    description: 'Market research, data analysis, suburb insights, competitor intel',
    smartModel: 'deepseek',
    smartReason: 'DeepSeek is great at structured research — fast and very cheap.',
    color: '#ffa502',
  },
  {
    id: 'copywriter',
    name: 'Copywriter',
    icon: '✍️',
    description: 'Property listings, email campaigns, marketing copy',
    smartModel: 'sonnet',
    smartReason: 'Writing quality matters — Sonnet gives the best output for copy.',
    color: '#00D4AA',
  },
  {
    id: 'researcher',
    name: 'Researcher',
    icon: '🔍',
    description: 'Deep research on suburbs, buyers, market trends',
    smartModel: 'deepseek',
    smartReason: 'DeepSeek handles long research tasks well at a fraction of the cost.',
    color: '#6c63ff',
  },
  {
    id: 'social',
    name: 'Social Media',
    icon: '🌐',
    description: 'Posts, captions, content calendar for Instagram & LinkedIn',
    smartModel: 'haiku',
    smartReason: 'Short-form content — Haiku is fast, cheap, and more than capable.',
    color: '#ff6b6b',
  },
  {
    id: 'strategist',
    name: 'Strategist',
    icon: '🎯',
    description: 'Campaign planning, pricing strategy, listing advice',
    smartModel: 'sonnet',
    smartReason: 'Strategic thinking needs nuance — Sonnet is the right balance.',
    color: '#00D4AA',
  },
  {
    id: 'coder',
    name: 'Coder',
    icon: '👨‍💻',
    description: 'Build features, fix bugs, improve Mission Control',
    smartModel: 'sonnet',
    smartReason: 'Code quality and reasoning matters — Sonnet handles this well.',
    color: '#6c63ff',
  },
  {
    id: 'lap-prep',
    name: 'LAP Prep',
    icon: '🏠',
    description: 'Full listing appointment brief — comps, price range, talking points, objection handlers',
    smartModel: 'sonnet',
    smartReason: 'LAP prep needs nuance and local market knowledge — Sonnet is the right call.',
    color: '#00D4AA',
  },
  {
    id: 'pipeline',
    name: 'Pipeline',
    icon: '📋',
    description: 'Who to call today, overdue follow-ups, next actions across your LAP tracker',
    smartModel: 'haiku',
    smartReason: 'Pipeline reviews are fast and structured — Haiku handles this quickly and cheaply.',
    color: '#ffa502',
  },
]

const availableModels = Object.entries(MODEL_META).map(([id, m]) => ({ id, ...m }))

export function Agents() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [task, setTask] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [useSmartModel, setUseSmartModel] = useState(true)

  const { spawn, isSpawning, results, isLoadingResults, error } = useAgentSpawn()

  const agent = agents.find(a => a.id === selectedAgent)
  const activeModel = useSmartModel ? (agent?.smartModel || 'sonnet') : selectedModel || agent?.smartModel || 'sonnet'
  const modelMeta = MODEL_META[activeModel]

  // Reset smart mode when agent changes
  useEffect(() => {
    setUseSmartModel(true)
    setSelectedModel('')
  }, [selectedAgent])

  const handleSpawn = async () => {
    if (!selectedAgent || !task.trim()) return
    spawn({ agentId: selectedAgent, task: task.trim(), model: activeModel })
    setTask('')
    setSelectedModel('')
    setShowModal(false)
    setUseSmartModel(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedAgent(null)
    setTask('')
    setSelectedModel('')
    setUseSmartModel(true)
  }

  const inputStyle = {
    width: '100%',
    background: '#050508',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '0.6rem 0.75rem',
    color: '#fff',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={{ margin: 0 }}>Agents</h2>
        <p style={{ color: '#a0a0b0', margin: '0.25rem 0 0' }}>Spawn specialised agents — Hamm picks the right model automatically</p>
      </div>

      {/* Agent Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {agents.map(a => {
          const smart = MODEL_META[a.smartModel]
          return (
            <div key={a.id}
              onClick={() => { setSelectedAgent(a.id); setShowModal(true) }}
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderTop: `3px solid ${a.color}`, borderRadius: '12px', padding: '1.25rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}
            >
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{a.icon}</div>
              <div style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '0.4rem' }}>{a.name}</div>
              <div style={{ color: '#a0a0b0', fontSize: '0.82rem', lineHeight: '1.5', marginBottom: '1rem' }}>{a.description}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: a.color, fontSize: '0.75rem', fontWeight: '600', background: `${a.color}18`, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Assign task →</span>
                {smart && (
                  <span style={{ fontSize: '0.7rem', color: smart.badgeColor, background: `${smart.badgeColor}15`, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    {smart.badge}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Results */}
      <div style={{ color: '#a0a0b0', fontSize: '0.8rem' }}>
        {isLoadingResults ? 'Loading results...' : `${results.length} task(s) in history`}
        {error && <span style={{ color: '#ff6b6b', marginLeft: '1rem' }}>Error: {error instanceof Error ? error.message : 'Unknown error'}</span>}
      </div>

      {results.length > 0 && (
        <div>
          <h3 style={{ marginBottom: '0.75rem', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a0a0b0' }}>Recent Results</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '400px', overflowY: 'auto' }}>
            {results.map(result => {
              const agentInfo = agents.find(a => a.id === result.agent_type)
              const statusColor = result.status === 'completed' ? '#00D4AA' : result.status === 'failed' ? '#ff6b6b' : '#ffa502'
              return (
                <div key={result.id} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderLeft: `3px solid ${statusColor}`, borderRadius: '8px', padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontWeight: '600' }}>{agentInfo?.icon} {agentInfo?.name}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      {result.model && <span style={{ color: '#666', fontSize: '0.75rem' }}>{MODEL_META[result.model]?.name || result.model}</span>}
                      <span style={{ color: statusColor, fontSize: '0.8rem', textTransform: 'uppercase' }}>{result.status}</span>
                    </div>
                  </div>
                  <div style={{ color: '#a0a0b0', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{result.task}</div>
                  {result.output && <div style={{ background: '#0a0a10', borderRadius: '6px', padding: '0.75rem', fontSize: '0.82rem', color: '#e0e0f0', fontFamily: 'monospace', maxHeight: '150px', overflowY: 'auto', whiteSpace: 'pre-wrap' }}>{result.output}</div>}
                  {result.error && <div style={{ color: '#ff6b6b', fontSize: '0.82rem', marginTop: '0.5rem' }}>{result.error}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && agent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}>
          <div style={{ background: '#0a0a10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '500px', margin: '1rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{agent.icon}</div>
            <h3 style={{ margin: '0 0 0.25rem' }}>{agent.name} Agent</h3>
            <p style={{ color: '#a0a0b0', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{agent.description}</p>

            {/* Model selector */}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#a0a0b0', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model</label>

              {/* Smart recommendation */}
              <div
                onClick={() => setUseSmartModel(true)}
                style={{ padding: '0.75rem 1rem', borderRadius: '8px', border: `2px solid ${useSmartModel ? '#00D4AA' : 'rgba(255,255,255,0.1)'}`, background: useSmartModel ? 'rgba(0,212,170,0.08)' : 'transparent', cursor: 'pointer', marginBottom: '0.5rem', transition: 'all 0.15s' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>🤖 Smart Pick — {modelMeta?.name}</div>
                    <div style={{ color: '#a0a0b0', fontSize: '0.78rem', marginTop: '0.2rem' }}>{agent.smartReason}</div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                    <div style={{ color: '#00D4AA', fontSize: '0.75rem', fontWeight: 600 }}>{modelMeta?.badge}</div>
                    <div style={{ color: '#666', fontSize: '0.72rem' }}>{estimateCost(activeModel)} / task</div>
                  </div>
                </div>
              </div>

              {/* Manual override */}
              <div
                onClick={() => setUseSmartModel(false)}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: `2px solid ${!useSmartModel ? '#ffa502' : 'rgba(255,255,255,0.1)'}`, background: !useSmartModel ? 'rgba(255,165,2,0.06)' : 'transparent', cursor: 'pointer', transition: 'all 0.15s' }}
              >
                <div style={{ fontWeight: 500, fontSize: '0.85rem', marginBottom: !useSmartModel ? '0.5rem' : 0 }}>⚙️ Choose manually</div>
                {!useSmartModel && (
                  <select
                    value={selectedModel || agent.smartModel}
                    onChange={e => setSelectedModel(e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{ ...inputStyle, marginTop: '0.25rem' }}
                  >
                    {availableModels.map(m => (
                      <option key={m.id} value={m.id}>
                        {m.name} — {estimateCost(m.id)} / task
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Task input */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#a0a0b0', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task</label>
              <textarea
                value={task}
                onChange={e => setTask(e.target.value)}
                placeholder="What do you want this agent to do?"
                rows={4}
                style={{ ...inputStyle, resize: 'vertical' }}
                autoFocus
              />
            </div>

            {error && <div style={{ color: '#ff6b6b', fontSize: '0.85rem', marginBottom: '1rem' }}>{error instanceof Error ? error.message : 'Failed to spawn agent'}</div>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={closeModal} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.75rem', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button
                onClick={handleSpawn}
                disabled={!task.trim() || isSpawning}
                style={{ flex: 2, background: agent.color, border: 'none', borderRadius: '8px', padding: '0.75rem', color: '#050508', cursor: 'pointer', fontWeight: '700', fontFamily: 'inherit', opacity: !task.trim() || isSpawning ? 0.5 : 1 }}
              >
                {isSpawning ? 'Spawning...' : `Spawn ${agent.name} — ${estimateCost(activeModel)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
