import { useState, useEffect } from 'react'
import { useLaps } from '@/hooks/useLaps'
import { useActivityThisWeek, useTotalPointsThisMonth } from '@/hooks/useActivity'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

const SUPABASE_URL = 'https://zjyrillpennxowntwebo.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI0MzQwODIsImV4cCI6MjA4ODAxMDA4Mn0.POMFruggeywzN3cEA6ZfQu2CAQS2mnlc0OQEA3pEbto'

interface Goals {
  gciCurrent: number
  gciTarget: number
  listingsCurrent: number
  listingsTarget: number
  lapsCurrent: number
  lapsTarget: number
}

const defaultGoals: Goals = {
  gciCurrent: 0,
  gciTarget: 60000,
  listingsCurrent: 0,
  listingsTarget: 3,
  lapsCurrent: 0,
  lapsTarget: 4,
}

const GOALS_LS_KEY = 'mc_goals'

async function fetchGoals(): Promise<Goals> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000) // 5s timeout
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/goals?id=eq.main`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    const rows = await res.json()
    if (!rows || rows.length === 0 || rows.message) {
      // Fall back to localStorage
      const saved = localStorage.getItem(GOALS_LS_KEY)
      return saved ? JSON.parse(saved) : defaultGoals
    }
    const r = rows[0]
    const g = {
      gciCurrent: r.gci_current ?? 0,
      gciTarget: r.gci_target ?? 60000,
      listingsCurrent: r.listings_current ?? 0,
      listingsTarget: r.listings_target ?? 3,
      lapsCurrent: r.laps_current ?? 0,
      lapsTarget: r.laps_target ?? 4,
    }
    localStorage.setItem(GOALS_LS_KEY, JSON.stringify(g)) // cache locally too
    return g
  } catch {
    clearTimeout(timeout)
    // Fall back to localStorage on any error/timeout
    const saved = localStorage.getItem(GOALS_LS_KEY)
    return saved ? JSON.parse(saved) : defaultGoals
  }
}

async function persistGoals(g: Goals): Promise<void> {
  await fetch(`${SUPABASE_URL}/rest/v1/goals?id=eq.main`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      gci_current: g.gciCurrent,
      gci_target: g.gciTarget,
      listings_current: g.listingsCurrent,
      listings_target: g.listingsTarget,
      laps_current: g.lapsCurrent,
      laps_target: g.lapsTarget,
      updated_at: new Date().toISOString(),
    })
  })
}

export function Dashboard() {
  const [goals, setGoals] = useState<Goals>(defaultGoals)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<Goals>(defaultGoals)
  const [syncing, setSyncing] = useState(true)

  useEffect(() => {
    fetchGoals().then(g => { setGoals(g); setDraft(g); setSyncing(false) })
  }, [])

  const saveGoals = async () => {
    setGoals(draft)
    setEditing(false)
    await persistGoals(draft)
  }

  // Real-time sync
  useRealtimeSync('laps', ['laps'])
  useRealtimeSync('activity_log', ['activity'])

  const { data: laps = [], isLoading: lapsLoading } = useLaps()
  const { data: activity = [], isLoading: activityLoading } = useActivityThisWeek()
  const { data: pointsThisMonth = 0 } = useTotalPointsThisMonth()

  const lapsByStatus = {
    lap: laps.filter(l => l.status === 'LAP').length,
    listed: laps.filter(l => l.status === 'Listed').length,
    sold: laps.filter(l => l.status === 'Sold').length,
  }

  const todayActivity = activity.filter(a => new Date(a.created_at).toDateString() === new Date().toDateString())

  const pct = (cur: number, tar: number) => tar > 0 ? Math.min(Math.round((cur / tar) * 100), 100) : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0 }}>Dashboard</h2>
          <p style={{ color: '#a0a0b0', margin: '0.25rem 0 0' }}>Business metrics • Hicks Team • Camp Hill</p>
        </div>
        {syncing && <span style={{ color: '#a0a0b0', fontSize: '0.8rem' }}>⏳ Syncing...</span>}
        <button onClick={() => { setDraft(goals); setEditing(true) }}
          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.5rem 1rem', color: '#a0a0b0', cursor: 'pointer', fontSize: '0.85rem' }}>
          ✏️ Edit Goals
        </button>
      </div>

      {/* Edit Goals Modal */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#080c14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '480px', margin: '1rem' }}>
            <h3 style={{ margin: '0 0 1.5rem' }}>Edit Goals & Metrics</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {([
                { label: 'GCI Current ($)', key: 'gciCurrent' },
                { label: 'GCI Target ($)', key: 'gciTarget' },
                { label: 'Listings Current', key: 'listingsCurrent' },
                { label: 'Listings Target', key: 'listingsTarget' },
                { label: 'LAPs Current (this qtr)', key: 'lapsCurrent' },
                { label: 'LAPs Target', key: 'lapsTarget' },
              ] as { label: string; key: keyof Goals }[]).map(({ label, key }) => (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: '#a0a0b0', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</label>
                  <input type="number" value={draft[key]}
                    onChange={e => setDraft({ ...draft, [key]: parseFloat(e.target.value) || 0 })}
                    style={{ width: '100%', background: '#080c14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.6rem 0.75rem', color: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button onClick={() => setEditing(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '0.75rem', color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={saveGoals} style={{ flex: 1, background: '#F59E0B', border: 'none', borderRadius: '8px', padding: '0.75rem', color: '#080c14', cursor: 'pointer', fontWeight: '700', fontFamily: 'inherit' }}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
        <MetricCard label="GCI This Quarter" value={`$${goals.gciCurrent.toLocaleString()}`} sub={`Target: $${goals.gciTarget.toLocaleString()}`} percent={pct(goals.gciCurrent, goals.gciTarget)} color="#F59E0B" />
        <MetricCard label="Listings" value={goals.listingsCurrent.toString()} sub={`Target: ${goals.listingsTarget}/qtr`} percent={pct(goals.listingsCurrent, goals.listingsTarget)} color="#6c63ff" />
        <MetricCard label="LAPs" value={goals.lapsCurrent.toString()} sub={`Target: ${goals.lapsTarget}/qtr · ${lapsLoading ? '...' : laps.length} in tracker`} percent={pct(goals.lapsCurrent, goals.lapsTarget)} color="#ffa502" />
        <MetricCard label="Points (Month)" value={pointsThisMonth.toString()} sub="Target: 250 pts" percent={pct(pointsThisMonth, 250)} color="#ff6b6b" />
      </div>

      {/* LAP Status Breakdown */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>LAP Pipeline</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
          <StatusBox label="In Progress" count={lapsByStatus.lap} color="#ffa502" />
          <StatusBox label="Listed" count={lapsByStatus.listed} color="#6c63ff" />
          <StatusBox label="Sold" count={lapsByStatus.sold} color="#F59E0B" />
        </div>
      </div>

      {/* Today's Activity */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>Today's Activity ({todayActivity.length})</h3>
        {activityLoading ? (
          <p style={{ color: '#a0a0b0' }}>Loading...</p>
        ) : todayActivity.length === 0 ? (
          <p style={{ color: '#a0a0b0', fontSize: '0.9rem' }}>No activity logged today yet</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {todayActivity.slice(0, 5).map(act => (
              <div key={act.id} style={{ background: 'rgba(255,255,255,0.03)', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '3px solid #F59E0B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '0.9rem' }}>{act.activity_type}</div>
                  {act.description && <div style={{ color: '#a0a0b0', fontSize: '0.8rem', marginTop: '0.2rem' }}>{act.description}</div>}
                </div>
                <span style={{ color: '#F59E0B', fontWeight: '600', fontSize: '0.85rem' }}>+{act.points_awarded} pts</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, percent, color }: { label: string; value: string; sub: string; percent: number; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderTop: `3px solid ${color}`, borderRadius: '12px', padding: '1.5rem' }}>
      <div style={{ color: '#a0a0b0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.25rem' }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: '#a0a0b0', marginBottom: '0.75rem' }}>{sub}</div>
      <div style={{ background: 'rgba(255,255,255,0.06)', height: '5px', borderRadius: '3px', overflow: 'hidden' }}>
        <div style={{ background: color, height: '100%', width: `${percent}%`, transition: 'width 0.5s ease', boxShadow: `0 0 8px ${color}66` }} />
      </div>
      <div style={{ fontSize: '0.75rem', color, marginTop: '0.4rem', fontWeight: '600' }}>{percent}%</div>
    </div>
  )
}

function StatusBox({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', padding: '1rem', textAlign: 'center' }}>
      <div style={{ fontSize: '2rem', fontWeight: '700', color }}>{count}</div>
      <div style={{ fontSize: '0.85rem', color: '#a0a0b0', marginTop: '0.25rem' }}>{label}</div>
    </div>
  )
}
