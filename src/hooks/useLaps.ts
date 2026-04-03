import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing Supabase environment variables')
}

const headers = {
  'apikey': SUPABASE_KEY!,
  'Authorization': `Bearer ${SUPABASE_KEY!}`,
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
    mutationFn: ({ id, ...updates }: Partial<Lap> & { id: string }) => {
      // Sanitize empty strings to null for date/nullable fields
      // Supabase rejects empty string "" for DATE columns — must be null
      const sanitized = Object.fromEntries(
        Object.entries(updates).map(([k, v]) => [k, v === '' ? null : v])
      )
      return lapFetch(`/laps?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify(sanitized) })
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: lapKeys.all }),
  })
}

// Delete using service role key (bypasses RLS) if available, falls back to anon key
const SUPABASE_SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY

async function lapFetchDelete(path: string) {
  const key = SUPABASE_SERVICE_KEY || SUPABASE_KEY!
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, {
    method: 'DELETE',
    headers: {
      'apikey': key,
      'Authorization': `Bearer ${key}`,
      'Prefer': 'return=minimal',
    },
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase error: ${err}`)
  }
  return null
}

export const useDeleteLap = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => lapFetchDelete(`/laps?id=eq.${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: lapKeys.all }),
  })
}

export const useLapStatusCounts = () => {
  return useQuery({
    queryKey: ['laps', 'statusCounts'],
    queryFn: async () => {
      const data = await lapFetch('/laps?select=status') as { status: string }[]
      const counts: Record<string, number> = { LAP: 0, Listed: 0, Sold: 0, Withdrawn: 0 }
      data?.forEach(r => { if (counts[r.status] !== undefined) counts[r.status]++ })
      return counts
    },
    staleTime: 30 * 1000,
  })
}

export const usePipelineValue = () => {
  return useQuery({
    queryKey: ['laps', 'pipelineValue'],
    queryFn: async () => {
      const data = await lapFetch('/laps?status=eq.LAP&select=price_expectation,pipeline_section') as { price_expectation: string | null; pipeline_section: string | null }[]

      function parsePrice(s: string | null | undefined): number | null {
        if (!s || s.trim() === '') return null
        const clean = s.replace(/[$,\s]/g, '')
        if (clean.includes('-')) {
          const parts = clean.split('-').map(Number).filter(n => !isNaN(n))
          if (parts.length === 2) return (parts[0] + parts[1]) / 2
        }
        const num = parseFloat(clean.replace('+', ''))
        return isNaN(num) ? null : num
      }

      let total = 0
      let count = 0
      const bySection: Record<string, number> = {
        pipeline_a: 0, pipeline_b: 0, pipeline_c: 0, under_construction: 0,
      }

      data?.forEach(r => {
        const val = parsePrice(r.price_expectation)
        if (val) {
          total += val
          count++
          if (r.pipeline_section && bySection[r.pipeline_section] !== undefined) {
            bySection[r.pipeline_section] += val
          }
        }
      })

      return { total, count, bySection }
    },
    staleTime: 60 * 1000,
  })
}
