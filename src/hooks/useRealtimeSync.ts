import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/services/supabaseClient'

/**
 * Subscribe to real-time changes in a Supabase table
 * Automatically invalidates React Query cache when changes detected
 */
export const useRealtimeSync = (
  table: string,
  queryKeyPrefix: readonly unknown[]
) => {
  const queryClient = useQueryClient()
  const subscriptionRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    // Clean up any existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe()
    }

    // Create new subscription with unique channel name to avoid conflicts
    const channelName = `${table}_${Math.random().toString(36).substring(7)}`
    
    subscriptionRef.current = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
        },
        () => {
          // Debounce invalidation to avoid too many refreshes
          setTimeout(() => {
            queryClient.invalidateQueries({
              queryKey: queryKeyPrefix,
            })
          }, 100)
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe()
        subscriptionRef.current = null
      }
    }
  }, [table, queryClient]) // Remove queryKeyPrefix from deps to avoid recreating subscription
}
