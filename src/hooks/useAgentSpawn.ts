import { useMutation, useQuery } from '@tanstack/react-query'
import { supabase } from '@/services/supabaseClient'
import { z } from 'zod'

// Type for agent spawn task
export const AgentSpawnSchema = z.object({
  agentId: z.string(),
  task: z.string(),
  model: z.string().optional(),
  thinking: z.string().optional(),
})

export type AgentSpawn = z.infer<typeof AgentSpawnSchema>

// Type for agent results
export const AgentResultSchema = z.object({
  id: z.string(),
  agent_type: z.string(),
  task: z.string(),
  status: z.enum(['queued', 'running', 'completed', 'failed']),
  output: z.string().nullable(),
  error: z.string().nullable(),
  created_at: z.string(),
  completed_at: z.string().nullable(),
})

export type AgentResult = z.infer<typeof AgentResultSchema>

/**
 * Hook to spawn agents and track their results
 * Handles:
 * - Calling sessions_spawn via REST API
 * - Storing initial result in Supabase
 * - Real-time subscription to result updates
 * - Error handling
 */
export function useAgentSpawn() {
  // Query: Get latest agent results
  const {
    data: results,
    isLoading: isLoadingResults,
    refetch: refetchResults,
  } = useQuery({
    queryKey: ['agent-results'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('agent_results')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw new Error(error.message)
      return (data || []) as AgentResult[]
    },
    refetchInterval: 8000, // Poll every 8s so results appear automatically
  })

  // Mutation: Spawn agent (calls sessions_spawn)
  const spawn = useMutation({
    mutationFn: async (payload: AgentSpawn) => {
      // Validate payload
      const validated = AgentSpawnSchema.parse(payload)

      // 1. Create result record in Supabase with 'queued' status
      const { data: resultData, error: insertError } = await supabase
        .from('agent_results')
        .insert({
          agent_type: validated.agentId,
          task: validated.task,
          model: validated.model || 'sonnet',
          status: 'queued',
          output: null,
          error: null,
        })
        .select()
        .single()

      if (insertError) throw new Error(`Failed to create agent result: ${insertError.message}`)

      const result = resultData as AgentResult

      // 2. Call backend service to spawn agent (this actually runs the agent)
      // The backend will:
      // - Call OpenClaw sessions_spawn()
      // - Agent runs in isolated session
      // - Results written to Supabase
      // - Status updated: running → completed/failed

      // Also store model in the record so poller knows which to use
      await supabase
        .from('agent_results')
        .update({ model: validated.model || 'sonnet' })
        .eq('id', result.id)

      // Task is now queued — poller on the server will pick it up within 10s
      return result
    },
    onSuccess: () => {
      // Refresh results list
      refetchResults()
    },
    onError: (error) => {
      console.error('Agent spawn failed:', error)
    },
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

/**
 * Hook to subscribe to real-time agent result updates
 */
export function useAgentResultsRealtimeSync() {
  const { refetch } = useQuery({
    queryKey: ['agent-results'],
    queryFn: async () => {
      const { data } = await supabase
        .from('agent_results')
        .select('*')
        .order('created_at', { ascending: false })
      return data || []
    },
  })

  // Subscribe to ALL agent_results changes
  supabase
    .channel('agent-results-all')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'agent_results',
      },
      () => {
        refetch()
      }
    )
    .subscribe()

  return null
}
