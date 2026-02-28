import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabaseClient'

export interface Lap {
  id: string
  address: string
  client_name: string
  status: 'LAP' | 'Listed' | 'Sold' | 'Withdrawn'
  follow_up_date?: string
  notes: Record<string, any>
  agent_assigned?: string
  created_at: string
  updated_at: string
}

const lapKeys = {
  all: ['laps'] as const,
  lists: () => [...lapKeys.all, 'list'] as const,
  list: (filters: string) => [...lapKeys.lists(), { filters }] as const,
  details: () => [...lapKeys.all, 'detail'] as const,
  detail: (id: string) => [...lapKeys.details(), id] as const,
}

// Fetch all LAPs
export const useLaps = () => {
  return useQuery({
    queryKey: lapKeys.lists(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('laps')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Lap[]
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Fetch LAPs by status
export const useLapsByStatus = (status: string) => {
  return useQuery({
    queryKey: lapKeys.list(status),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('laps')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as Lap[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Create LAP
export const useCreateLap = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (lap: Omit<Lap, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('laps')
        .insert([lap])
        .select()
      
      if (error) throw error
      return data[0]
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lapKeys.all })
    },
  })
}

// Update LAP
export const useUpdateLap = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Lap> & { id: string }) => {
      const { data, error } = await supabase
        .from('laps')
        .update(updates)
        .eq('id', id)
        .select()
      
      if (error) throw error
      return data[0]
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: lapKeys.all })
      queryClient.setQueryData(lapKeys.detail(data.id), data)
    },
  })
}

// Delete LAP
export const useDeleteLap = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('laps')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: lapKeys.all })
    },
  })
}
