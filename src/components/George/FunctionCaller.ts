// George Function Caller — executes the 8 tool calls against Supabase

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zjyrillpennxowntwebo.supabase.co'
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_KEY) {
  console.error('[FunctionCaller] ⚠️ VITE_SUPABASE_ANON_KEY is not set! All Supabase queries will fail.')
}

const headers = {
  'apikey': SUPABASE_KEY!,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
}

async function sbFetch(path: string, options?: RequestInit): Promise<unknown> {
  const fullUrl = `${SUPABASE_URL}/rest/v1${path}`
  console.log(`[FunctionCaller] ${options?.method || 'GET'} ${fullUrl}`)

  const res = await fetch(fullUrl, {
    ...options,
    headers: { ...headers, ...(options?.headers || {}) },
  })

  console.log(`[FunctionCaller] Response status: ${res.status}`)

  if (res.status === 204) {
    console.log('[FunctionCaller] 204 No Content — success, no body')
    return null
  }

  const text = await res.text()
  console.log(`[FunctionCaller] Response body (first 500 chars): ${text.slice(0, 500)}`)

  if (!res.ok) {
    const msg = `Supabase error ${res.status}: ${text}`
    console.error(`[FunctionCaller] ❌ ${msg}`)
    throw new Error(msg)
  }

  try {
    const parsed = JSON.parse(text)
    const count = Array.isArray(parsed) ? parsed.length : 1
    console.log(`[FunctionCaller] ✅ Parsed ${count} result(s)`)
    return parsed
  } catch (parseErr) {
    console.error('[FunctionCaller] ❌ JSON parse failed:', parseErr, 'Raw text:', text)
    throw new Error(`JSON parse error: ${parseErr}`)
  }
}

// ── get_laps ────────────────────────────────────────────────────────────────
async function get_laps(args: {
  status?: string
  priority?: string
  limit?: number
  search?: string
}) {
  const params = new URLSearchParams()
  params.set('order', 'created_at.desc')
  params.set('limit', String(args.limit || 20))

  if (args.status && args.status !== 'all') {
    params.set('status', `eq.${args.status}`)
  }
  if (args.priority) {
    params.set('priority', `eq.${args.priority}`)
  }
  if (args.search) {
    // ilike on client_name or address
    params.set('or', `(client_name.ilike.*${args.search}*,address.ilike.*${args.search}*)`)
  }

  const data = await sbFetch(`/laps?${params.toString()}`)
  return data
}

// ── update_lap ───────────────────────────────────────────────────────────────
async function update_lap(args: { id: string; [key: string]: unknown }) {
  const { id, ...updates } = args
  // Sanitize empty strings to null
  const sanitized = Object.fromEntries(
    Object.entries(updates).map(([k, v]) => [k, v === '' ? null : v])
  )
  const data = await sbFetch(`/laps?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(sanitized),
  })
  return data
}

// ── get_projects ─────────────────────────────────────────────────────────────
async function get_projects(args: {
  status?: string
  owner?: string
  limit?: number
}) {
  const params = new URLSearchParams()
  params.set('order', 'created_at.desc')
  params.set('limit', String(args.limit || 20))

  if (args.status && args.status !== 'all') {
    params.set('status', `eq.${args.status}`)
  }
  if (args.owner) {
    params.set('owner', `eq.${args.owner}`)
  }

  const data = await sbFetch(`/projects?${params.toString()}`)
  return data
}

// ── update_project ────────────────────────────────────────────────────────────
async function update_project(args: { id: string; [key: string]: unknown }) {
  const { id, ...updates } = args
  const data = await sbFetch(`/projects?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })
  return data
}

// ── get_activities ────────────────────────────────────────────────────────────
async function get_activities(args: {
  days?: number
  activity_type?: string
  limit?: number
}) {
  const params = new URLSearchParams()
  params.set('order', 'created_at.desc')
  params.set('limit', String(args.limit || 20))

  const daysBack = args.days || 7
  const since = new Date()
  since.setDate(since.getDate() - daysBack)
  params.set('created_at', `gte.${since.toISOString()}`)

  if (args.activity_type) {
    params.set('activity_type', `eq.${args.activity_type}`)
  }

  const data = await sbFetch(`/activity_log?${params.toString()}`)
  return data
}

