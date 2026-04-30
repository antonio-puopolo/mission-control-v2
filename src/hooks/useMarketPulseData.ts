/**
 * useMarketPulseData — Camp Hill Market Pulse Data Hook
 * 
 * Fetches real data from Supabase:
 *   - Latest snapshot (KPI values)
 *   - Historical snapshots (chart data)
 *   - 30-day rolling Days on Market
 *   - Comp lookup for appraisal calculator
 */

import { useState, useEffect, useCallback } from 'react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://zjyrillpennxowntwebo.supabase.co'
// Use service role key for read access (tables have no RLS)
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDA4MiwiZXhwIjoyMDg4MDEwMDgyfQ.qs_YCiL_rfyVVNl2jHyFGDi9lhafOXXSnXjYtogUmXY'

const HEADERS = {
  'apikey': SUPABASE_KEY,
  'Content-Type': 'application/json',
}

async function sbFetch (endpoint: string): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${endpoint}`, { headers: HEADERS })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Supabase ${res.status}: ${err}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ─── TYPES ──────────────────────────────────────────────────────────────────

export interface Snapshot {
  id: string
  month: number
  year: number
  total_properties: number
  median_house_price: number | null
  median_unit_price: number | null
  avg_days_on_market_houses: number | null
  avg_days_on_market_units: number | null
  owner_occupied_pct: number | null
  rented_pct: number | null
  created_at: string
}

export interface Property {
  id: string
  snapshot_id: string
  address: string
  price: number | null
  sale_date: string
  days_on_market: number | null
  property_type: 'house' | 'unit'
  occupancy_status: 'owner_occupied' | 'rented' | null
  beds: number | null
  baths: number | null
  land_size: number | null
  sold_year: number | null
}

export interface MarketPulseKPIs {
  medianHousePrice: number | null
  medianUnitPrice: number | null
  avgDOMHouses: number | null
  avgDOMUnits: number | null
  avgDOM30d: number | null   // 30-day rolling avg across all types
  ownerOccupiedPct: number | null
  rentedPct: number | null
  totalProperties: number
  lastUpdated: string | null
  month: number | null
  year: number | null
}

export interface ChartPoint {
  label: string   // "Jan 2024"
  year: string    // "2024" for legacy compat
  median?: number
  ownerOccupied?: number
  rented?: number
  days?: number
}

export interface MarketPulseData {
  kpis: MarketPulseKPIs
  housePriceTrend: ChartPoint[]
  unitPriceTrend: ChartPoint[]
  daysOnMarketData: { category: string; days: number }[]
  purchasingTrends: ChartPoint[]
  loading: boolean
  error: string | null
  hasData: boolean
}

export interface CompResult {
  comps: Property[]
  medianPrice: number | null
  growthRatio: number | null
  sampleSize: number
}

// ─── HELPERS ────────────────────────────────────────────────────────────────



function medianOf (values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

// ─── MAIN HOOK ──────────────────────────────────────────────────────────────

export function useMarketPulseData (suburb = 'camp_hill'): MarketPulseData {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [recentProperties, setRecentProperties] = useState<Property[]>([])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch all snapshots for this suburb ordered by year/month
      const snapshotData: Snapshot[] = await sbFetch(
        `/camp_hill_sales_snapshots?suburb=eq.${suburb}&order=year.asc,month.asc&select=*`
      )

      if (!snapshotData || snapshotData.length === 0) {
        setError('No data available yet for this suburb.')
        setLoading(false)
        return
      }

      setSnapshots(snapshotData)

      // Fetch properties sold in last 12 months for rolling median + DOM calc
      const twelveMonthsAgo = new Date()
      twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1)
      const cutoff = twelveMonthsAgo.toISOString().split('T')[0]

      const recentProps: Property[] = await sbFetch(
        `/camp_hill_properties?suburb=eq.${suburb}&sale_date=gte.${cutoff}&price=not.is.null&select=*&order=sale_date.desc`
      )

      setRecentProperties(recentProps || [])
    } catch (err: any) {
      console.error('Market Pulse data fetch failed:', err)
      setError(`Data unavailable: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [suburb])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── DERIVED DATA ────────────────────────────────────────────────────────

  if (loading || snapshots.length === 0) {
    return {
      kpis: {
        medianHousePrice: null,
        medianUnitPrice: null,
        avgDOMHouses: null,
        avgDOMUnits: null,
        avgDOM30d: null,
        ownerOccupiedPct: null,
        rentedPct: null,
        totalProperties: 0,
        lastUpdated: null,
        month: null,
        year: null,
      },
      housePriceTrend: [],
      unitPriceTrend: [],
      daysOnMarketData: [],
      purchasingTrends: [],
      loading,
      error,
      hasData: false,
    }
  }

  // Latest snapshot — used for occupancy, DOM, and total count
  const latest = snapshots[snapshots.length - 1]

  // 12-month rolling medians from actual property records (matches Domain/CoreLogic methodology)
  const houses12m = recentProperties.filter(p => p.property_type === 'house')
  const units12m = recentProperties.filter(p => p.property_type === 'unit')

  const housePrices12m = houses12m
    .map(p => p.price)
    .filter((p): p is number => p !== null && p > 0)
    .sort((a, b) => a - b)
  const unitPrices12m = units12m
    .map(p => p.price)
    .filter((p): p is number => p !== null && p > 0)
    .sort((a, b) => a - b)

  const median12m = (arr: number[]) => {
    if (!arr.length) return null
    const mid = Math.floor(arr.length / 2)
    return arr.length % 2 === 0 ? Math.round((arr[mid - 1] + arr[mid]) / 2) : arr[mid]
  }

  // DOM: use snapshot values if available, else compute from 12-month window
  const domHouses = houses12m
    .map(p => p.days_on_market)
    .filter((d): d is number => d !== null && d > 0)
  const domUnits = units12m
    .map(p => p.days_on_market)
    .filter((d): d is number => d !== null && d > 0)

  const avgDOMHouses = domHouses.length > 0
    ? Math.round(domHouses.reduce((a, b) => a + b) / domHouses.length)
    : null
  const avgDOMUnits = domUnits.length > 0
    ? Math.round(domUnits.reduce((a, b) => a + b) / domUnits.length)
    : null

  const kpis: MarketPulseKPIs = {
    medianHousePrice: median12m(housePrices12m),
    medianUnitPrice: median12m(unitPrices12m),
    avgDOMHouses: latest.avg_days_on_market_houses ?? avgDOMHouses,
    avgDOMUnits: latest.avg_days_on_market_units ?? avgDOMUnits,
    avgDOM30d: null,
    ownerOccupiedPct: latest.owner_occupied_pct ?? null,
    rentedPct: latest.rented_pct ?? null,
    totalProperties: housePrices12m.length + unitPrices12m.length,
    lastUpdated: new Date().toISOString(),
    month: latest.month,
    year: latest.year,
  }

  // Build chart data — aggregate by year (annual medians for trend lines)
  // Group snapshots by year and calculate annual medians
  const byYear = new Map<number, Snapshot[]>()
  for (const snap of snapshots) {
    if (!byYear.has(snap.year)) byYear.set(snap.year, [])
    byYear.get(snap.year)!.push(snap)
  }

  const housePriceTrend: ChartPoint[] = []
  const unitPriceTrend: ChartPoint[] = []
  const purchasingTrends: ChartPoint[] = []

  const sortedYears = Array.from(byYear.keys()).sort()
  for (const year of sortedYears) {
    const yearSnaps = byYear.get(year)!
    const housePrices = yearSnaps.filter(s => s.median_house_price !== null).map(s => s.median_house_price as number)
    const unitPrices = yearSnaps.filter(s => s.median_unit_price !== null).map(s => s.median_unit_price as number)
    const ownerPcts = yearSnaps.filter(s => s.owner_occupied_pct !== null).map(s => s.owner_occupied_pct as number)
    const rentedPcts = yearSnaps.filter(s => s.rented_pct !== null).map(s => s.rented_pct as number)

    const houseMedian = medianOf(housePrices)
    const unitMedian = medianOf(unitPrices)
    const ownerPct = ownerPcts.length > 0 ? Math.round(ownerPcts.reduce((a, b) => a + b) / ownerPcts.length) : null
    const rentedPct = rentedPcts.length > 0 ? Math.round(rentedPcts.reduce((a, b) => a + b) / rentedPcts.length) : null

    if (houseMedian !== null) {
      housePriceTrend.push({ label: String(year), year: String(year), median: Math.round(houseMedian) })
    }
    if (unitMedian !== null) {
      unitPriceTrend.push({ label: String(year), year: String(year), median: Math.round(unitMedian) })
    }
    if (ownerPct !== null && rentedPct !== null) {
      purchasingTrends.push({
        label: String(year),
        year: String(year),
        ownerOccupied: ownerPct,
        rented: rentedPct,
      })
    }
  }

  // DOM bar chart — use latest snapshot values
  const daysOnMarketData = [
    ...(latest.avg_days_on_market_houses ? [{ category: 'Houses', days: latest.avg_days_on_market_houses }] : []),
    ...(latest.avg_days_on_market_units ? [{ category: 'Units', days: latest.avg_days_on_market_units }] : []),
  ]

  return {
    kpis,
    housePriceTrend,
    unitPriceTrend,
    daysOnMarketData,
    purchasingTrends,
    loading,
    error,
    hasData: true,
  }
}

