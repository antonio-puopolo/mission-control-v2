import { useState } from 'react'
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { TrendingUp, Home, Clock, Users, Calculator, DollarSign, Calendar, MapPin } from 'lucide-react'

// ─── SEED DATA ───────────────────────────────────────────────────────────────

const housePriceTrend = [
  { year: '2021', median: 1200000 },
  { year: '2022', median: 1480000 },
  { year: '2023', median: 1620000 },
  { year: '2024', median: 1780000 },
  { year: '2025', median: 1880000 },
  { year: '2026', median: 1950000 },
]

const unitPriceTrend = [
  { year: '2021', median: 650000 },
  { year: '2022', median: 730000 },
  { year: '2023', median: 810000 },
  { year: '2024', median: 920000 },
  { year: '2025', median: 1020000 },
  { year: '2026', median: 1100000 },
]

const daysOnMarketData = [
  { category: 'Houses', days: 38 },
  { category: 'Units', days: 44 },
]

const purchasingTrends = [
  { year: '2021', ownerOccupied: 64, rented: 36 },
  { year: '2022', ownerOccupied: 65, rented: 35 },
  { year: '2023', ownerOccupied: 66, rented: 34 },
  { year: '2024', ownerOccupied: 67, rented: 33 },
  { year: '2025', ownerOccupied: 66, rented: 34 },
  { year: '2026', ownerOccupied: 65, rented: 35 },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatM(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value}`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(value)
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
      border: '1px solid #2a3a4a',
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

function KPICard({ icon, label, value, sub, color }: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
  color: string
}) {
  return (
    <div style={{
      background: '#1a2332',
      border: `1px solid ${color}33`,
      borderRadius: '12px',
      padding: '1.2rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: color }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color }}>
        {icon}
        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</span>
      </div>
      <div style={{ color: '#e2e8f0', fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>{value}</div>
      <div style={{ color: '#475569', fontSize: '0.72rem' }}>{sub}</div>
    </div>
  )
}

// ─── CHART CARD ──────────────────────────────────────────────────────────────

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#1a2332',
      border: '1px solid #2a3a4a',
      borderRadius: '12px',
      padding: '1.25rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
    }}>
      <div style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</div>
      <div style={{ height: '220px' }}>
        {children}
      </div>
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
}

function calculateAppraisal(
  purchaseYear: number,
  purchasePrice: number | null,
  propertyType: 'house' | 'unit'
): AppraisalResult {
  const trendData = propertyType === 'house' ? housePriceTrend : unitPriceTrend
  const latestMedian = trendData[trendData.length - 1].median
  const purchaseYearData = trendData.find(d => d.year === String(purchaseYear))
  const purchaseMedianAtTime = purchaseYearData?.median ?? trendData[0].median

  // Growth ratio from purchase year to now
  const growthRatio = latestMedian / purchaseMedianAtTime

  // Comp value: if purchase price given, apply same growth ratio; else use latest median
  const compValue = purchasePrice != null
    ? Math.round(purchasePrice * growthRatio)
    : latestMedian

  // Appreciation
  const appreciation = purchasePrice != null ? compValue - purchasePrice : 0
  const appreciationPct = purchasePrice != null ? ((appreciation / purchasePrice) * 100) : 0

  // List price range: comp ± 5%
  const listPriceLow = Math.round(compValue * 0.95)
  const listPriceHigh = Math.round(compValue * 1.05)

  const daysToSell = propertyType === 'house' ? 38 : 44

  return { compValue, appreciation, appreciationPct, listPriceLow, listPriceHigh, daysToSell }
}

function AppraisalCalculator() {
  const [address, setAddress] = useState('')
  const [purchaseYear, setPurchaseYear] = useState<string>('2020')
  const [purchasePrice, setPurchasePrice] = useState<string>('')
  const [propertyType, setPropertyType] = useState<'house' | 'unit'>('house')
  const [result, setResult] = useState<AppraisalResult | null>(null)

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: currentYear - 2000 + 1 }, (_, i) => String(2000 + i)).reverse()

  const inputStyle = {
    background: '#0f172a',
    border: '1px solid #2a3a4a',
    borderRadius: '8px',
    padding: '0.6rem 0.85rem',
    color: '#e2e8f0',
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

  const handleCalculate = () => {
    const year = parseInt(purchaseYear)
    const price = purchasePrice.trim() ? parseInt(purchasePrice.replace(/[$,]/g, '')) : null
    if (isNaN(year)) return
    setResult(calculateAppraisal(year, price, propertyType))
  }

  return (
    <div style={{
      background: '#1a2332',
      border: '1px solid #2a3a4a',
      borderRadius: '12px',
      padding: '1.5rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1.25rem',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Calculator size={18} color="#14b8a6" />
        <div>
          <div style={{ color: '#e2e8f0', fontSize: '1rem', fontWeight: 700 }}>Appraisal Calculator</div>
          <div style={{ color: '#475569', fontSize: '0.75rem' }}>Estimate current market value based on Camp Hill trends</div>
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
            onFocus={e => (e.currentTarget.style.borderColor = '#14b8a6')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2a3a4a')}
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
                  background: propertyType === t ? '#14b8a6' : '#0f172a',
                  color: propertyType === t ? '#0a0f19' : '#94a3b8',
                  border: `1px solid ${propertyType === t ? '#14b8a6' : '#2a3a4a'}`,
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
            onFocus={e => (e.currentTarget.style.borderColor = '#14b8a6')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2a3a4a')}
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
            onFocus={e => (e.currentTarget.style.borderColor = '#14b8a6')}
            onBlur={e => (e.currentTarget.style.borderColor = '#2a3a4a')}
          />
        </div>
      </div>

      {/* Calculate button */}
      <button
        onClick={handleCalculate}
        style={{
          background: 'linear-gradient(90deg, #14b8a6, #0ea5e9)',
          color: '#000',
          border: 'none',
          borderRadius: '8px',
          padding: '0.7rem 1.5rem',
          fontWeight: 800,
          fontSize: '0.9rem',
          cursor: 'pointer',
          letterSpacing: '0.02em',
          alignSelf: 'flex-start',
          transition: 'opacity 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.9')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Calculate Appraisal →
      </button>

      {/* Result */}
      {result && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '0.75rem',
          marginTop: '0.25rem',
        }}>
          {/* Comp Value */}
          <div style={{
            background: '#0f172a',
            border: '1px solid #14b8a633',
            borderRadius: '10px',
            padding: '1rem',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#14b8a6' }} />
            <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Market Comp Value</div>
            <div style={{ color: '#14b8a6', fontSize: '1.6rem', fontWeight: 800 }}>{formatM(result.compValue)}</div>
            <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '4px' }}>Based on Camp Hill {propertyType} trends</div>
          </div>

          {/* Appreciation */}
          {purchasePrice && (
            <div style={{
              background: '#0f172a',
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
            background: '#0f172a',
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
            background: '#0f172a',
            border: '1px solid #f59e0b33',
            borderRadius: '10px',
            padding: '1rem',
            position: 'relative',
            overflow: 'hidden',
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: '#f59e0b' }} />
            <div style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Avg Days to Sell</div>
            <div style={{ color: '#f59e0b', fontSize: '1.6rem', fontWeight: 800 }}>{result.daysToSell} days</div>
            <div style={{ color: '#475569', fontSize: '0.72rem', marginTop: '4px' }}>Camp Hill {propertyType} avg</div>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div style={{ color: '#334155', fontSize: '0.7rem', borderTop: '1px solid #1e293b', paddingTop: '0.75rem' }}>
        ⚠️ Estimates based on Camp Hill market trend data (2021–2026). For a precise appraisal, book a property inspection.
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

export function MarketPulse() {
  const latestHouseMedian = housePriceTrend[housePriceTrend.length - 1].median
  const latestUnitMedian = unitPriceTrend[unitPriceTrend.length - 1].median
  const avgDOM = 41
  const ownerPct = 65

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: '#e2e8f0', fontSize: '1.5rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={22} color="#14b8a6" />
          Market Pulse
        </h1>
        <p style={{ color: '#64748b', fontSize: '0.82rem', margin: '4px 0 0' }}>
          Camp Hill property market insights • 2021–2026 • 1,400+ sales
        </p>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '0.75rem',
        marginBottom: '1.5rem',
      }}>
        <KPICard
          icon={<Home size={14} />}
          label="Median House Price"
          value={formatM(latestHouseMedian)}
          sub="Camp Hill · Apr 2026"
          color="#14b8a6"
        />
        <KPICard
          icon={<TrendingUp size={14} />}
          label="Median Unit Price"
          value={formatM(latestUnitMedian)}
          sub="Camp Hill · Apr 2026"
          color="#6366f1"
        />
        <KPICard
          icon={<Clock size={14} />}
          label="Avg Days on Market"
          value={`${avgDOM} days`}
          sub="Houses 38d · Units 44d"
          color="#f59e0b"
        />
        <KPICard
          icon={<Users size={14} />}
          label="Owner-Occupied"
          value={`${ownerPct}% / ${100 - ownerPct}%`}
          sub="Owner vs. Rented split"
          color="#0ea5e9"
        />
      </div>

      {/* Charts 2x2 */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {/* House Price Trend */}
        <ChartCard title="🏠 House Price Trend (Median)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={housePriceTrend} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatM} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
              <Line
                type="monotone"
                dataKey="median"
                name="Median"
                stroke="#14b8a6"
                strokeWidth={2.5}
                dot={{ fill: '#14b8a6', r: 4 }}
                activeDot={{ r: 6, fill: '#14b8a6' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Unit Price Trend */}
        <ChartCard title="🏢 Unit Price Trend (Median)">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={unitPriceTrend} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={formatM} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} width={60} />
              <Tooltip content={<CustomTooltip formatter={formatCurrency} />} />
              <Line
                type="monotone"
                dataKey="median"
                name="Median"
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ fill: '#6366f1', r: 4 }}
                activeDot={{ r: 6, fill: '#6366f1' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Avg Days on Market */}
        <ChartCard title="⏱️ Avg Days on Market">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={daysOnMarketData} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 60]} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v} days`} />} />
              <Bar dataKey="days" name="Days" radius={[4, 4, 0, 0]} fill="#f59e0b" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Purchasing Trends */}
        <ChartCard title="👥 Purchasing Trends (Owner vs Rented %)">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={purchasingTrends} margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
              <Tooltip content={<CustomTooltip formatter={(v) => `${v}%`} />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '0.72rem', color: '#64748b' }}
              />
              <Area
                type="monotone"
                dataKey="ownerOccupied"
                name="Owner-Occupied"
                stackId="1"
                stroke="#0ea5e9"
                fill="#0ea5e933"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="rented"
                name="Rented"
                stackId="1"
                stroke="#6366f1"
                fill="#6366f133"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Appraisal Calculator */}
      <AppraisalCalculator />
    </div>
  )
}
