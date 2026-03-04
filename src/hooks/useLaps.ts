import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const SUPABASE_URL = 'https://zjyrillpennxowntwebo.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDA4MiwiZXhwIjoyMDg4MDEwMDgyfQ.qs_YCiL_rfyVVNl2jHyFGDi9lhafOXXSnXjYtogUmXY'

const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
}

async function lapFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    ...options,
    headers: { ...headers, ...(options?.headers || {}) },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase error: ${err}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export interface Lap {
  id: string
  address: string
  client_name: string
  status: 'LAP' | 'Listed' | 'Sold' | 'Withdrawn'
  follow_up_date?: string | null
  notes?: Record<string, any>
  agent_assigned?: string | null
  phone?: string | null
  email?: string | null
  price_expectation?: string | null
  priority?: string | null
  next_action?: string | null
  note_text?: string | null
  pipeline_section?: string | null
  created_at?: string
  updated_at?: string
}

const lapKeys = {
  all: ['laps'] as const,
  lists: () => [...lapKeys.all, 'list'] as const,
  list: (filters: string) => [...lapKeys.lists(), { filters }] as const,
  detail: (id: string) => [...lapKeys.all, 'detail', id] as const,
}

export const useLaps = () => {
  return useQuery({
    queryKey: lapKeys.lists(),
    queryFn: () => lapFetch('/laps?order=created_at.desc') as Promise<Lap[]>,
    staleTime: 5 * 60 * 1000,
  })
}

export const useLapsByStatus = (status: string) => {
  return useQuery({
    queryKey: lapKeys.list(status),
    queryFn: async () => {
      const data = await lapFetch(`/laps?status=eq.${encodeURIComponent(status)}&order=created_at.desc`) as Lap[]
      const order: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }
      return data.sort((a, b) => (order[a.priority || 'normal'] ?? 2) - (order[b.priority || 'normal'] ?? 2))
    },
    staleTime: 0,
  })
}

export const useCreateLap = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (lap: Omit<Lap, 'id' | 'created_at' | 'updated_at'>) =>
      lapFetch('/laps', { method: 'POST', body: JSON.stringify(lap) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: lapKeys.all }),
  })
}

export const useUpdateLap = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<Lap> & { id: string }) =>
      lapFetch(`/laps?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: lapKeys.all }),
  })
}

export const useDeleteLap = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      lapFetch(`/laps?id=eq.${id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: lapKeys.all }),
  })
}
