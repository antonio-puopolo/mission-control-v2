import pino from 'pino'

// Create logger with pretty printing in dev, JSON in prod
const transport = process.env.NODE_ENV === 'development'
  ? pino.transport({
      target: 'pino-pretty',
      options: {
        colorize: true,
        singleLine: false,
        ignore: 'pid',
        translateTime: 'yyyy-mm-dd HH:MM:ss',
      },
    })
  : undefined

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    timestamp: pino.stdTimeFunctions.isoTime,
  },
  transport
)