// ── log_activity ──────────────────────────────────────────────────────────────
async function log_activity(args: {
  activity_type: string
  description: string
  lap_id?: string
  points_awarded?: number
}) {
  // Default points by activity type
  const defaultPoints: Record<string, number> = {
    BAP: 1, MAP: 2, LAP: 5, call: 1, email: 1, meeting: 3, open_home: 2,
  }
  const points = args.points_awarded ?? defaultPoints[args.activity_type] ?? 1

  const payload = {
    activity_type: args.activity_type,
    description: args.description,
    lap_id: args.lap_id || null,
    points_awarded: points,
  }

  const data = await sbFetch('/activity_log', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  return data
}

// ── get_market_data ───────────────────────────────────────────────────────────
async function get_market_data(args: {
  listing_type?: string
  suburb?: string
  limit?: number
}) {
  const params = new URLSearchParams()
  params.set('limit', String(args.limit || 10))

  if (args.listing_type && args.listing_type !== 'all') {
    const type = args.listing_type === 'for_sale' ? 'sale' : args.listing_type
    params.set('listing_type', `eq.${type}`)
    params.set('order', type === 'sold' ? 'sold_date.desc' : 'scraped_at.desc')
  } else {
    params.set('order', 'scraped_at.desc')
  }

  if (args.suburb) {
    params.set('suburb', `ilike.*${args.suburb}*`)
  }

  const data = await sbFetch(`/market_listings?${params.toString()}`)
  return data
}

// ── get_goals ─────────────────────────────────────────────────────────────────
function get_goals(_args: { period?: string }) {
  // Goals are stored in the dashboard store / config — return static targets for now
  // These match useDashboardStore values
  return {
    team: {
      gci_target: 4_000_000,
      listings_target: 110,
      laps_target: 350,
    },
    antonio: {
      quarterly_gci: 60_000,
      listings_per_quarter: 3,
      laps_per_month: 4,
      weekly_kpi: {
        bap_target: 5,
        map_target: 2,
        lap_target: 1,
      },
    },
    description: 'Antonio targets: $60K/qtr GCI, 3 listings/qtr, 4 LAPs/month. Weekly: 5 BAP / 2 MAP / 1 LAP',
  }
}

// ── Router ────────────────────────────────────────────────────────────────────
export async function executeTool(name: string, argsJson: string): Promise<unknown> {
  let args: Record<string, unknown>
  try {
    args = JSON.parse(argsJson)
  } catch {
    throw new Error(`Invalid tool arguments JSON: ${argsJson}`)
  }

  console.log(`[FunctionCaller] 🔧 Executing tool: ${name}`, args)

  let result: unknown
  try {
    switch (name) {
      case 'get_laps':
        result = await get_laps(args as Parameters<typeof get_laps>[0])
        break
      case 'update_lap':
        result = await update_lap(args as Parameters<typeof update_lap>[0])
        break
      case 'get_projects':
        result = await get_projects(args as Parameters<typeof get_projects>[0])
        break
      case 'update_project':
        result = await update_project(args as Parameters<typeof update_project>[0])
        break
      case 'get_activities':
        result = await get_activities(args as Parameters<typeof get_activities>[0])
        break
      case 'log_activity':
        result = await log_activity(args as Parameters<typeof log_activity>[0])
        break
      case 'get_market_data':
        result = await get_market_data(args as Parameters<typeof get_market_data>[0])
        break
      case 'get_goals':
        result = get_goals(args as Parameters<typeof get_goals>[0])
        break
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
    console.log(`[FunctionCaller] ✅ Tool ${name} returned:`, result)
    return result
  } catch (err) {
    console.error(`[FunctionCaller] ❌ Tool ${name} threw:`, err)
    throw err
  }
}
