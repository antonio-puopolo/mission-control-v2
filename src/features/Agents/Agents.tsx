import { useState } from 'react'

interface Agent {
  id: string
  name: string
  icon: string
  description: string
  defaultModel: string
  successRate: number
  color: string
}

const agents: Agent[] = [
  {
    id: 'social',
    name: 'Social Media Agent',
    icon: '🌐',
    description: 'Posts, tweets, captions, engagement',
    defaultModel: 'sonnet',
    successRate: 94,
    color: '#00D4AA',
  },
  {
    id: 'coder',
    name: 'Coder Agent',
    icon: '👨‍💻',
    description: 'Building, debugging, refactoring code',
    defaultModel: 'opus',
    successRate: 97,
    color: '#6c63ff',
  },
  {
    id: 'analyst',
    name: 'Analyst Agent',
    icon: '📊',
    description: 'Market research, data analysis, insights',
    defaultModel: 'gemini',
    successRate: 92,
    color: '#ffa502',
  },
  {
    id: 'copywriter',
    name: 'Copywriter Agent',
    icon: '✍️',
    description: 'Email, landing pages, marketing copy',
    defaultModel: 'sonnet',
    successRate: 95,
    color: '#00D4AA',
  },
  {
    id: 'strategist',
    name: 'Strategist Agent',
    icon: '🎯',
    description: 'Planning, positioning, GTM strategy',
    defaultModel: 'opus',
    successRate: 96,
    color: '#6c63ff',
  },
]

const availableModels = [
  { id: 'opus', name: 'Opus 4.5', provider: 'Anthropic' },
  { id: 'sonnet', name: 'Sonnet 4.5', provider: 'Anthropic' },
  { id: 'haiku', name: 'Haiku 4', provider: 'Anthropic' },
  { id: 'gemini', name: 'Gemini Pro', provider: 'Google' },
  { id: 'gemini-flash', name: 'Gemini Flash', provider: 'Google' },
  { id: 'gpt', name: 'GPT-5.2', provider: 'OpenAI' },
  { id: 'gpt-mini', name: 'GPT-4 Mini', provider: 'OpenAI' },
]

export function Agents() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [task, setTask] = useState('')
  const [selectedModel, setSelectedModel] = useState<string>('')
  const [isSpawning, setIsSpawning] = useState(false)
  const [results, setResults] = useState<Array<{ agentId: string; task: string; result: string; timestamp: string; model: string }>>([])

  const agent = agents.find((a) => a.id === selectedAgent)
  const defaultModel = agent?.defaultModel || 'sonnet'

  const handleSpawn = async () => {
    if (!selectedAgent || !task.trim()) return

    setIsSpawning(true)
    try {
      // In real app, this would call the agent server with selectedModel
      // For now, we simulate a response
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const modelToUse = selectedModel || defaultModel
      const modelName = availableModels.find((m) => m.id === modelToUse)?.name || modelToUse

      const result = {
        agentId: selectedAgent,
        task: task,
        result: `[${agent?.name} • ${modelName}] Completed task: "${task}"\n\nThis is a simulated response. In production, this would call your agent server with the selected model.`,
        timestamp: new Date().toLocaleTimeString(),
        model: modelToUse,
      }

      setResults([result, ...results])
      setTask('')
      setSelectedAgent(null)
      setSelectedModel('')
    } finally {
      setIsSpawning(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h2>🤖 Agent System</h2>
        <p style={{ color: '#a0a0b0', marginTop: '0.5rem' }}>
          Spawn specialized AI agents to handle tasks autonomously
        </p>
      </div>

      {/* Agent Selection */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
        {agents.map((a) => (
          <div
            key={a.id}
            onClick={() => setSelectedAgent(a.id)}
            style={{
              background: selectedAgent === a.id ? 'rgba(0, 212, 170, 0.1)' : '#0f0f14',
              border: selectedAgent === a.id ? `2px solid ${a.color}` : '1px solid #333',
              padding: '1.5rem',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{a.icon}</div>
            <h3 style={{ margin: '0 0 0.5rem 0' }}>{a.name}</h3>
            <p style={{ margin: '0 0 1rem 0', color: '#a0a0b0', fontSize: '0.85rem' }}>{a.description}</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem' }}>
              <span style={{ color: '#a0a0b0' }}>Model: {availableModels.find((m) => m.id === a.defaultModel)?.name || a.defaultModel}</span>
              <span style={{ color: a.color, fontWeight: '600' }}>{a.successRate}% ✓</span>
            </div>
          </div>
        ))}
      </div>

      {/* Task Input */}
      {selectedAgent && (
        <div style={{ background: '#0f0f14', padding: '2rem', borderRadius: '8px' }}>
          <h3>Task for {agent?.name}</h3>
          <textarea
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="Describe what you need the agent to do..."
            style={{
              width: '100%',
              height: '120px',
              padding: '1rem',
              background: '#141e1e',
              border: '1px solid #333',
              borderRadius: '4px',
              color: '#fff',
              fontFamily: 'inherit',
              marginBottom: '1rem',
              resize: 'vertical',
            }}
          />

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#a0a0b0', fontSize: '0.9rem' }}>
              Model (optional - default: {availableModels.find((m) => m.id === defaultModel)?.name})
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: '#141e1e',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
                fontFamily: 'inherit',
                cursor: 'pointer',
              }}
            >
              <option value="">Use default: {availableModels.find((m) => m.id === defaultModel)?.name}</option>
              {availableModels.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} ({model.provider})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleSpawn}
              disabled={isSpawning || !task.trim()}
              style={{
                padding: '0.75rem 1.5rem',
                background: agent?.color,
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: isSpawning || !task.trim() ? 0.5 : 1,
              }}
            >
              {isSpawning ? '⏳ Spawning...' : '🚀 Spawn Agent'}
            </button>
            <button
              onClick={() => {
                setSelectedAgent(null)
                setTask('')
                setSelectedModel('')
              }}
              style={{
                padding: '0.75rem 1.5rem',
                background: 'transparent',
                color: '#a0a0b0',
                border: '1px solid #333',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <h3>Recent Results</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {results.map((r, i) => {
              const resultAgent = agents.find((a) => a.id === r.agentId)
              return (
                <div
                  key={i}
                  style={{
                    background: '#0f0f14',
                    padding: '1.5rem',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${resultAgent?.color}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '1rem' }}>
                    <div>
                      <h4 style={{ margin: 0, marginBottom: '0.25rem' }}>
                        {resultAgent?.icon} {resultAgent?.name}
                      </h4>
                      <p style={{ margin: 0, color: '#a0a0b0', fontSize: '0.85rem' }}>
                        {availableModels.find((m) => m.id === r.model)?.name} • {r.timestamp}
                      </p>
                    </div>
                    <span style={{ background: 'rgba(0, 212, 170, 0.2)', color: '#00D4AA', padding: '0.25rem 0.75rem', borderRadius: '4px', fontSize: '0.8rem' }}>
                      ✅ Done
                    </span>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <p style={{ color: '#a0a0b0', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Task:</p>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>{r.task}</p>
                  </div>
                  <div>
                    <p style={{ color: '#a0a0b0', fontSize: '0.9rem', marginBottom: '0.5rem' }}>Result:</p>
                    <pre
                      style={{
                        background: '#141e1e',
                        padding: '1rem',
                        borderRadius: '4px',
                        overflow: 'auto',
                        fontSize: '0.85rem',
                        margin: 0,
                      }}
                    >
                      {r.result}
                    </pre>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
