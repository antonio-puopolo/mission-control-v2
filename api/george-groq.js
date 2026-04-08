// George OpenRouter Proxy — handles CORS issues by proxying OpenRouter calls from backend

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { messages, tools, tool_choice } = req.body

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid request: messages must be an array' })
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY
    const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'

    if (!OPENROUTER_API_KEY) {
      console.error('OpenRouter API key not configured')
      return res.status(500).json({ error: 'OpenRouter API key not configured' })
    }

    const body = {
      model: 'meta-llama/llama-3.3-70b-instruct',
      messages,
      temperature: 0.7,
      max_tokens: 1024,
    }

    if (tools && Array.isArray(tools) && tools.length > 0) {
      body.tools = tools
      // Respect caller's tool_choice; default 'auto' for first call, caller sends 'none' after tool results
      body.tool_choice = tool_choice || 'auto'
    } else if (tool_choice === 'none') {
      // No tools but caller wants no tool calling (e.g. final response round)
      body.tool_choice = 'none'
    }

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mission-control.vercel.app',
        'X-Title': 'George MC',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error(`OpenRouter API error ${response.status}:`, err)
      return res.status(response.status).json({ error: `OpenRouter error: ${err}` })
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (error) {
    console.error('OpenRouter proxy error:', error)
    return res.status(500).json({ error: error.message })
  }
}
