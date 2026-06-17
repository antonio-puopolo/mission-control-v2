import { useState, useEffect, useMemo } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

async function fetchLAPs() {
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/laps?created_at=gte.${yearStart}&select=id,status,created_at,price_expectation`,
    { headers: { apikey: KEY, 'Content-Type': 'application/json' } }
  )
  if (!res.ok) return []
  return res.json()
}

// ─── Reverse Calculator ───────────────────────────────────────────────────────
function calcRequired(params: {
  gciTarget: number
  avgSalePrice: number
  commRate: number
  listToSell: number
  lapToList: number
  mapToLap: number
  connToMap: number
  existingPct: number
  existingCallToConn: number
  coldCallToConn: number
}) {
  const {
    gciTarget, avgSalePrice, commRate,
    listToSell, lapToList, mapToLap, connToMap,
    existingPct, existingCallToConn, coldCallToConn,
  } = params

  const avgGciPerSale = avgSalePrice * (commRate / 100)
  const salesNeeded = avgGciPerSale > 0 ? gciTarget / avgGciPerSale : 0
  const listingsNeeded = listToSell > 0 ? salesNeeded / (listToSell / 100) : 0
  const lapsNeeded = lapToList > 0 ? listingsNeeded / (lapToList / 100) : 0
  const mapsNeeded = mapToLap > 0 ? lapsNeeded / (mapToLap / 100) : 0
  const connectionsNeeded = connToMap > 0 ? mapsNeeded / (connToMap / 100) : 0
  const efrac = existingPct / 100
  const weeklyConnRate = efrac * (existingCallToConn / 100) + (1 - efrac) * (coldCallToConn / 100)
  const callsPerWeek = weeklyConnRate > 0 ? connectionsNeeded / weeklyConnRate / 52 : 0

  return {
    avgGciPerSale,
    salesNeeded: Math.ceil(salesNeeded),
    listingsNeeded: Math.ceil(listingsNeeded),
    lapsPerMonth: Math.ceil(lapsNeeded / 12),
    lapsPerYear: Math.ceil(lapsNeeded),
    mapsPerMonth: Math.ceil(mapsNeeded / 12),
    callsPerWeek: Math.ceil(callsPerWeek),
  }
}

function fmt(n: number) {
  return n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}
function fmtDollar(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`
  return `$${Math.round(n)}`
}

// ─── Slider Input ─────────────────────────────────────────────────────────────
function SliderInput({
  label, value, onChange, min, max, step, suffix = '', prefix = '',
}: {
  label: string; value: number; onChange: (v: number) => void
  min: number; max: number; step: number; suffix?: string; prefix?: string
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.72rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: '0.85rem', color: '#EAEAE0', fontWeight: 700 }}>{prefix}{value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: '#EAEAE0', cursor: 'pointer' }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
        <span style={{ fontSize: '0.65rem', color: '#374151' }}>{prefix}{min}{suffix}</span>
        <span style={{ fontSize: '0.65rem', color: '#374151' }}>{prefix}{max}{suffix}</span>
      </div>
    </div>
  )
}

