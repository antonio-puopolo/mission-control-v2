import { useState, useMemo, useEffect } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// Import pre-geocoded data — populated by scripts/geocode-track-record.mjs
import rawSales from '@/data/track-record-sales.json'

interface Sale {
  raw_address: string
  address: string
  suburb: string
  settlement_date: string
  lat: number | null
  lng: number | null
}

const sales = rawSales as Sale[]

function getSaleYear(s: Sale): number {
  return parseInt(s.settlement_date.split('/')[2], 10)
}

// Build sorted list of unique suburbs that have geocoded results
function getSuburbs(data: Sale[]): string[] {
  const counts: Record<string, number> = {}
  data.forEach(s => {
    if (s.lat !== null) counts[s.suburb] = (counts[s.suburb] || 0) + 1
  })
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([sub]) => sub)
}

// Build sorted list of years that have geocoded results
function getYears(data: Sale[]): number[] {
  const years = new Set(data.filter(s => s.lat !== null).map(getSaleYear))
  return Array.from(years).sort((a, b) => b - a)
}

// Fit map bounds to visible markers
function MapFitter({ points }: { points: [number, number][] }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) { map.setView(points[0], 15); return }
    const lats = points.map(p => p[0])
    const lngs = points.map(p => p[1])
    map.fitBounds(
      [[Math.min(...lats) - 0.01, Math.min(...lngs) - 0.01],
       [Math.max(...lats) + 0.01, Math.max(...lngs) + 0.01]],
      { padding: [50, 50] }
    )
  }, [points.length]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function formatDate(d: string) {
  const [day, month, year] = d.split('/')
  return new Date(+year, +month - 1, +day).toLocaleDateString('en-AU', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

export function TrackRecord() {
  const [suburbFilter, setSuburbFilter] = useState<string | null>(null)
  const [yearFilter, setYearFilter] = useState<number | null>(null)
  const [selected, setSelected] = useState<Sale | null>(null)

  const suburbs = useMemo(() => getSuburbs(sales), [])
  const years = useMemo(() => getYears(sales), [])

  const visible = useMemo(() =>
    sales.filter(s =>
      s.lat !== null &&
      (!suburbFilter || s.suburb === suburbFilter) &&
      (!yearFilter || getSaleYear(s) === yearFilter)
    ),
    [suburbFilter, yearFilter]
  )

  const points: [number, number][] = visible.map(s => [s.lat!, s.lng!])

  const geocodedTotal = useMemo(() => sales.filter(s => s.lat !== null).length, [])

  // Count for suburb pills respects year filter; count for year pills respects suburb filter
  const suburbCount = (sub: string) =>
    sales.filter(s => s.suburb === sub && s.lat !== null && (!yearFilter || getSaleYear(s) === yearFilter)).length

  const yearCount = (yr: number) =>
    sales.filter(s => getSaleYear(s) === yr && s.lat !== null && (!suburbFilter || s.suburb === suburbFilter)).length

  const brandLabel = [suburbFilter, yearFilter?.toString()].filter(Boolean).join(' · ') || 'Brisbane Inner East'

  const handlePrint = () => window.print()

  return (
    <div className="mc-track-record">
      {/* Header bar */}
      <div className="tr-header">
        <div className="tr-header-left">
          <h1 className="tr-title">Track Record</h1>
          <div className="tr-counter">
            <span className="tr-count">{visible.length}</span>
            <span className="tr-count-label">settled sales</span>
          </div>
        </div>
        <div className="tr-header-right">
          <button className="tr-print-btn" onClick={handlePrint}>
            Export Map
          </button>
        </div>
      </div>

      {/* Suburb filter pills */}
      <div className="tr-filters">
        <button
          className={`tr-filter-pill ${suburbFilter === null ? 'active' : ''}`}
          onClick={() => { setSuburbFilter(null); setSelected(null) }}
        >
          All suburbs ({yearFilter
            ? sales.filter(s => s.lat !== null && getSaleYear(s) === yearFilter).length
            : geocodedTotal})
        </button>
        {suburbs.slice(0, 12).map(sub => (
          <button
            key={sub}
            className={`tr-filter-pill ${suburbFilter === sub ? 'active' : ''}`}
            onClick={() => { setSuburbFilter(sub === suburbFilter ? null : sub); setSelected(null) }}
          >
            {sub} ({suburbCount(sub)})
          </button>
        ))}
      </div>

      {/* Year filter pills */}
      <div className="tr-filters">
        <button
          className={`tr-filter-pill ${yearFilter === null ? 'active' : ''}`}
          onClick={() => { setYearFilter(null); setSelected(null) }}
        >
          All years
        </button>
        {years.map(yr => (
          <button
            key={yr}
            className={`tr-filter-pill ${yearFilter === yr ? 'active' : ''}`}
            onClick={() => { setYearFilter(yr === yearFilter ? null : yr); setSelected(null) }}
          >
            {yr} ({yearCount(yr)})
          </button>
        ))}
      </div>

      {/* Map */}
      <div className="tr-map-wrapper" id="tr-map-printable">
        <MapContainer
          center={[-27.495, 153.065]}
          zoom={12}
          style={{ height: 'calc(100vh - 300px)', width: '100%', background: '#0d0d0d' }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
            subdomains="abcd"
            maxZoom={19}
          />
          <MapFitter points={points} />
          {visible.map((sale, i) => (
            <CircleMarker
              key={`${sale.raw_address}-${i}`}
              center={[sale.lat!, sale.lng!]}
              radius={selected?.raw_address === sale.raw_address ? 9 : 6}
              pathOptions={{
                color: selected?.raw_address === sale.raw_address ? '#fff' : '#0dd8d8',
                fillColor: '#0dd8d8',
                fillOpacity: selected?.raw_address === sale.raw_address ? 1 : 0.75,
                weight: selected?.raw_address === sale.raw_address ? 2 : 1,
              }}
              eventHandlers={{
                click: () => setSelected(
                  selected?.raw_address === sale.raw_address ? null : sale
                ),
              }}
            />
          ))}
        </MapContainer>

        {/* Branding overlay — visible in print */}
        <div className="tr-map-brand">
          <span className="tr-brand-name">Shane Hicks</span>
          <span className="tr-brand-sub">
            {visible.length} settled sales · {brandLabel} · 2016–2026
          </span>
        </div>

        {/* Selected sale popup */}
        {selected && (
          <div className="tr-popup">
            <button className="tr-popup-close" onClick={() => setSelected(null)}>×</button>
            <div className="tr-popup-address">{selected.address}</div>
            <div className="tr-popup-date">Settled {formatDate(selected.settlement_date)}</div>
          </div>
        )}
      </div>
    </div>
  )
}