// ─── COMP FINDER ────────────────────────────────────────────────────────────

export async function findComps (
  address: string,
  propertyType: 'house' | 'unit',
  purchaseYear?: number,
  suburb = 'camp_hill'
): Promise<CompResult> {
  // Get all snapshots for this suburb for growth ratio calculation
  const snapshots: Snapshot[] = await sbFetch(
    `/camp_hill_sales_snapshots?suburb=eq.${suburb}&order=year.asc,month.asc&select=*`
  )

  // Find properties sold in last 2 years
  const twoYearsAgo = new Date()
  twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2)
  const cutoff = twoYearsAgo.toISOString().split('T')[0]

  // Extract street name for matching
  const streetMatch = address.match(/\d+\s+(.+?)(,|\s+QLD|$)/i)
  const streetName = streetMatch ? streetMatch[1].trim().toLowerCase() : ''

  // First try: same street, same suburb
  let comps: Property[] = []
  if (streetName) {
    const streetComps: Property[] = await sbFetch(
      `/camp_hill_properties?suburb=eq.${suburb}&property_type=eq.${propertyType}&sale_date=gte.${cutoff}&address=ilike.*${encodeURIComponent(streetName)}*&price=not.is.null&order=sale_date.desc&select=*`
    )
    comps = streetComps || []
  }

  // Fallback: suburb-wide comps of same type (last 6 months)
  if (comps.length < 3) {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const sixCutoff = sixMonthsAgo.toISOString().split('T')[0]

    const broadComps: Property[] = await sbFetch(
      `/camp_hill_properties?suburb=eq.${suburb}&property_type=eq.${propertyType}&sale_date=gte.${sixCutoff}&price=not.is.null&order=sale_date.desc&limit=20&select=*`
    )
    comps = broadComps || []
  }

  const prices = comps.filter(p => p.price !== null).map(p => p.price as number)
  const medianPrice = medianOf(prices)

  // Calculate growth ratio using snapshots
  let growthRatio: number | null = null
  if (purchaseYear && snapshots.length > 0) {
    // Get median prices for purchase year and latest year
    const purchaseYearSnaps = snapshots.filter(s => s.year === purchaseYear)
    const latestYearSnaps = snapshots.filter(s => s.year === snapshots[snapshots.length - 1].year)

    const priceField = propertyType === 'house' ? 'median_house_price' : 'median_unit_price'
    
    const purchasePrices = purchaseYearSnaps
      .filter(s => s[priceField as keyof Snapshot] !== null)
      .map(s => s[priceField as keyof Snapshot] as number)
    const latestPrices = latestYearSnaps
      .filter(s => s[priceField as keyof Snapshot] !== null)
      .map(s => s[priceField as keyof Snapshot] as number)

    const purchaseMedian = medianOf(purchasePrices)
    const latestMedian = medianOf(latestPrices)

    if (purchaseMedian && latestMedian) {
      growthRatio = latestMedian / purchaseMedian
    }
  }

  return { comps, medianPrice, growthRatio, sampleSize: comps.length }
}
