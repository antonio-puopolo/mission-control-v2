import { useState, useEffect } from 'react'
import { useLaps, usePipelineValue } from '@/hooks/useLaps'
import { useActivityThisWeek, useTotalPointsThisMonth, useWeeklyKPIs, useLogActivity } from '@/hooks/useActivity'
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

  const [showKpiLog, setShowKpiLog] = useState(false)
  const [kpiType, setKpiType] = useState<"BAP"|"MAP"|"LAP">("BAP")
  const [kpiNote, setKpiNote] = useState("")
  const { mutateAsync: logActivity, isPending: isLogging } = useLogActivity()

  const { data: laps = [], isLoading: lapsLoading } = useLaps()
  const { data: pipelineValue } = usePipelineValue()
  const { data: activity = [], isLoading: activityLoading } = useActivityThisWeek()
  const { data: pointsThisMonth = 0 } = useTotalPointsThisMonth()
  const { data: weeklyKpis = { bap: 0, map: 0, lap: 0 }, isLoading: kpisLoading } = useWeeklyKPIs()

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Dashboard</h3>
          <p style={{ color: '#475569', margin: '0.15rem 0 0', fontSize: '0.72rem', whiteSpace: 'nowrap' }}>Hicks Team • Camp Hill{syncing ? ' • syncing…' : ''}</p>
        </div>
        <button onClick={() => { setDraft(goals); setEditing(true) }}
          style={{ background: 'transparent', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '0.78rem', padding: '0.25rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          ✏️ <span>Edit goals</span>
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

      {/* Weekly KPIs */}
      <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px", padding: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "1rem" }}>Weekly KPIs</h3>
            <p style={{ margin: "0.2rem 0 0", color: "#94a3b8", fontSize: "0.78rem" }}>Mon–Sun • Resets each week</p>
          </div>
          <button
            onClick={() => setShowKpiLog(true)}
            style={{ padding: "0.5rem 1rem", background: "#F59E0B", color: "#000", border: "none", borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontSize: "0.82rem" }}
          >
            + Log
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "1rem" }}>
          {kpisLoading ? <p style={{ color: "#94a3b8" }}>Loading...</p> : (
            <>
              <KpiBar label="BAP" sublabel="Buyer Appts" current={weeklyKpis.bap} target={5} color="#F59E0B" />
              <KpiBar label="MAP" sublabel="Mkt Appraisals" current={weeklyKpis.map} target={2} color="#6c63ff" />
              <KpiBar label="LAP" sublabel="Listing Appts" current={weeklyKpis.lap} target={1} color="#ff6b6b" />
            </>
          )}
        </div>
      </div>

      {/* LAP Status Breakdown */}
      <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px', padding: '1.5rem' }}>
        <h3 style={{ margin: '0 0 1rem' }}>LAP Pipeline</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '1rem' }}>
          <StatusBox label="In Progress" count={lapsByStatus.lap} color="#ffa502" />
          <StatusBox label="Listed" count={lapsByStatus.listed} color="#6c63ff" />
          <StatusBox label="Sold" count={lapsByStatus.sold} color="#F59E0B" />
        </div>
        {pipelineValue && pipelineValue.total > 0 && (
          <div style={{ marginTop: "1.25rem", paddingTop: "1.25rem", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.75rem" }}>
              <span style={{ color: "#94a3b8", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pipeline Value</span>
              <span style={{ fontSize: "1.4rem", fontWeight: 700, color: "#F59E0B" }}>
                ${(pipelineValue.total / 1_000_000).toFixed(1)}M
              </span>
            </div>
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              {[
                { key: "under_construction", label: "🏗️ Build", color: "#a78bfa" },
                { key: "pipeline_a", label: "🔥 A", color: "#F59E0B" },
                { key: "pipeline_b", label: "📋 B", color: "#60a5fa" },
                { key: "pipeline_c", label: "🕐 C", color: "#94a3b8" },
              ].filter(s => pipelineValue.bySection[s.key] > 0).map(s => (
                <div key={s.key} style={{ fontSize: "0.78rem", color: s.color }}>
                  {s.label} <strong>${(pipelineValue.bySection[s.key] / 1_000_000).toFixed(1)}M</strong>
                </div>
              ))}
              <div style={{ fontSize: "0.78rem", color: "#475569", marginLeft: "auto" }}>
                {pipelineValue.count} of {laps.length} LAPs priced
              </div>
            </div>
          </div>
        )}
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
      {showKpiLog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
          <div style={{ background: "#080c14", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "16px", padding: "2rem", width: "100%", maxWidth: "380px", margin: "1rem" }}>
            <h3 style={{ margin: "0 0 1.5rem" }}>Log KPI Activity</h3>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
              {(["BAP","MAP","LAP"] as const).map(t => (
                <button key={t} onClick={() => setKpiType(t)}
                  style={{ flex: 1, padding: "0.75rem", background: kpiType === t ? "#F59E0B" : "rgba(255,255,255,0.05)", color: kpiType === t ? "#000" : "#94a3b8", border: "1px solid " + (kpiType === t ? "#F59E0B" : "rgba(255,255,255,0.1)"), borderRadius: "8px", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: "0.9rem" }}>
                  {t}
                </button>
              ))}
            </div>
            <div style={{ marginBottom: "1.25rem" }}>
              <label style={{ fontSize: "0.75rem", color: "#94a3b8", display: "block", marginBottom: "0.3rem" }}>NOTE (OPTIONAL)</label>
              <input
                value={kpiNote}
                onChange={e => setKpiNote(e.target.value)}
                placeholder={kpiType === "BAP" ? "e.g. Smith family, 4 Glen Rd" : kpiType === "MAP" ? "e.g. 12 Park Ave appraisal" : "e.g. LAP at 7 Hill St"}
                style={{ width: "100%", background: "#0d1320", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "0.6rem 0.75rem", color: "#fff", fontFamily: "inherit", boxSizing: "border-box" as const }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button onClick={() => { setShowKpiLog(false); setKpiNote("") }} style={{ flex: 1, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px", padding: "0.75rem", color: "#fff", cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
              <button
                disabled={isLogging}
                onClick={async () => {
                  await logActivity({ activity_type: kpiType, description: kpiNote || `${kpiType} logged`, points_awarded: kpiType === "LAP" ? 10 : kpiType === "MAP" ? 5 : 3 })
                  setShowKpiLog(false)
                  setKpiNote("")
                }}
                style={{ flex: 2, background: "#F59E0B", border: "none", borderRadius: "8px", padding: "0.75rem", color: "#000", cursor: "pointer", fontWeight: 700, fontFamily: "inherit", opacity: isLogging ? 0.5 : 1 }}
              >
                {isLogging ? "Logging..." : `Log ${kpiType}`}
              </button>
            </div>
          </div>
        </div>
      )}
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

function KpiBar({ label, sublabel, current, target, color }: { label: string; sublabel: string; current: number; target: number; color: string }) {
  const pct = Math.min(100, Math.round((current / target) * 100))
  const done = current >= target
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: "1rem", color: done ? color : "#f1f5f9" }}>{label}</span>
          <span style={{ color: "#94a3b8", fontSize: "0.72rem", marginLeft: "0.4rem" }}>{sublabel}</span>
        </div>
        <span style={{ fontWeight: 700, fontSize: "1rem", color: done ? color : "#f1f5f9" }}>{current}<span style={{ color: "#94a3b8", fontWeight: 400, fontSize: "0.8rem" }}>/{target}</span></span>
      </div>
      <div style={{ height: "8px", background: "rgba(255,255,255,0.07)", borderRadius: "999px", overflow: "hidden" }}>
        <div style={{ height: "100%", borderRadius: "999px", background: done ? color : `${color}bb`, width: `${pct}%`, transition: "width 0.5s ease", boxShadow: done ? `0 0 10px ${color}66` : "none" }} />
      </div>
      {done && <span style={{ fontSize: "0.72rem", color, fontWeight: 600 }}>✓ Target hit!</span>}
    </div>
  )
}
