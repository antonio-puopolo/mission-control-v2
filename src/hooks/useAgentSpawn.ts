import { useMutation, useQuery } from '@tanstack/react-query'
import { z } from 'zod'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

async function sbFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(text)
  return text ? JSON.parse(text) : null
}

export const AgentSpawnSchema = z.object({
  agentId: z.string(),
  task: z.string(),
  model: z.string().optional(),
  thinking: z.string().optional(),
})

export type AgentSpawn = z.infer<typeof AgentSpawnSchema>

export interface AgentResult {
  id: string
  agent_type: string
  task: string
  model: string | null
  status: 'queued' | 'running' | 'completed' | 'failed'
  output: string | null
  error: string | null
  created_at: string
  completed_at: string | null
}

export function useAgentSpawn() {
  const { data: results, isLoading: isLoadingResults, refetch: refetchResults } = useQuery({
    queryKey: ['agent-results'],
    queryFn: async () => {
      const data = await sbFetch('/agent_results?order=created_at.desc&limit=20', {
        headers: { 'Prefer': '' },
      })
      return (data || []) as AgentResult[]
    },
    refetchInterval: 8000,
  })

  const spawn = useMutation({
    mutationFn: async (payload: AgentSpawn) => {
      const validated = AgentSpawnSchema.parse(payload)
      const rows = await sbFetch('/agent_results', {
        method: 'POST',
        headers: { 'Prefer': 'return=representation' },
        body: JSON.stringify({
          agent_type: validated.agentId,
          task: validated.task,
          model: validated.model || 'sonnet',
          status: 'queued',
        }),
      })
      return rows[0] as AgentResult
    },
    onSuccess: () => refetchResults(),
    onError: (error) => console.error('Agent spawn failed:', error),
  })

  return {
    spawn: spawn.mutate,
    spawnAsync: spawn.mutateAsync,
    isSpawning: spawn.isPending,
    results: results || [],
    isLoadingResults,
    error: spawn.error,
  }
}
