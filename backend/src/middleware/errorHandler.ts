import { Request, Response, NextFunction } from 'express'
import { logger } from '../utils/logger.js'

export function errorHandler(err: any, req: Request, res: Response, _next: NextFunction) {
  const status = err.status || err.statusCode || 500
  const message = err.message || 'Internal server error'

  logger.error(
    {
      status,
      error: message,
      path: req.path,
      method: req.method,
      stack: err.stack,
    },
    'Request error'
  )

  res.status(status).json({
    error: message,
    status,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}
