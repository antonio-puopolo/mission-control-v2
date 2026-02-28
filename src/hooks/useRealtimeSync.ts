import { useEffect } from 'react'
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

  useEffect(() => {
    // Subscribe to all changes on the table
    const subscription = supabase
      .channel(`public:${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
        },
        () => {
          // Invalidate React Query cache for this table
          queryClient.invalidateQueries({
            queryKey: queryKeyPrefix,
          })
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [table, queryClient, queryKeyPrefix])
}
