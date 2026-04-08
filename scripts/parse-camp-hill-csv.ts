#!/usr/bin/env ts-node
/**
 * Camp Hill Sales CSV Parser
 * 
 * Parses REA export CSV and populates Supabase with:
 *   - camp_hill_sales_snapshots (monthly aggregates)
 *   - camp_hill_properties (individual sales)
 * 
 * Usage:
 *   npx ts-node scripts/parse-camp-hill-csv.ts path/to/recentSaleExport.csv
 *   
 * The CSV columns (REA export format, no header row):
 *   [0] Address
 *   [1] Suburb
 *   [2] State
 *   [3] Postcode
 *   [4] Property Type
 *   [5] Beds
 *   [6] Baths
 *   [7] Car Spaces
 *   [8] Land Size (sqm)
 *   [9] Build Year
 *   [10] Days on Market
 *   [11] Price
 *   [12] Sale Date
 *   [13] Settlement Date (or '-')
 *   [14] Sale Type
 *   [15] Agency
 *   [16] ... (extra)
 *   [-3] Occupancy Status (e.g. 'Owner Occupied')
 */

import fs from 'fs'
import path from 'path'
import readline from 'readline'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://zjyrillpennxowntwebo.supabase.co'
// Use service role key for writes (set in env or use hardcoded for scripts)
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDA4MiwiZXhwIjoyMDg4MDEwMDgyfQ.qs_YCiL_rfyVVNl2jHyFGDi9lhafOXXSnXjYtogUmXY'

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface ParsedProperty {
  address: string
  price: number | null
  sale_date: string    // YYYY-MM-DD
  sale_month: number
  sale_year: number
  days_on_market: number | null
  property_type: 'house' | 'unit'
  occupancy_status: 'owner_occupied' | 'rented' | null
  beds: number | null
  baths: number | null
  land_size: number | null
}

interface SnapshotData {
  month: number
  year: number
  total_properties: number
  median_house_price: number | null
  median_unit_price: number | null
  avg_days_on_market_houses: number | null
  avg_days_on_market_units: number | null
  owner_occupied_pct: number | null
  rented_pct: number | null
}

// ─── CSV PARSER ─────────────────────────────────────────────────────────────

function parseCSVLine (line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  result.push(current.trim())
  return result
}

