import express from 'express'
import dotenv from 'dotenv'
import { logger } from './utils/logger.js'
import { agentRouter } from './routes/agents.js'
import { healthRouter } from './routes/health.js'
import { errorHandler } from './middleware/errorHandler.js'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`)
  next()
})

// Routes
app.use('/health', healthRouter)
app.use('/api/agents', agentRouter)

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path })
})

// Error handler (must be last)
app.use(errorHandler)

// Start server
app.listen(PORT, () => {
  logger.info(`Mission Control Backend running on http://localhost:${PORT}`)
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`)
  logger.info(`OpenClaw Gateway: ${process.env.OPENCLAW_GATEWAY_URL}`)
})
