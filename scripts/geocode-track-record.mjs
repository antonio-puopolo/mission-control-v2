/**
 * Geocodes Shane Hicks' settlement addresses using Nominatim (OSM).
 * Run: node scripts/geocode-track-record.mjs
 * Output: src/data/track-record-sales.json
 * Rate limit: 1 req/sec (Nominatim policy). ~10 min for 547 addresses.
 * Resume-safe: skips already-geocoded addresses in output file.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const CSV_PATH = join(__dirname, 'shane-hicks-settlements.csv')
const OUT_PATH = join(ROOT, 'src', 'data', 'track-record-sales.json')

// Known multi-word Brisbane suburbs for extraction
const MULTI_WORD_SUBURBS = [
  'Camp Hill', 'Norman Park', 'Holland Park', 'Holland Park West',
  'East Brisbane', 'West End', 'New Farm', 'Seven Hills', 'Cannon Hill',
  'Mount Gravatt', 'Mount Gravatt East', 'Upper Mount Gravatt',
  'Carina Heights', 'Kangaroo Point', 'Fortitude Valley', 'Everton Park',
  'Manly West', 'Browns Plains', 'Shailer Park', 'Coorparoo',
  'Carindale', 'St Lucia', 'Murarrie', 'Tarragindi', 'Moorooka',
  'Yeerongpilly', 'Taringa', 'Auchenflower', 'Teneriffe', 'Newstead',
  'Springwood', 'Underwood', 'Gumdale', 'Paddington', 'Wakerley',
  'Bulimba', 'Balmoral', 'Hawthorne', 'Morningside', 'Greenslopes',
  'Bardon', 'Milton', 'Windsor', 'Aspley', 'Wynnum',
]

function cleanAddress(raw) {
  // Strip (LID:xxx, CID:xxx) suffix
  let addr = raw.replace(/\s*\(LID:[^)]+\)/g, '').trim()

  // Strip leading "Lot X / " prefix (but keep "X / street" for unit numbers)
  addr = addr.replace(/^Lot\s+\d+\s*\/\s*/i, '')

  // Remove trailing period if any
  addr = addr.replace(/\.$/, '').trim()

  return addr
}

function extractSuburb(cleanedAddr) {
  const upper = cleanedAddr.toUpperCase()
  // Check multi-word suburbs first (longest match wins)
  const sorted = [...MULTI_WORD_SUBURBS].sort((a, b) => b.length - a.length)
  for (const sub of sorted) {
    if (upper.endsWith(sub.toUpperCase())) return toTitleCase(sub)
  }
  // Fall back to last word
  const words = cleanedAddr.trim().split(/\s+/)
  return toTitleCase(words[words.length - 1])
}

function toTitleCase(s) {
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
}

function parseCsv(content) {
  const lines = content.split('\n').filter(l => l.trim())
  const entries = []
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    // Format: "Address",DD/MM/YYYY
    const match = line.match(/^"([^"]+)",(.+)$/)
    if (!match) continue
    entries.push({ raw_address: match[1], settlement_date: match[2].trim() })
  }
  return entries
}

async function geocode(address) {
  const q = encodeURIComponent(`${address}, Brisbane QLD Australia`)
  const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=au`
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'MissionControl/2.0 (shane-hicks-track-record; hicks.com.au)',
        'Accept-Language': 'en-AU',
      },
    })
    const data = await res.json()
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    return null
  } catch (e) {
    console.warn(`  Geocode error for "${address}": ${e.message}`)
    return null
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms))

async function main() {
  const csv = readFileSync(CSV_PATH, 'utf-8')
  const entries = parseCsv(csv)
  console.log(`Parsed ${entries.length} entries from CSV`)

  // Load existing results for resume support
  let existing = []
  if (existsSync(OUT_PATH)) {
    try {
      existing = JSON.parse(readFileSync(OUT_PATH, 'utf-8'))
      console.log(`Resuming from ${existing.length} existing results`)
    } catch {}
  }

  const doneAddresses = new Set(existing.map(e => e.raw_address))
  const results = [...existing]
  const todo = entries.filter(e => !doneAddresses.has(e.raw_address))

  console.log(`Need to geocode: ${todo.length} addresses`)
  console.log(`Estimated time: ~${Math.ceil(todo.length * 1.1 / 60)} minutes\n`)

  for (let i = 0; i < todo.length; i++) {
    const entry = todo[i]
    const cleaned = cleanAddress(entry.raw_address)
    const suburb = extractSuburb(cleaned)

    process.stdout.write(`[${i + 1}/${todo.length}] ${cleaned}... `)

    const coords = await geocode(cleaned)

    if (coords) {
      process.stdout.write(`✓ ${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}\n`)
    } else {
      process.stdout.write(`✗ not found\n`)
    }

    results.push({
      raw_address: entry.raw_address,
      address: cleaned,
      suburb,
      settlement_date: entry.settlement_date,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
    })

    // Save progress every 10 entries
    if ((i + 1) % 10 === 0) {
      writeFileSync(OUT_PATH, JSON.stringify(results, null, 2))
    }

    if (i < todo.length - 1) await sleep(1100)
  }

  writeFileSync(OUT_PATH, JSON.stringify(results, null, 2))
  const geocoded = results.filter(r => r.lat !== null).length
  console.log(`\nDone! ${geocoded}/${results.length} geocoded successfully.`)
  console.log(`Output: ${OUT_PATH}`)
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
