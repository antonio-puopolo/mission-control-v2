import { useState } from 'react'
import { useAgentSpawn } from '@/hooks/useAgentSpawn'

interface Agent {
  id: string
  name: string
  icon: string
  description: string
  defaultModel: string
  color: string
}

const agents: Agent[] = [
  { id: 'analyst', name: 'Analyst', icon: '📊', description: 'Market research, data analysis, suburb insights, competitor intel', defaultModel: 'sonnet', color: '#ffa502' },
  { id: 'copywriter', name: 'Copywriter', icon: '✍️', description: 'Property listings, email campaigns, marketing copy', defaultModel: 'sonnet', color: '#00D4AA' },
  { id: 'researcher', name: 'Researcher', icon: '🔍', description: 'Deep research on suburbs, buyers, market trends', defaultModel: 'sonnet', color: '#6c63ff' },
  { id: 'social', name: 'Social Media', icon: '🌐', description: 'Posts, captions, content calendar for Instagram & LinkedIn', defaultModel: 'sonnet', color: '#ff6b6b' },
  { id: 'strategist', name: 'Strategist', icon: '🎯', description: 'Campaign planning, pricing strategy, listing advice', defaultModel: 'sonnet', color: '#00D4AA' },
  { id: 'coder', name: 'Coder', icon: '👨‍💻', description: 'Build features, fix bugs, improve Mission Control', defaultModel: 'sonnet', color: '#6c63ff' },
]

const availableModels = [
  { id: 'sonnet', name: 'Claude Sonnet 4 (default)' },
  { id: 'opus', name: 'Claude Opus 4 (powerful)' },
  { id: 'haiku', name: 'Claude Haiku (fast)' },
  { id: 'gpt-4o', name: 'GPT-4o (OpenAI)' },
  { id: 'gemini-pro', name: 'Gemini 2.5 Pro (Google)' },
  { id: 'deepseek', name: 'DeepSeek v3 (fast & cheap)' },
  { id: 'llama', name: 'Llama 3.3 70B (open source)' },
]

export function Agents() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [task, setTask] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [showModal, setShowModal] = useState(false)

  const { spawn, isSpawning, results, error } = useAgentSpawn()

  const agent = agents.find(a => a.id === selectedAgent)

  const handleSpawn = async () => {
    if (!selectedAgent || !task.trim()) return
    spawn({ agentId: selectedAgent, task: task.trim(), model: selectedModel || agent?.defaultModel || 'sonnet' })
    setTask('')
    setSelectedModel('')
    setShowModal(false)
  }

  const closeModal = () => { setShowModal(false); setSelectedAgent(null); setTask(''); setSelectedModel('') }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Agents</h2>
          <p style={{ color: '#a0a0b0', margin: '0.25rem 0 0' }}>Spawn specialised agents for complex tasks — results via Supabase</p>
        </div>
      </div>

      {/* Agent Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
        {agents.map(a => (
          <div key={a.id} onClick={() => { setSelectedAgent(a.id); setShowModal(true) }}
            style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.07)`, borderTop: `3px solid ${a.color}`, borderRadius: '12px', padding: '1.25rem', cursor: 'pointer', transition: 'all 0.2s ease' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.03)')}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{a.icon}</div>
            <div style={{ fontWeight: '600', fontSize: '1rem', marginBottom: '0.4rem' }}>{a.name}</div>
            <div style={{ color: '#a0a0b0', fontSize: '0.82rem', lineHeight: '1.5' }}>{a.description}</div>
            <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: a.color, fontSize: '0.75rem', fontWeight: '600', background: `${a.color}18`, padding: '0.2rem 0.5rem', borderRadius: '4px' }}>Assign task →</span>
            </div>
          </div>
        ))}
      </div>

      {/* Results */}
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
                    <span style={{ color: statusColor, fontSize: '0.8rem', textTransform: 'uppercase' }}>{result.status}</span>
                  </div>
                  <div style={{ color: '#a0a0b0', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{result.task}</div>
                  {result.output && <div style={{ background: '#0a0a10', borderRadius: '6px', padding: '0.75rem', fontSize: '0.82rem', color: '#e0e0f0', fontFamily: 'monospace', maxHeight: '120px', overflowY: 'auto' }}>{result.output}</div>}
                  {result.error && <div style={{ color: '#ff6b6b', fontSize: '0.82rem', marginTop: '0.5rem' }}>{result.error}</div>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && agent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0a0a10', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '480px', margin: '1rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{agent.icon}</div>
            <h3 style={{ margin: '0 0 0.25rem' }}>{agent.name} Agent</h3>
            <p style={{ color: '#a0a0b0', fontSize: '0.85rem', marginBottom: '1.5rem' }}>{agent.description}</p>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#a0a0b0', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Model</label>
              <select value={selectedModel} onChange={e => setSelectedModel(e.target.value)}
                style={{ width: '100%', background: '#050508', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.6rem 0.75rem', color: '#fff', fontFamily: 'inherit' }}>
                {availableModels.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', color: '#a0a0b0', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Task</label>
              <textarea value={task} onChange={e => setTask(e.target.value)}
                placeholder="What do you want this agent to do?"
                rows={4}
                style={{ width: '100%', background: '#050508', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.75rem', color: '#fff', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            {error && <div style={{ color: '#ff6b6b', fontSize: '0.85rem', marginBottom: '1rem' }}>{error instanceof Error ? error.message : 'Failed to spawn agent'}</div>}

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={closeModal} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.75rem', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={handleSpawn} disabled={!task.trim() || isSpawning}
                style={{ flex: 1, background: agent.color, border: 'none', borderRadius: '8px', padding: '0.75rem', color: '#050508', cursor: 'pointer', fontWeight: '700', fontFamily: 'inherit', opacity: !task.trim() || isSpawning ? 0.5 : 1 }}>
                {isSpawning ? 'Spawning...' : 'Spawn Agent'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
