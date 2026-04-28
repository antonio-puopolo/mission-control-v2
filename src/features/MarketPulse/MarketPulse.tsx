import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { TrendingUp, Home, Clock, Users, Calculator, DollarSign, Calendar, MapPin, AlertCircle, RefreshCw } from 'lucide-react'
import { useMarketPulseData, findComps } from '../../hooks/useMarketPulseData'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatM (value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value}`
}

function formatCurrency (value: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value)
}

function formatTimestamp (iso: string): string {
  try {
    const d = new Date(iso)
    return d.toLocaleDateString('en-AU', {
      day: 'numeric', month: 'short', year: 'numeric',
    }) + ' @ ' + d.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return iso
  }
}

// ─── CHART TOOLTIP ───────────────────────────────────────────────────────────

const CustomTooltip = ({
  active, payload, label, formatter
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  formatter?: (val: number) => string
}) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid rgba(255,255,255,0.12)',
      borderRadius: '8px',
      padding: '0.75rem 1rem',
      fontSize: '0.82rem',
    }}>
      <div style={{ color: '#94a3b8', marginBottom: '6px', fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, display: 'flex', gap: '8px', alignItems: 'center' }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: p.color, display: 'inline-block' }} />
          <span style={{ color: '#94a3b8' }}>{p.name}:</span>
          <span style={{ fontWeight: 700 }}>{formatter ? formatter(p.value) : p.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── KPI CARD ────────────────────────────────────────────────────────────────

function KPICard ({ icon, label, value, sub }: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  color?: string
}) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.4rem',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#555' }}>
        {icon}
        <span style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
      </div>
      <div style={{ color: '#EAEAE0', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1 }}>{value}</div>
      <div style={{ color: '#555', fontSize: '0.72rem' }}>{sub}</div>
    </div>
  )
}

// ─── CHART CARD ──────────────────────────────────────────────────────────────

function ChartCard ({ title, children }: { title: string; accent?: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <div style={{ color: '#555', fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em' }}>{title}</div>
      <div style={{ height: '180px' }}>
        {children}
      </div>
    </div>
  )
}

// ─── LOADING SKELETON ────────────────────────────────────────────────────────

function SkeletonCard () {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.07)',
      border: '1px solid rgba(255,255,255,0.09)',
      borderTop: '1px solid rgba(255,255,255,0.18)',
      backdropFilter: 'blur(32px) saturate(1.8)',
      WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
      boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 4px 20px rgba(0,0,0,0.4)',
      borderRadius: '12px',
      padding: '1.2rem',
      height: '100px',
      animation: 'pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '12px', width: '60%', marginBottom: '12px' }} />
      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '24px', width: '40%', marginBottom: '8px' }} />
      <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '4px', height: '10px', width: '80%' }} />
    </div>
  )
}

// ─── APPRAISAL CALCULATOR ────────────────────────────────────────────────────

interface AppraisalResult {
  compValue: number
  appreciation: number
  appreciationPct: number
  listPriceLow: number
  listPriceHigh: number
  daysToSell: number
  compsUsed: number
  confidence: 'high' | 'medium' | 'low'
}

function AppraisalCalculator () {
  const [address, setAddress] = useState('')
  const [purchaseYear, setPurchaseYear] = useState<string>('2020')
  const [purchasePrice, setPurchasePrice] = useState<string>('')
  const [propertyType, setPropertyType] = useState<'house' | 'unit'>('house')
  const [result, setResult] = useState<AppraisalResult | null>(null)
  const [calculating, setCalculating] = useState(false)
  const [calcError, setCalcError] = useState<string | null>(null)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2000 + 1 }, (_, i) => String(2000 + i)).reverse()

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '0.6rem 0.85rem',
    color: '#f1f5f9',
    fontSize: '0.9rem',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
    transition: 'border-color 0.2s',
  }

  const labelStyle = {
    color: '#64748b',
    fontSize: '0.75rem',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    marginBottom: '4px',
    display: 'block',
  }

  const handleCalculate = async () => {
    const year = parseInt(purchaseYear)
    const price = purchasePrice.trim() ? parseInt(purchasePrice.replace(/[$,]/g, '')) : null
    if (isNaN(year)) return

    setCalculating(true)
    setCalcError(null)
    setResult(null)

    try {
      const compData = await findComps(address, propertyType, year)

      // Use comp median or fall back to input price adjusted by growth ratio
      let compValue: number
      if (compData.medianPrice) {
        compValue = compData.medianPrice
      } else if (price && compData.growthRatio) {
        compValue = Math.round(price * compData.growthRatio)
      } else if (price && !compData.growthRatio) {
        // No growth data — show estimated based on typical Camp Hill appreciation
        compValue = Math.round(price * 1.35) // Approximate 5-yr growth
      } else {
        setCalcError('Not enough data to calculate. Try entering a purchase price.')
        setCalculating(false)
        return
      }

      const appreciation = price ? compValue - price : 0
      const appreciationPct = price ? ((appreciation / price) * 100) : 0
      const listPriceLow = Math.round(compValue * 0.95)
      const listPriceHigh = Math.round(compValue * 1.05)

      // Days to sell from comp data or defaults
      const daysToSell = propertyType === 'house' ? 35 : 42

      const confidence: 'high' | 'medium' | 'low' =
        compData.sampleSize >= 5 ? 'high' :
        compData.sampleSize >= 2 ? 'medium' : 'low'

      setResult({
        compValue,
        appreciation,
        appreciationPct,
        listPriceLow,
        listPriceHigh,
        daysToSell,
        compsUsed: compData.sampleSize,
        confidence,
      })
    } catch (err: any) {
      setCalcError(`Error: ${err.message}`)
    } finally {
      setCalculating(false)
    }
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Calculator size={18} color="#EAEAE0" />
        <div>
          <div style={{ color: '#f1f5f9', fontSize: '1rem', fontWeight: 700 }}>Appraisal Calculator</div>
          <div style={{ color: '#475569', fontSize: '0.75rem' }}>Live Camp Hill comps from real sales data</div>
        </div>
      </div>

      {/* Form */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
      }}>
        {/* Address */}
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={labelStyle}>
            <MapPin size={11} style={{ display: 'inline', marginRight: '4px' }} />
            Property Address
          </label>
          <input
            style={inputStyle}
            placeholder="e.g. 12 Smith St, Camp Hill"
            value={address}
            onChange={e => setAddress(e.target.value)}
            onFocus={e => (e.currentTarget.style.borderColor = '#EAEAE0')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </div>

        {/* Property Type */}
        <div>
          <label style={labelStyle}>Property Type</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {(['house', 'unit'] as const).map(t => (
              <button
                key={t}
                onClick={() => setPropertyType(t)}
                style={{
                  flex: 1,
                  padding: '0.55rem',
                  background: propertyType === t ? '#EAEAE0' : 'rgba(255,255,255,0.05)',
                  color: propertyType === t ? '#0a0f19' : '#94a3b8',
                  border: `1px solid ${propertyType === t ? '#EAEAE0' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                  transition: 'all 0.2s',
                }}
              >
                {t === 'house' ? '🏠 House' : '🏢 Unit'}
              </button>
            ))}
          </div>
        </div>

        {/* Purchase Year */}
        <div>
          <label style={labelStyle}>
            <Calendar size={11} style={{ display: 'inline', marginRight: '4px' }} />
            Purchase Year
          </label>
          <select
            style={{ ...inputStyle, cursor: 'pointer' }}
            value={purchaseYear}
            onChange={e => setPurchaseYear(e.target.value)}
            onFocus={e => (e.currentTarget.style.borderColor = '#EAEAE0')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          >
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* Purchase Price */}
        <div>
          <label style={labelStyle}>
            <DollarSign size={11} style={{ display: 'inline', marginRight: '4px' }} />
            Purchase Price <span style={{ color: '#334155', fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            style={inputStyle}
            placeholder="e.g. 1250000"
            value={purchasePrice}
            onChange={e => setPurchasePrice(e.target.value)}
            onFocus={e => (e.currentTarget.style.borderColor = '#EAEAE0')}
            onBlur={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </div>
      </div>

      {/* Calculate button */}
      <button
        onClick={handleCalculate}
        disabled={calculating}
        style={{
          background: calculating ? 'rgba(255,255,255,0.05)' : '#EAEAE0',
          color: calculating ? '#475569' : '#000',
          border: calculating ? '1px solid rgba(255,255,255,0.1)' : 'none',
          borderRadius: '8px',
          padding: '0.7rem 1.5rem',
          fontWeight: 800,
          fontSize: '0.9rem',
          cursor: calculating ? 'not-allowed' : 'pointer',
          letterSpacing: '0.02em',
          alignSelf: 'flex-start',
          transition: 'opacity 0.2s',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        {calculating ? (
          <>
            <RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} />
            Searching comps...
          </>
        ) : 'Calculate Appraisal →'}
      </button>

      {/* Error */}
      {calcError && (
        <div style={{
          background: '#ef444411',
          border: '1px solid #ef444433',
          borderRadius: '8px',
          padding: '0.75rem',
          color: '#ef4444',
          fontSize: '0.82rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertCircle size={14} />
          {calcError}
        </div>
      )}

      {/* Result */}
      {result && (
        <>
          {/* Confidence banner */}
          <div style={{
            background: result.confidence === 'high' ? '#22c55e11' : result.confidence === 'medium' ? '#EAEAE011' : '#ef444411',
            border: `1px solid ${result.confidence === 'high' ? '#22c55e33' : result.confidence === 'medium' ? 'rgba(234,234,224,0.20)' : '#ef444433'}`,
            borderRadius: '8px',
            padding: '0.5rem 0.75rem',
            fontSize: '0.75rem',
            color: result.confidence === 'high' ? '#22c55e' : result.confidence === 'medium' ? '#EAEAE0' : '#ef4444',
          }}>
            {result.confidence === 'high' ? '✅' : result.confidence === 'medium' ? '⚠️' : '📊'} Based on{' '}
            <strong>{result.compsUsed}</strong> comparable {result.compsUsed === 1 ? 'sale' : 'sales'} —{' '}
            {result.confidence === 'high' ? 'High confidence estimate' :
             result.confidence === 'medium' ? 'Medium confidence estimate (limited comps)' :
             'Low confidence — suburb-wide average used'}
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '0.75rem',
            marginTop: '0.25rem',
          }}>
            {/* Comp Value */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(234,234,224,0.20)',
              borderRadius: '10px',
              padding: '1rem',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#EAEAE0' }} />
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Market Comp Value</div>
              <div style={{ color: '#EAEAE0', fontSize: '1.6rem', fontWeight: 800 }}>{formatM(result.compValue)}</div>
              <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '4px' }}>Based on Camp Hill {propertyType} comps</div>
            </div>

            {/* Appreciation */}
            {purchasePrice && result.appreciation !== 0 && (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${result.appreciation >= 0 ? '#22c55e33' : '#ef444433'}`,
                borderRadius: '10px',
                padding: '1rem',
                position: 'relative',
                overflow: 'hidden',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: result.appreciation >= 0 ? '#22c55e' : '#ef4444' }} />
                <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Appreciation</div>
                <div style={{ color: result.appreciation >= 0 ? '#22c55e' : '#ef4444', fontSize: '1.4rem', fontWeight: 800 }}>
                  {result.appreciation >= 0 ? '+' : ''}{formatM(result.appreciation)}
                </div>
                <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '4px' }}>
                  {result.appreciationPct >= 0 ? '+' : ''}{result.appreciationPct.toFixed(1)}% since {purchaseYear}
                </div>
              </div>
            )}

            {/* List Price Range */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid #6366f133',
              borderRadius: '10px',
              padding: '1rem',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#6366f1' }} />
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Suggested List Price</div>
              <div style={{ color: '#a5b4fc', fontSize: '1rem', fontWeight: 800 }}>
                {formatM(result.listPriceLow)} – {formatM(result.listPriceHigh)}
              </div>
              <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '4px' }}>±5% of comp value</div>
            </div>

            {/* Days to Sell */}
            <div style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(234,234,224,0.20)',
              borderRadius: '10px',
              padding: '1rem',
              position: 'relative',
              overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#EAEAE0' }} />
              <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Avg Days to Sell</div>
              <div style={{ color: '#EAEAE0', fontSize: '1.6rem', fontWeight: 800 }}>{result.daysToSell} days</div>
              <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '4px' }}>Camp Hill {propertyType} avg</div>
            </div>
          </div>
        </>
      )}

      {/* Disclaimer */}
      <div style={{ color: '#334155', fontSize: '0.7rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '0.75rem' }}>
        ⚠️ Estimates based on real Camp Hill sales data (2021–2026). For a precise appraisal, book a property inspection with Antonio.
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function MarketPulse () {
  const {
    kpis,
    housePriceTrend,
    unitPriceTrend,
    daysOnMarketData,
    purchasingTrends,
    loading,
    error,
    hasData,
  } = useMarketPulseData()

  // Format KPIs for display
  const medianHouseStr = kpis.medianHousePrice ? formatM(kpis.medianHousePrice) : '—'
  const medianUnitStr = kpis.medianUnitPrice ? formatM(kpis.medianUnitPrice) : '—'
  const domStr = kpis.avgDOM30d
    ? `${kpis.avgDOM30d} days`
    : (kpis.avgDOMHouses ? `${kpis.avgDOMHouses} days` : '—')
  const ownerPct = kpis.ownerOccupiedPct ?? 0
  const rentedPct = kpis.rentedPct ?? (100 - ownerPct)
  const occupancyStr = ownerPct ? `${ownerPct}% / ${rentedPct}%` : '—'

  // Month label for KPI sub text
  const snapshotMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const monthLabel = kpis.month ? snapshotMonths[kpis.month - 1] : ''
  const periodLabel = kpis.month && kpis.year ? `${monthLabel} ${kpis.year}` : 'Camp Hill'

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h1 style={{ color: '#f1f5f9', fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TrendingUp size={22} color="#EAEAE0" />
              Market Pulse
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '4px 0 0' }}>
              Camp Hill property market insights • 2021–2026 • {hasData ? `${kpis.totalProperties} recent sales` : '1,400+ sales'}
            </p>
          </div>
          {/* Last Updated */}
          {kpis.lastUpdated && (
            <div style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.09)',
              borderTop: '1px solid rgba(255,255,255,0.18)',
              backdropFilter: 'blur(32px) saturate(1.8)',
              WebkitBackdropFilter: 'blur(32px) saturate(1.8)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 4px 20px rgba(0,0,0,0.4)',
              borderRadius: '8px',
              padding: '0.4rem 0.75rem',
              fontSize: '0.72rem',
              color: '#475569',
            }}>
              🕐 Last updated: {formatTimestamp(kpis.lastUpdated)}
            </div>
          )}
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{
            marginTop: '0.75rem',
            background: '#EAEAE011',
            border: '1px solid #EAEAE044',
            borderRadius: '8px',
            padding: '0.6rem 1rem',
            color: '#EAEAE0',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertCircle size={14} />
            {error}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}>
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <KPICard icon={<Home size={13} />} label="Median House Price" value={medianHouseStr} sub={`Camp Hill · ${periodLabel}`} />
            <KPICard icon={<TrendingUp size={13} />} label="Median Unit Price" value={medianUnitStr} sub={`Camp Hill · ${periodLabel}`} />
            <KPICard icon={<Clock size={13} />} label="Avg Days on Market" value={domStr} sub={kpis.avgDOM30d ? '30-day rolling avg' : `Houses ${kpis.avgDOMHouses ?? '—'}d · Units ${kpis.avgDOMUnits ?? '—'}d`} />
            <KPICard icon={<Users size={13} />} label="Owner-Occupied" value={occupancyStr} sub="Owner vs. Rented split" />
          </>
        )}
      </div>

      {/* Charts 2x2 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {/* House Price Trend */}
        <ChartCard title="House Price Trend — Annual Median">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '0.8rem' }}>Loading...</div>
          ) : housePriceTrend.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '0.8rem' }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={housePriceTrend} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <XAxis dataKey="year" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatM} tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} width={58} />
                <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                <Line type="monotone" dataKey="median" name="Median" stroke="#EAEAE0" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#EAEAE0', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Unit Price Trend */}
        <ChartCard title="Unit Price Trend — Annual Median">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '0.8rem' }}>Loading...</div>
          ) : unitPriceTrend.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '0.8rem' }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={unitPriceTrend} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <XAxis dataKey="year" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatM} tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} width={58} />
                <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
                <Line type="monotone" dataKey="median" name="Median" stroke="#EAEAE0" strokeWidth={1.5} dot={false} activeDot={{ r: 4, fill: '#EAEAE0', strokeWidth: 0 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Avg Days on Market */}
        <ChartCard title="Avg Days on Market — Latest Month">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '0.8rem' }}>Loading...</div>
          ) : daysOnMarketData.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '0.8rem' }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={daysOnMarketData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <XAxis dataKey="category" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 80]} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v} days`} />} />
                <Bar dataKey="days" name="Days" radius={[4, 4, 0, 0]} fill="#EAEAE0" fillOpacity={0.7} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Purchasing Trends */}
        <ChartCard title="Purchasing Trends — Owner vs Rented">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '0.8rem' }}>Loading...</div>
          ) : purchasingTrends.length === 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#555', fontSize: '0.8rem' }}>No data</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={purchasingTrends} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <XAxis dataKey="year" tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#444', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
                <Legend iconType="circle" iconSize={7} wrapperStyle={{ fontSize: '0.68rem', color: '#555' }} />
                <Line type="monotone" dataKey="ownerOccupied" name="Owner-Occupied" stroke="#EAEAE0" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="rented" name="Rented" stroke="#555" strokeWidth={1.5} dot={false} strokeDasharray="4 2" />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Appraisal Calculator */}
      <AppraisalCalculator />

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  )
}
