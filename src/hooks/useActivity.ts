import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabaseClient'

export interface ActivityRecord {
  id: string
  user_id?: string
  activity_type: string
  description?: string
  lap_id?: string
  points_awarded: number
  created_at: string
}

const activityKeys = {
  all: ['activity'] as const,
  lists: () => [...activityKeys.all, 'list'] as const,
  today: () => [...activityKeys.lists(), 'today'] as const,
  thisWeek: () => [...activityKeys.lists(), 'week'] as const,
  thisMonth: () => [...activityKeys.lists(), 'month'] as const,
}

// Fetch today's activity
export const useActivityToday = () => {
  const today = new Date().toISOString().split('T')[0]
  
  return useQuery({
    queryKey: activityKeys.today(),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as ActivityRecord[]
    },
    staleTime: 1 * 60 * 1000, // 1 minute
  })
}

// Fetch this week's activity
export const useActivityThisWeek = () => {
  return useQuery({
    queryKey: activityKeys.thisWeek(),
    queryFn: async () => {
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const startDate = sevenDaysAgo.toISOString()

      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .gte('created_at', startDate)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as ActivityRecord[]
    },
    staleTime: 5 * 60 * 1000,
  })
}

// Log activity
export const useLogActivity = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (activity: Omit<ActivityRecord, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('activity_log')
        .insert([activity])
        .select()

      if (error) throw error
      return data[0]
    },
    onSuccess: () => {
      // Invalidate all activity queries
      queryClient.invalidateQueries({ queryKey: activityKeys.all })
    },
  })
}

// Fetch this month's activity
export const useActivityThisMonth = () => {
  const firstDay = new Date()
  firstDay.setDate(1)
  const startDate = firstDay.toISOString().split('T')[0]
  const today = new Date().toISOString().split('T')[0]

  return useQuery({
    queryKey: ['activity', 'month'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data as ActivityRecord[]
    },
    staleTime: 10 * 60 * 1000,
  })
}

// Get total points (this month)
export const useTotalPointsThisMonth = () => {
  return useQuery({
    queryKey: ['points', 'month'],
    queryFn: async () => {
      const firstDay = new Date()
      firstDay.setDate(1)
      const startDate = firstDay.toISOString().split('T')[0]
      const today = new Date().toISOString().split('T')[0]

      const { data, error } = await supabase
        .from('activity_log')
        .select('points_awarded')
        .gte('created_at', `${startDate}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)

      if (error) throw error
      
      return data.reduce((total, record) => total + (record.points_awarded || 0), 0)
    },
    staleTime: 10 * 60 * 1000,
  })
}
