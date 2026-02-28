import { useState } from 'react'
import { useAgentSpawn } from '@/hooks/useAgentSpawn'

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
  const [showModal, setShowModal] = useState(false)

  const { spawn, isSpawning, results, error } = useAgentSpawn()

  const agent = agents.find((a) => a.id === selectedAgent)
  const defaultModel = agent?.defaultModel || 'sonnet'

  const handleSpawn = async () => {
    if (!selectedAgent || !task.trim()) return

    spawn({
      agentId: selectedAgent,
      task: task.trim(),
      model: selectedModel || defaultModel,
    })

    // Clear form after spawn
    setTask('')
    setSelectedModel('')
    setShowModal(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Agent Spawning</h2>
          <p className="text-gray-400 mt-1">Run specialized agents for complex tasks</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium transition"
        >
          + Spawn Agent
        </button>
      </div>

      {/* Agent Selection Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map((a) => (
          <div
            key={a.id}
            onClick={() => {
              setSelectedAgent(a.id)
              setShowModal(true)
            }}
            className={`p-4 rounded-lg border-2 cursor-pointer transition ${
              selectedAgent === a.id
                ? 'border-teal-500 bg-teal-500/10'
                : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
            }`}
          >
            <div className="text-3xl mb-2">{a.icon}</div>
            <h3 className="text-white font-semibold">{a.name}</h3>
            <p className="text-gray-400 text-sm mt-2">{a.description}</p>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-500">{a.defaultModel}</span>
              <span className="text-xs font-semibold text-teal-400">{a.successRate}% success</span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-white mb-4">
              Spawn {agent?.name || 'Agent'}
            </h3>

            {/* Model Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Model (default: {defaultModel})
              </label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-teal-500"
              >
                <option value="">Use default</option>
                {availableModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.provider})
                  </option>
                ))}
              </select>
            </div>

            {/* Task Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Task</label>
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Describe what you want the agent to do..."
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 text-white rounded-lg focus:outline-none focus:border-teal-500 min-h-24"
              />
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded text-red-400 text-sm">
                {error instanceof Error ? error.message : 'Failed to spawn agent'}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false)
                  setSelectedAgent(null)
                  setTask('')
                  setSelectedModel('')
                }}
                disabled={isSpawning}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSpawn}
                disabled={!selectedAgent || !task.trim() || isSpawning}
                className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
              >
                {isSpawning ? 'Spawning...' : 'Spawn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Results Section */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-white">Recent Results</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {results.map((result) => {
              const agentInfo = agents.find((a) => a.id === result.agent_type)
              return (
                <div
                  key={result.id}
                  className={`p-4 rounded-lg border-l-4 ${
                    result.status === 'completed'
                      ? 'border-l-green-500 bg-green-900/10'
                      : result.status === 'failed'
                        ? 'border-l-red-500 bg-red-900/10'
                        : 'border-l-yellow-500 bg-yellow-900/10'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{agentInfo?.icon}</span>
                      <div>
                        <p className="font-semibold text-white">{agentInfo?.name}</p>
                        <p className="text-xs text-gray-400">
                          {new Date(result.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        result.status === 'completed'
                          ? 'bg-green-900 text-green-200'
                          : result.status === 'failed'
                            ? 'bg-red-900 text-red-200'
                            : 'bg-yellow-900 text-yellow-200'
                      }`}
                    >
                      {result.status}
                    </span>
                  </div>

                  <p className="text-sm text-gray-300 mb-2">
                    <strong>Task:</strong> {result.task}
                  </p>

                  {result.output && (
                    <div className="mt-3 p-3 bg-gray-900/50 rounded text-sm text-gray-200 font-mono max-h-32 overflow-y-auto">
                      {result.output}
                    </div>
                  )}

                  {result.error && (
                    <div className="mt-3 p-3 bg-red-900/30 rounded text-sm text-red-400 font-mono">
                      {result.error}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
