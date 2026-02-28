import { Router, Request, Response } from 'express'
import { checkGatewayHealth } from '../services/openclaw.js'
import { logger } from '../utils/logger.js'

export const healthRouter = Router()

healthRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const gatewayHealthy = await checkGatewayHealth()

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      openclaw: gatewayHealthy ? 'connected' : 'disconnected',
      uptime: process.uptime(),
    })
  } catch (error) {
    logger.error(error, 'Health check error')
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
})
