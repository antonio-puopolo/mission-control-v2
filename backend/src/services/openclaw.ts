import axios from 'axios'
import { logger } from '../utils/logger.js'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:8080'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN

if (!GATEWAY_URL) {
  throw new Error('OPENCLAW_GATEWAY_URL not configured')
}

const client = axios.create({
  baseURL: GATEWAY_URL,
  timeout: 5 * 60 * 1000, // 5 minute timeout for agent execution
  headers: {
    ...(GATEWAY_TOKEN ? { Authorization: `Bearer ${GATEWAY_TOKEN}` } : {}),
  },
})

export interface SpawnAgentOptions {
  task: string
  agentId: string
  model?: string
  thinking?: 'on' | 'off'
  label?: string
  timeoutSeconds?: number
}

export interface SpawnAgentResult {
  sessionKey: string
  result: string
  error?: string
}

/**
 * Call OpenClaw sessions_spawn to run an agent
 */
export async function spawnAgent(options: SpawnAgentOptions): Promise<SpawnAgentResult> {
  try {
    logger.info({ agentId: options.agentId, task: options.task }, 'Spawning agent')

    const response = await client.post('/api/sessions/spawn', {
      task: options.task,
      agentId: options.agentId,
      model: options.model || 'sonnet',
      thinking: options.thinking,
      label: options.label || `MC-Agent-${Date.now()}`,
      cleanup: 'delete',
      timeoutSeconds: options.timeoutSeconds || 300,
    })

    const result = response.data

    logger.info(
      { agentId: options.agentId, sessionKey: result.sessionKey },
      'Agent spawn successful'
    )

    return {
      sessionKey: result.sessionKey,
      result:
        typeof result.result === 'string'
          ? result.result
          : JSON.stringify(result.result, null, 2),
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error || error.message
      logger.error(
        { agentId: options.agentId, error: message, status: error.response?.status },
        'Agent spawn failed'
      )
      throw new Error(`OpenClaw error: ${message}`)
    }

    logger.error({ agentId: options.agentId, error }, 'Unexpected error spawning agent')
    throw error
  }
}

/**
 * Check OpenClaw gateway health
 */
export async function checkGatewayHealth(): Promise<boolean> {
  try {
    const response = await client.get('/api/health', { timeout: 5000 })
    return response.status === 200
  } catch {
    return false
  }
}
