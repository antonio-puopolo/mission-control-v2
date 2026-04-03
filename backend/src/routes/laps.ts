import { Router, Request, Response, NextFunction } from 'express'
import { createClient } from '@supabase/supabase-js'
import { logger } from '../utils/logger.js'

const router = Router()

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create admin client with service role key (bypasses RLS)
const adminClient = SUPABASE_SERVICE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  : null

// DELETE /api/laps/:id
router.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!adminClient) {
      return res.status(500).json({ error: 'Service role key not configured' })
    }

    const { id } = req.params

    // Verify the lap exists first
    const { data: existing, error: findError } = await adminClient
      .from('laps')
      .select('id, address')
      .eq('id', id)
      .single()

    if (findError || !existing) {
      return res.status(404).json({ error: 'LAP not found' })
    }

    const { error: deleteError } = await adminClient
      .from('laps')
      .delete()
      .eq('id', id)

    if (deleteError) {
      logger.error('Delete LAP error:', deleteError)
      return res.status(500).json({ error: deleteError.message })
    }

    logger.info(`Deleted LAP ${id} (${existing.address})`)
    res.json({ success: true, deleted: id })
  } catch (err) {
    next(err)
  }
})

export { router as lapsRouter }