// ─── Stat Tile ────────────────────────────────────────────────────────────────
function Tile({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${accent ? 'rgba(234,234,224,0.3)' : 'rgba(255,255,255,0.08)'}`,
      borderRadius: 12,
      padding: '16px 20px',
    }}>
      <div style={{ fontSize: '0.68rem', letterSpacing: '0.16em', textTransform: 'uppercase', color: '#6b7280', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: accent ? '2rem' : '1.6rem', fontWeight: 800, color: accent ? '#EAEAE0' : '#f0f0f0', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

// ─── Section Card ─────────────────────────────────────────────────────────────
function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.07)',
      borderRadius: 14,
      padding: 24,
      ...style
    }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: '0.68rem',
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: '#4b5563',
      fontWeight: 700,
      marginBottom: 16,
    }}>{children}</div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function GCIPlanner() {
  const [mode, setMode] = useState<'goal' | 'pace'>('goal')

  // Goal inputs
  const [gciTarget, setGciTarget] = useState(240000)
  const [avgSalePrice, setAvgSalePrice] = useState(1300000)
  const [commRate, setCommRate] = useState(2.0)
  const [listToSell, setListToSell] = useState(80)
  const [lapToList, setLapToList] = useState(35)
  const [mapToLap, setMapToLap] = useState(50)
  const [connToMap, setConnToMap] = useState(5)
  const [existingPct, setExistingPct] = useState(60)
  const [existingCallToConn, setExistingCallToConn] = useState(50)
  const [coldCallToConn, setColdCallToConn] = useState(25)

  // Pace check data
  const [laps, setLaps] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (mode === 'pace') {
      setLoading(true)
      fetchLAPs().then(d => { setLaps(d || []); setLoading(false) })
    }
  }, [mode])

  const required = useMemo(() => calcRequired({
    gciTarget, avgSalePrice, commRate, listToSell, lapToList, mapToLap,
    connToMap, existingPct, existingCallToConn, coldCallToConn,
  }), [gciTarget, avgSalePrice, commRate, listToSell, lapToList, mapToLap,
    connToMap, existingPct, existingCallToConn, coldCallToConn])

  // Pace analysis
  const paceAnalysis = useMemo(() => {
    if (!laps.length) return null
    const now = new Date()
    const monthsElapsed = now.getMonth() + 1 + now.getDate() / 30 // approx
    const totalLAPs = laps.filter(l => l.status === 'LAP' || l.status === 'Listed' || l.status === 'Sold' || l.status === 'Withdrawn').length
    const soldThisYear = laps.filter(l => l.status === 'Sold').length
    const avgGciPerSale = avgSalePrice * (commRate / 100)
    const projectedSales = (soldThisYear / monthsElapsed) * 12
    const projectedGCI = projectedSales * avgGciPerSale
    const lapRate = totalLAPs / monthsElapsed
    const projectedLAPs = lapRate * 12
    const gapGCI = gciTarget - projectedGCI
    const salesGap = required.salesNeeded - Math.round(projectedSales)

    // What needs to change to close the gap
    const lapsNeededToClose = required.lapsPerYear - Math.round(projectedLAPs)
    const extraLAPsPerMonth = Math.ceil(lapsNeededToClose / (12 - now.getMonth()))

    return {
      totalLAPs,
      soldThisYear,
      lapRate,
      projectedGCI,
      projectedSales: Math.round(projectedSales),
      gapGCI,
      salesGap,
      onTrack: projectedGCI >= gciTarget * 0.95,
      extraLAPsPerMonth: Math.max(0, extraLAPsPerMonth),
    }
  }, [laps, gciTarget, avgSalePrice, commRate, required])

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 16px 48px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f0f0f0', letterSpacing: '-0.02em', margin: 0 }}>
          GCI Planner
        </h1>
        <p style={{ color: '#4b5563', fontSize: '0.82rem', marginTop: 4 }}>
          Start with your goal. Work backwards to the daily activity it takes to get there.
        </p>
      </div>

      {/* Mode Toggle */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
        {[
          { id: 'goal', label: '🎯 Goal First' },
          { id: 'pace', label: '📊 Pace Check' },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => setMode(m.id as any)}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              border: '1px solid',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: mode === m.id ? '#EAEAE0' : 'transparent',
              borderColor: mode === m.id ? '#EAEAE0' : 'rgba(255,255,255,0.12)',
              color: mode === m.id ? '#0d0d0d' : '#9ca3af',
            }}
          >{m.label}</button>
        ))}
      </div>

      {/* ── GOAL FIRST MODE ── */}
      {mode === 'goal' && (
        <div>
          {/* GCI Target Input */}
          <Card style={{ marginBottom: 20, borderColor: 'rgba(234,234,224,0.15)' }}>
            <SectionLabel>Your annual GCI target</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              {[120000, 180000, 240000, 300000, 500000].map(v => (
                <button
                  key={v}
                  onClick={() => setGciTarget(v)}
                  style={{
                    padding: '10px 18px',
                    borderRadius: 8,
                    border: '1px solid',
                    background: gciTarget === v ? '#EAEAE0' : 'rgba(255,255,255,0.04)',
                    borderColor: gciTarget === v ? '#EAEAE0' : 'rgba(255,255,255,0.1)',
                    color: gciTarget === v ? '#0d0d0d' : '#9ca3af',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >{fmtDollar(v)}</button>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 160 }}>
                <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>Custom:</span>
                <input
                  type="number"
                  value={gciTarget}
                  onChange={e => setGciTarget(Number(e.target.value))}
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: 6,
                    padding: '6px 10px',
                    color: '#f0f0f0',
                    fontSize: '0.9rem',
                    width: 120,
                  }}
                />
              </div>
            </div>
          </Card>

          {/* Output Tiles */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: 12,
            marginBottom: 24,
          }}>
            <Tile label="Calls / Week" value={fmt(required.callsPerWeek)} sub="to hit your target" accent />
            <Tile label="MAPs / Month" value={fmt(required.mapsPerMonth)} sub="market appraisals" />
            <Tile label="LAPs / Month" value={fmt(required.lapsPerMonth)} sub="listing appointments" />
            <Tile label="Listings / Year" value={fmt(required.listingsNeeded)} sub="needed" />
            <Tile label="Sales / Year" value={fmt(required.salesNeeded)} sub="settled" />
            <Tile label="Avg GCI / Sale" value={fmtDollar(required.avgGciPerSale)} sub="at your rates" />
          </div>

          {/* Rate Inputs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
            {/* Sales Rates */}
            <Card>
              <SectionLabel>Property & Commission</SectionLabel>
              <SliderInput label="Avg Sale Price" value={avgSalePrice / 1000} onChange={v => setAvgSalePrice(v * 1000)}
                min={500} max={5000} step={50} prefix="$" suffix="K" />
              <SliderInput label="Commission Rate" value={commRate} onChange={setCommRate}
                min={1} max={3.5} step={0.05} suffix="%" />
              <SliderInput label="List → Sale rate" value={listToSell} onChange={setListToSell}
                min={40} max={100} step={5} suffix="%" />
            </Card>

            {/* Funnel Rates */}
            <Card>
              <SectionLabel>Conversion Funnel</SectionLabel>
              <SliderInput label="LAP → Listing" value={lapToList} onChange={setLapToList}
                min={10} max={80} step={5} suffix="%" />
              <SliderInput label="MAP → LAP" value={mapToLap} onChange={setMapToLap}
                min={10} max={80} step={5} suffix="%" />
              <SliderInput label="Connection → MAP" value={connToMap} onChange={setConnToMap}
                min={1} max={20} step={1} suffix="%" />
            </Card>

            {/* Call Rates */}
            <Card>
              <SectionLabel>Call Rates</SectionLabel>
              <SliderInput label="Existing pipeline calls %" value={existingPct} onChange={setExistingPct}
                min={20} max={90} step={5} suffix="%" />
              <SliderInput label="Existing → Connection" value={existingCallToConn} onChange={setExistingCallToConn}
                min={10} max={80} step={5} suffix="%" />
              <SliderInput label="Cold → Connection" value={coldCallToConn} onChange={setColdCallToConn}
                min={5} max={50} step={5} suffix="%" />
            </Card>
          </div>

          {/* Funnel Chain Visual */}
          <Card style={{ marginTop: 16 }}>
            <SectionLabel>Activity chain to {fmtDollar(gciTarget)}</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0 }}>
              {[
                { label: 'Calls/wk', value: fmt(required.callsPerWeek), color: '#6b7280' },
                { label: 'MAPs/mo', value: fmt(required.mapsPerMonth), color: '#9ca3af' },
                { label: 'LAPs/mo', value: fmt(required.lapsPerMonth), color: '#d1d5db' },
                { label: 'Listings/yr', value: fmt(required.listingsNeeded), color: '#e5e7eb' },
                { label: 'Sales/yr', value: fmt(required.salesNeeded), color: '#EAEAE0' },
                { label: 'GCI', value: fmtDollar(gciTarget), color: '#EAEAE0', accent: true },
              ].map((item, i, arr) => (
                <div key={item.label} style={{ display: 'flex', alignItems: 'center' }}>
                  <div style={{
                    textAlign: 'center',
                    padding: '10px 14px',
                    background: item.accent ? 'rgba(234,234,224,0.1)' : 'rgba(255,255,255,0.03)',
                    borderRadius: 8,
                    border: `1px solid ${item.accent ? 'rgba(234,234,224,0.3)' : 'rgba(255,255,255,0.07)'}`,
                    minWidth: 80,
                  }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                    <div style={{ fontSize: '0.63rem', color: '#4b5563', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>{item.label}</div>
                  </div>
                  {i < arr.length - 1 && (
                    <div style={{ color: '#374151', padding: '0 6px', fontSize: '1rem' }}>→</div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── PACE CHECK MODE ── */}
      {mode === 'pace' && (
        <div>
          {loading && (
            <div style={{ color: '#4b5563', padding: 40, textAlign: 'center', fontSize: '0.85rem' }}>
              Loading your pipeline data...
            </div>
          )}

          {!loading && !laps.length && (
            <Card>
              <div style={{ color: '#4b5563', textAlign: 'center', padding: 40 }}>
                No LAP data found for this year. Add some in the LAP Tracker first.
              </div>
            </Card>
          )}

          {!loading && laps.length > 0 && paceAnalysis && (
            <div>
              {/* Status banner */}
              <div style={{
                padding: '16px 24px',
                borderRadius: 12,
                marginBottom: 24,
                background: paceAnalysis.onTrack ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
                border: `1px solid ${paceAnalysis.onTrack ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
              }}>
                {paceAnalysis.onTrack ? (
                  <div>
                    <span style={{ color: '#22c55e', fontWeight: 700, fontSize: '1rem' }}>✅ On track</span>
                    <span style={{ color: '#6b7280', fontSize: '0.85rem', marginLeft: 12 }}>
                      Projected {fmtDollar(paceAnalysis.projectedGCI)} GCI this year — {fmtDollar(paceAnalysis.projectedGCI - gciTarget)} ahead of target
                    </span>
                  </div>
                ) : (
                  <div>
                    <span style={{ color: '#f87171', fontWeight: 700, fontSize: '1rem' }}>⚠️ Behind pace</span>
                    <span style={{ color: '#6b7280', fontSize: '0.85rem', marginLeft: 12 }}>
                      Projected {fmtDollar(paceAnalysis.projectedGCI)} vs {fmtDollar(gciTarget)} target — {fmtDollar(Math.abs(paceAnalysis.gapGCI))} gap
                    </span>
                  </div>
                )}
              </div>

              {/* Pace tiles */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
                <Tile label="LAPs This Year" value={fmt(paceAnalysis.totalLAPs)} sub={`${paceAnalysis.lapRate.toFixed(1)}/month pace`} />
                <Tile label="Sales Settled" value={fmt(paceAnalysis.soldThisYear)} sub="confirmed this year" />
                <Tile label="Projected Sales" value={fmt(paceAnalysis.projectedSales)} sub="at current pace" />
                <Tile label="Projected GCI" value={fmtDollar(paceAnalysis.projectedGCI)} sub="full year estimate" accent />
                <Tile label="Your Target" value={fmtDollar(gciTarget)} sub="annual goal" />
                <Tile
                  label={paceAnalysis.onTrack ? "Buffer" : "Gap to Close"}
                  value={fmtDollar(Math.abs(paceAnalysis.gapGCI))}
                  sub={paceAnalysis.onTrack ? 'ahead of target' : 'below target'}
                />
              </div>

              {/* Gap analysis */}
              {!paceAnalysis.onTrack && (
                <Card style={{ borderColor: 'rgba(239,68,68,0.15)' }}>
                  <SectionLabel>To close the gap</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 8 }}>Add more LAPs</div>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#EAEAE0' }}>+{paceAnalysis.extraLAPsPerMonth}<span style={{ fontSize: '0.9rem', fontWeight: 400, color: '#6b7280' }}>/month</span></div>
                      <div style={{ fontSize: '0.75rem', color: '#4b5563', marginTop: 6 }}>
                        Extra LAPs needed each month for the rest of the year
                      </div>
                    </div>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 8 }}>Or improve your conversion</div>
                      <div style={{ fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.6 }}>
                        If you improve your <strong style={{ color: '#EAEAE0' }}>LAP → Listing</strong> rate from <strong style={{ color: '#EAEAE0' }}>{lapToList}%</strong> to <strong style={{ color: '#EAEAE0' }}>{Math.min(95, Math.round(lapToList * (gciTarget / Math.max(1, paceAnalysis.projectedGCI))))}%</strong>, you'd hit your target at the same call volume.
                      </div>
                    </div>
                    <div style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontSize: '0.7rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 8 }}>Or target higher prices</div>
                      <div style={{ fontSize: '0.85rem', color: '#9ca3af', lineHeight: 1.6 }}>
                        Increase your avg sale price from <strong style={{ color: '#EAEAE0' }}>{fmtDollar(avgSalePrice)}</strong> to <strong style={{ color: '#EAEAE0' }}>{fmtDollar(avgSalePrice * (gciTarget / Math.max(1, paceAnalysis.projectedGCI)))}</strong> and your current LAP rate is enough.
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {/* Adjust target */}
              <Card style={{ marginTop: 16 }}>
                <SectionLabel>Adjust target to compare</SectionLabel>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  {[120000, 180000, 240000, 300000, 500000].map(v => (
                    <button
                      key={v}
                      onClick={() => setGciTarget(v)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: 8,
                        border: '1px solid',
                        background: gciTarget === v ? '#EAEAE0' : 'rgba(255,255,255,0.04)',
                        borderColor: gciTarget === v ? '#EAEAE0' : 'rgba(255,255,255,0.1)',
                        color: gciTarget === v ? '#0d0d0d' : '#9ca3af',
                        fontWeight: 700,
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                      }}
                    >{fmtDollar(v)}</button>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
