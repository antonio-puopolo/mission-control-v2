// OpenRouter API Client for George MC (replaces Groq)

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_call_id?: string
  name?: string
  tool_calls?: ToolCall[]
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface GroqResponse {
  id: string
  choices: Array<{
    message: {
      role: string
      content: string | null
      tool_calls?: ToolCall[]
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export class GroqRateLimitError extends Error {
  retryAfter?: number
  constructor(message: string, retryAfter?: number) {
    super(message)
    this.name = 'GroqRateLimitError'
    this.retryAfter = retryAfter
  }
}

export class GroqAPIError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'GroqAPIError'
    this.status = status
  }
}

// Sleep helper
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function callGroq(
  messages: ChatMessage[],
  tools?: object[],
  signal?: AbortSignal,
  onRetry?: (attempt: number, waitMs: number) => void
): Promise<GroqResponse> {
  const body: Record<string, unknown> = {
    messages,
    tools,
  }

  const MAX_RETRIES = 3
  const BASE_DELAY_MS = 1000 // 1s, 2s, 4s

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Check if aborted before attempting
    if (signal?.aborted) {
      const err = new Error('AbortError')
      err.name = 'AbortError'
      throw err
    }

    // Call our backend proxy (avoids CORS issues)
    const response = await fetch('/api/george-groq', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    })

    if (response.ok) {
      return response.json()
    }

    // Handle 429 Rate Limit
    if (response.status === 429) {
      const retryAfterHeader = response.headers.get('Retry-After')
      const retryAfterMs = retryAfterHeader
        ? parseInt(retryAfterHeader, 10) * 1000
        : BASE_DELAY_MS * Math.pow(2, attempt)

      if (attempt < MAX_RETRIES) {
        // Notify caller so they can show "Retrying in Xs..." feedback
        onRetry?.(attempt + 1, retryAfterMs)
        await sleep(retryAfterMs)
        continue
      }

      // Exhausted retries
      throw new GroqRateLimitError(
        `Rate limited after ${MAX_RETRIES} retries`,
        retryAfterMs
      )
    }

    // Other errors — don't retry
    const errText = await response.text()
    throw new GroqAPIError(
      `OpenRouter proxy error ${response.status}: ${errText}`,
      response.status
    )
  }

  // Should never reach here
  throw new GroqAPIError('Unexpected error in callGroq', 500)
}