function parsePrice (raw: string): number | null {
  if (!raw || raw === '-' || raw.toLowerCase() === 'not disclosed') return null
  const cleaned = raw.replace(/[$,\s]/g, '')
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function parseDate (raw: string): string | null {
  if (!raw || raw === '-') return null
  // Format: "01 Apr 2026" or "29 Feb 2024"
  const months: Record<string, number> = {
    'Jan': 1, 'Feb': 2, 'Mar': 3, 'Apr': 4, 'May': 5, 'Jun': 6,
    'Jul': 7, 'Aug': 8, 'Sep': 9, 'Oct': 10, 'Nov': 11, 'Dec': 12
  }
  const parts = raw.trim().split(' ')
  if (parts.length !== 3) return null
  const day = parseInt(parts[0])
  const month = months[parts[1]]
  const year = parseInt(parts[2])
  if (!day || !month || !year) return null
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function parsePropertyType (raw: string): 'house' | 'unit' {
  const lower = raw.toLowerCase()
  if (lower.includes('unit') || lower.includes('apartment') || lower.includes('flat') || lower.includes('townhouse')) {
    return 'unit'
  }
  return 'house'
}

function parseOccupancy (raw: string): 'owner_occupied' | 'rented' | null {
  const lower = raw.toLowerCase()
  if (lower.includes('owner')) return 'owner_occupied'
  if (lower.includes('rent') || lower.includes('invest')) return 'rented'
  return null
}

function parseIntOrNull (raw: string): number | null {
  if (!raw || raw === '-') return null
  const n = parseInt(raw)
  return isNaN(n) ? null : n
}

function parseFloatOrNull (raw: string): number | null {
  if (!raw || raw === '-') return null
  const n = parseFloat(raw)
  return isNaN(n) ? null : n
}

// ─── STATISTICS ─────────────────────────────────────────────────────────────

function median (values: number[]): number | null {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function average (values: number[]): number | null {
  if (!values.length) return null
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length)
}

// ─── SUPABASE CLIENT ────────────────────────────────────────────────────────

async function supabaseFetch (endpoint: string, options: RequestInit = {}): Promise<any> {
  const url = `${SUPABASE_URL}/rest/v1${endpoint}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {}),
    },
  })

  if (res.status === 204) return null
  const text = await res.text()

  if (!res.ok) {
    throw new Error(`Supabase ${res.status}: ${text}`)
  }

  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// ─── MAIN LOGIC ─────────────────────────────────────────────────────────────

async function readCSV (filePath: string): Promise<ParsedProperty[]> {
  return new Promise((resolve, reject) => {
    const properties: ParsedProperty[] = []
    const seenAddresses = new Set<string>()

    const rl = readline.createInterface({
      input: fs.createReadStream(filePath),
      crlfDelay: Infinity
    })

    let lineNum = 0

    rl.on('line', (line: string) => {
      lineNum++
      if (!line.trim()) return

      // Strip BOM from first line
      if (lineNum === 1) {
        line = line.replace(/^\uFEFF/, '')
      }

      const cols = parseCSVLine(line)
      if (cols.length < 13) return

      const address = cols[0]?.trim() + ', ' + cols[1]?.trim() + ' QLD ' + cols[3]?.trim()
      const propTypeRaw = cols[4]?.trim() || ''
      const beds = parseIntOrNull(cols[5])
      const baths = parseIntOrNull(cols[6])
      const landSize = parseFloatOrNull(cols[8])
      const daysOnMarket = parseIntOrNull(cols[10])
      const priceRaw = cols[11]?.trim() || ''
      const saleDateRaw = cols[12]?.trim() || ''
      const saleType = cols[14]?.trim() || ''
      
      // Find occupancy — it's in a variable position, scan from end
      let occupancyRaw = ''
      for (let i = cols.length - 1; i >= Math.max(0, cols.length - 6); i--) {
        const val = cols[i]?.trim() || ''
        if (val.toLowerCase().includes('owner') || val.toLowerCase().includes('rent') || val.toLowerCase().includes('invest')) {
          occupancyRaw = val
          break
        }
      }

      const price = parsePrice(priceRaw)
      const saleDate = parseDate(saleDateRaw)

      // Skip if no valid sale date
      if (!saleDate) return

      // Skip "Pending Settlement Advice" if no price — but still include if price is there
      // Skip duplicates (same address, same date)
      const dedupeKey = `${address.toLowerCase()}|${saleDate}`
      if (seenAddresses.has(dedupeKey)) return
      seenAddresses.add(dedupeKey)

      const parts = saleDate.split('-')
      const saleYear = parseInt(parts[0])
      const saleMonth = parseInt(parts[1])

      properties.push({
        address: cols[0]?.trim() + ', Camp Hill QLD 4152',
        price,
        sale_date: saleDate,
        sale_month: saleMonth,
        sale_year: saleYear,
        days_on_market: daysOnMarket,
        property_type: parsePropertyType(propTypeRaw),
        occupancy_status: parseOccupancy(occupancyRaw),
        beds,
        baths,
        land_size: landSize,
      })
    })

    rl.on('close', () => {
      console.log(`📊 Parsed ${properties.length} unique properties from ${lineNum} lines`)
      resolve(properties)
    })

    rl.on('error', reject)
  })
}

function groupByMonthYear (properties: ParsedProperty[]): Map<string, ParsedProperty[]> {
  const groups = new Map<string, ParsedProperty[]>()
  for (const prop of properties) {
    const key = `${prop.sale_year}-${prop.sale_month}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(prop)
  }
  return groups
}

function buildSnapshot (month: number, year: number, props: ParsedProperty[]): SnapshotData {
  const houses = props.filter(p => p.property_type === 'house')
  const units = props.filter(p => p.property_type === 'unit')

  const housePrices = houses.filter(p => p.price !== null).map(p => p.price as number)
  const unitPrices = units.filter(p => p.price !== null).map(p => p.price as number)

  const houseDOM = houses.filter(p => p.days_on_market !== null).map(p => p.days_on_market as number)
  const unitDOM = units.filter(p => p.days_on_market !== null).map(p => p.days_on_market as number)

  const totalWithOccupancy = props.filter(p => p.occupancy_status !== null)
  const ownerOccupied = totalWithOccupancy.filter(p => p.occupancy_status === 'owner_occupied').length
  const rented = totalWithOccupancy.filter(p => p.occupancy_status === 'rented').length

  const ownerOccupiedPct = totalWithOccupancy.length > 0
    ? Math.round((ownerOccupied / totalWithOccupancy.length) * 100)
    : null
  const rentedPct = totalWithOccupancy.length > 0
    ? Math.round((rented / totalWithOccupancy.length) * 100)
    : null

  return {
    month,
    year,
    total_properties: props.length,
    median_house_price: median(housePrices),
    median_unit_price: median(unitPrices),
    avg_days_on_market_houses: average(houseDOM),
    avg_days_on_market_units: average(unitDOM),
    owner_occupied_pct: ownerOccupiedPct,
    rented_pct: rentedPct,
  }
}

async function upsertSnapshot (snapshot: SnapshotData): Promise<string> {
  console.log(`  📅 Upserting snapshot: ${snapshot.month}/${snapshot.year} (${snapshot.total_properties} props)`)

  // Check if snapshot already exists
  const existing = await supabaseFetch(
    `/camp_hill_sales_snapshots?month=eq.${snapshot.month}&year=eq.${snapshot.year}&select=id`
  )

  if (existing && existing.length > 0) {
    // Update
    await supabaseFetch(
      `/camp_hill_sales_snapshots?id=eq.${existing[0].id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(snapshot),
        headers: { 'Prefer': 'return=minimal' }
      }
    )
    return existing[0].id
  } else {
    // Insert
    const result = await supabaseFetch('/camp_hill_sales_snapshots', {
      method: 'POST',
      body: JSON.stringify(snapshot),
    })
    return result[0].id
  }
}

async function insertProperties (snapshotId: string, props: ParsedProperty[]): Promise<void> {
  // Delete existing properties for this snapshot to avoid duplicates on re-run
  await supabaseFetch(
    `/camp_hill_properties?snapshot_id=eq.${snapshotId}`,
    { method: 'DELETE', headers: { 'Prefer': 'return=minimal' } }
  )

  // Insert in batches of 100
  const batchSize = 100
  for (let i = 0; i < props.length; i += batchSize) {
    const batch = props.slice(i, i + batchSize).map(p => ({
      snapshot_id: snapshotId,
      address: p.address,
      price: p.price,
      sale_date: p.sale_date,
      days_on_market: p.days_on_market,
      property_type: p.property_type,
      occupancy_status: p.occupancy_status,
      beds: p.beds,
      baths: p.baths,
      land_size: p.land_size,
      sold_year: p.sale_year,
    }))

    await supabaseFetch('/camp_hill_properties', {
      method: 'POST',
      body: JSON.stringify(batch),
      headers: { 'Prefer': 'return=minimal' }
    })

    console.log(`    ✓ Inserted ${Math.min(i + batchSize, props.length)}/${props.length} properties`)
  }
}

async function main () {
  const csvPath = process.argv[2]
  if (!csvPath) {
    console.error('Usage: npx ts-node scripts/parse-camp-hill-csv.ts path/to/recentSaleExport.csv')
    process.exit(1)
  }

  const resolvedPath = path.resolve(csvPath)
  if (!fs.existsSync(resolvedPath)) {
    console.error(`❌ File not found: ${resolvedPath}`)
    process.exit(1)
  }

  console.log(`\n🏡 Camp Hill CSV Parser`)
  console.log(`📁 File: ${resolvedPath}`)
  console.log(`🗄️  Supabase: ${SUPABASE_URL}\n`)

  // 1. Parse CSV
  const properties = await readCSV(resolvedPath)
  
  if (properties.length === 0) {
    console.error('❌ No valid properties found in CSV')
    process.exit(1)
  }

  // 2. Group by month/year
  const groups = groupByMonthYear(properties)
  console.log(`\n📆 Found ${groups.size} month(s) of data:`)
  groups.forEach((props, key) => {
    console.log(`  ${key}: ${props.length} properties`)
  })

  // 3. Process each month
  let totalInserted = 0
  for (const [, props] of groups) {
    const { sale_month, sale_year } = props[0]
    
    console.log(`\n🔄 Processing ${sale_month}/${sale_year}...`)
    
    // Build snapshot aggregates
    const snapshot = buildSnapshot(sale_month, sale_year, props)
    
    console.log(`  📊 Stats:`)
    console.log(`    Houses: ${props.filter(p => p.property_type === 'house').length}`)
    console.log(`    Units: ${props.filter(p => p.property_type === 'unit').length}`)
    console.log(`    Median house price: ${snapshot.median_house_price ? '$' + snapshot.median_house_price.toLocaleString() : 'N/A'}`)
    console.log(`    Median unit price: ${snapshot.median_unit_price ? '$' + snapshot.median_unit_price.toLocaleString() : 'N/A'}`)
    console.log(`    Avg DOM houses: ${snapshot.avg_days_on_market_houses ?? 'N/A'} days`)
    console.log(`    Avg DOM units: ${snapshot.avg_days_on_market_units ?? 'N/A'} days`)
    console.log(`    Owner-occupied: ${snapshot.owner_occupied_pct ?? 'N/A'}%`)

    try {
      // Upsert snapshot
      const snapshotId = await upsertSnapshot(snapshot)
      
      // Insert properties
      await insertProperties(snapshotId, props)
      totalInserted += props.length
    } catch (err: any) {
      console.error(`  ❌ Error:`, err.message)
      if (err.message.includes('does not exist')) {
        console.error('\n⚠️  Tables not found! Run the SQL migration first:')
        console.error('   https://supabase.com/dashboard/project/zjyrillpennxowntwebo/sql/new')
        console.error('   Then paste the contents of: supabase/migrations/006_camp_hill_market_pulse.sql')
        process.exit(1)
      }
    }
  }

  console.log(`\n✅ Done! Inserted/updated ${totalInserted} properties across ${groups.size} snapshots.`)
  console.log(`\n🌐 View in Mission Control: https://mission-control-v2-delta.vercel.app`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
