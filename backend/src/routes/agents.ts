import { Router, Request, Response, NextFunction } from 'express'
import { ZodError } from 'zod'
import { SpawnRequestSchema } from '../types/index.js'
import { spawnAgent } from '../services/openclaw.js'
import { updateAgentResult, getAgentResult } from '../services/supabase.js'
import { logger } from '../utils/logger.js'

export const agentRouter = Router()

/**
 * POST /api/agents/spawn
 *
 * Spawn an agent with a task
 * Body: {
 *   resultId: string (UUID),
 *   agentId: string (social|coder|analyst|copywriter|strategist),
 *   task: string,
 *   model?: string (default: sonnet),
 *   thinking?: 'on' | 'off'
 * }
 *
 * Response: {
 *   success: boolean,
 *   resultId: string,
 *   status: string,
 *   output?: string,
 *   error?: string
 * }
 */
agentRouter.post('/spawn', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    const request = SpawnRequestSchema.parse(req.body)

    logger.info(
      { agentId: request.agentId, resultId: request.resultId, task: request.task },
      'Received spawn request'
    )

    // Update Supabase: mark as running
    await updateAgentResult(request.resultId, { status: 'running' })

    // Call OpenClaw to spawn the agent
    const result = await spawnAgent({
      task: request.task,
      agentId: request.agentId,
      model: request.model,
      thinking: request.thinking as 'on' | 'off' | undefined,
      label: `MC-${request.resultId}`,
      timeoutSeconds: 300,
    })

    // Update Supabase: mark as completed with output
    await updateAgentResult(request.resultId, {
      status: 'completed',
      output: result.result,
      completed_at: new Date().toISOString(),
    })

    logger.info({ resultId: request.resultId }, 'Agent spawn completed successfully')

    res.json({
      success: true,
      resultId: request.resultId,
      status: 'completed',
      output: result.result,
    })
  } catch (error) {
    const resultId = req.body?.resultId

    if (error instanceof ZodError) {
      logger.warn({ issues: error.issues }, 'Validation error')
      return res.status(400).json({
        error: 'Validation failed',
        issues: error.issues,
      })
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error'

    // Update Supabase with error
    if (resultId) {
      try {
        await updateAgentResult(resultId, {
          status: 'failed',
          error: errorMessage,
          completed_at: new Date().toISOString(),
        })
      } catch (updateError) {
        logger.error(updateError, 'Failed to update agent result with error')
      }
    }

    logger.error({ error: errorMessage, resultId }, 'Agent spawn failed')

    res.status(500).json({
      success: false,
      error: errorMessage,
      resultId,
    })
  }
})

/**
 * GET /api/agents/results/:resultId
 *
 * Get the status and output of a spawned agent
 */
agentRouter.get('/results/:resultId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { resultId } = req.params

    const result = await getAgentResult(resultId)

    res.json({
      success: true,
      result,
    })
  } catch (error) {
    logger.error({ error, resultId: req.params.resultId }, 'Failed to get agent result')

    res.status(404).json({
      error: 'Result not found',
      resultId: req.params.resultId,
    })
  }
})

/**
 * GET /api/agents/status
 *
 * Check if the agent spawning service is ready
 */
agentRouter.get('/status', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'agent-spawning',
    timestamp: new Date().toISOString(),
  })
})
