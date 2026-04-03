import { Router } from 'express'
import { supabase } from '../services/supabase.js'
import { logger } from '../utils/logger.js'

const router = Router()

// Cost calculation (per million tokens)
const COST_PER_M = {
  'anthropic/claude-haiku-4-5': { input: 0.003, output: 0.015 },
  'anthropic/claude-sonnet-4-6': { input: 0.03, output: 0.15 },
  'anthropic/claude-sonnet-4-5': { input: 0.03, output: 0.15 },
  'openrouter/z-ai/glm-5-turbo': { input: 0.001, output: 0.001 },
  'openrouter/google/gemini-2.5-pro': { input: 0.00125, output: 0.005 },
  'openrouter/google/gemini-2.5-flash': { input: 0.00003, output: 0.00015 },
  default: { input: 0.003, output: 0.015 }
}

// USD to AUD conversion rate (update periodically)
const USD_TO_AUD = 1.5

/**
 * Calculate cost for tokens
 */
function calculateCost(tokensIn: number, tokensOut: number, model: string): number {
  const rates = COST_PER_M[model] || COST_PER_M.default
  const costUsd = (tokensIn / 1_000_000) * rates.input + (tokensOut / 1_000_000) * rates.output
  return costUsd * USD_TO_AUD
}

/**
 * GET /api/usage
 * Returns usage statistics
 */
router.get('/', async (req, res) => {
  try {
    const { period = 'month', raw = false } = req.query
    
    // Get date ranges
    const now = new Date()
    const today = new Date(now.setHours(0, 0, 0, 0))
    const weekStart = new Date(today)
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1) // Monday
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)
    
    if (raw) {
      // Return raw data for debugging
      const { data, error } = await supabase
        .from('agent_usage')
        .select('*')
        .gte('timestamp', monthStart.toISOString())
        .order('timestamp', { ascending: false })
        .limit(100)
      
      if (error) throw error
      return res.json(data)
    }
    
    // Get usage for different periods
    const [dailyData, weeklyData, monthlyData] = await Promise.all([
      supabase
        .from('agent_usage')
        .select('tokens_in, tokens_out, model, agent_name')
        .gte('timestamp', today.toISOString()),
      supabase
        .from('agent_usage')
        .select('tokens_in, tokens_out, model, agent_name')
        .gte('timestamp', weekStart.toISOString()),
      supabase
        .from('agent_usage')
        .select('tokens_in, tokens_out, model, agent_name')
        .gte('timestamp', monthStart.toISOString())
    ])
    
    // Calculate totals and costs
    const calculateStats = (data: any[]) => {
      let totalTokens = 0
      let totalCost = 0
      const byAgent: Record<string, number> = {}
      const byModel: Record<string, number> = {}
      
      for (const row of data || []) {
        const tokens = row.tokens_in + row.tokens_out
        totalTokens += tokens
        totalCost += calculateCost(row.tokens_in, row.tokens_out, row.model)
        
        // By agent
        byAgent[row.agent_name || 'Unknown'] = (byAgent[row.agent_name || 'Unknown'] || 0) + tokens
        
        // By model
        const modelName = row.model?.split('/').pop() || 'unknown'
        byModel[modelName] = (byModel[modelName] || 0) + tokens
      }
      
      return {
        totalTokens,
        totalCost,
        byAgent,
        byModel
      }
    }
    
    const daily = calculateStats(dailyData.data || [])
    const weekly = calculateStats(weeklyData.data || [])
    const monthly = calculateStats(monthlyData.data || [])
    
    // Budget calculations
    const monthlyLimitAud = 300
    const percentUsed = Math.round((monthly.totalCost / monthlyLimitAud) * 100)
    const dailyAlertThreshold = 15
    
    res.json({
      usage: {
        daily_tokens: daily.totalTokens,
        daily_aud: daily.totalCost,
        weekly_tokens: weekly.totalTokens,
        weekly_aud: weekly.totalCost,
        monthly_tokens: monthly.totalTokens,
        monthly_aud: monthly.totalCost
      },
      breakdown: {
        by_agent: monthly.byAgent,
        by_model: monthly.byModel
      },
      budget: {
        monthly_limit_aud: monthlyLimitAud,
        percent_used: percentUsed,
        daily_alert_threshold_aud: dailyAlertThreshold,
        is_over_daily_threshold: daily.totalCost > dailyAlertThreshold
      },
      period_queried: period,
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    logger.error({ error }, 'Failed to fetch usage data')
    res.status(500).json({ 
      error: 'Failed to fetch usage data',
      message: error.message 
    })
  }
})

/**
 * POST /api/usage/log
 * Log usage from a session
 */
router.post('/log', async (req, res) => {
  try {
    const { 
      session_id, 
      session_type, 
      agent_name, 
      model, 
      tokens_in, 
      tokens_out,
      work_type 
    } = req.body
    
    if (!session_id || !model || tokens_in === undefined || tokens_out === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    const { data, error } = await supabase
      .from('agent_usage')
      .insert({
        session_id,
        session_type: session_type || 'main',
        agent_name: agent_name || 'Main Chat',
        model,
        tokens_in,
        tokens_out,
        work_type: work_type || 'general',
        timestamp: new Date().toISOString()
      })
    
    if (error) throw error
    
    res.json({ 
      success: true, 
      message: 'Usage logged successfully',
      data 
    })
    
  } catch (error) {
    logger.error({ error }, 'Failed to log usage')
    res.status(500).json({ 
      error: 'Failed to log usage',
      message: error.message 
    })
  }
})

export default router