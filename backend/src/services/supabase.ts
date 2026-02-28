import { createClient } from '@supabase/supabase-js'
import { logger } from '../utils/logger.js'

// Try to load from environment, with fallback values for development
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://zauqqaifszugluyactcv.supabase.co'

const SUPABASE_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'sb_publishable_ZTH04R87aWDjog6FpG7wAw_stLW9yqc'

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase credentials in environment (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/**
 * Update agent result status
 */
export async function updateAgentResult(
  resultId: string,
  data: {
    status?: 'queued' | 'running' | 'completed' | 'failed'
    output?: string | null
    error?: string | null
    completed_at?: string | null
  }
) {
  const { error } = await supabase.from('agent_results').update(data).eq('id', resultId)

  if (error) {
    logger.error({ error, resultId }, 'Failed to update agent result')
    throw error
  }

  logger.info({ resultId, data }, 'Updated agent result')
}

/**
 * Get agent result by ID
 */
export async function getAgentResult(resultId: string) {
  const { data, error } = await supabase
    .from('agent_results')
    .select('*')
    .eq('id', resultId)
    .single()

  if (error) {
    logger.error({ error, resultId }, 'Failed to fetch agent result')
    throw error
  }

  return data
}
