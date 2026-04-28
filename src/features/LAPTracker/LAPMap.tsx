import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, CircleMarker, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { useLaps } from '@/hooks/useLaps'
import type { Lap } from '@/hooks/useLaps'

// Dot colour by pipeline section
const SECTION_COLORS: Record<string, string> = {
  pipeline_a: '#ef4444',
  pipeline_b: '#EAEAE0',
  pipeline_c: '#60a5fa',
  under_construction: '#a78bfa',
}

const SECTION_LABELS: Record<string, string> = {
  pipeline_a: 'Pipeline A',
  pipeline_b: 'Pipeline B',
  pipeline_c: 'Pipeline C',
  under_construction: 'Under Construction',
}

const STATUSES = ['LAP', 'Listed', 'Sold', 'Withdrawn'] as const
type Status = typeof STATUSES[number]

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ff4444',
  high: '#ff9500',
  normal: '#EAEAE0',
  low: '#666',
}

type Coords = { lat: number; lng: number }
type GeoCache = Record<string, Coords | null>

const CACHE_KEY = 'lap_geocache_v2'

function loadCache(): GeoCache {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') } catch { return {} }
}
function saveCache(c: GeoCache) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)) } catch {}
}

async function geocodeAddress(address: string): Promise<Coords | null> {
  const q = encodeURIComponent(`${address}, Brisbane, Australia`)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=au`,
      { headers: { 'User-Agent': 'MissionControl/1.0 (hicks-real-estate)' } }
    )
    const data = await res.json()
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    return null
  } catch {
    return null
  }
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

// Brisbane inner-east suburb focus
const MAP_CENTER: [number, number] = [-27.49, 153.065]
const MAP_ZOOM = 13

// Fit map to visible markers when they change
function MapFitter({ points }: { points: Coords[] }) {
  const map = useMap()
  useEffect(() => {
    if (!points.length) return
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], MAP_ZOOM)
      return
    }
    const lats = points.map(p => p.lat)
    const lngs = points.map(p => p.lng)
    map.fitBounds(
      [[Math.min(...lats) - 0.005, Math.min(...lngs) - 0.005],
       [Math.max(...lats) + 0.005, Math.max(...lngs) + 0.005]],
      { padding: [40, 40] }
    )
  }, [points.length]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}

function isOverdue(date?: string | null) {
  if (!date) return false
  return new Date(date) < new Date(new Date().toDateString())
}
function isDueSoon(date?: string | null) {
  if (!date) return false
  const d = new Date(date)
  const today = new Date(new Date().toDateString())
  const diff = (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  return diff >= 0 && diff <= 2
}
function formatDate(date?: string | null) {
  if (!date) return null
  return new Date(date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
}

interface Props {
  activeStatus: Status
  onUpdate: (id: string, data: Partial<Lap>) => void
  onDelete: (id: string) => void
}

export function LAPMap({ activeStatus, onUpdate, onDelete }: Props) {
  const { data: allLaps = [] } = useLaps()

  const [coordsMap, setCoordsMap] = useState<Record<string, Coords>>({})
  const [geocoding, setGeocoding] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [selected, setSelected] = useState<Lap | null>(null)
  const [editStatus, setEditStatus] = useState<Status>('LAP')
  const cancelRef = useRef(false)

  // Geocode all laps once (cached in localStorage)
  useEffect(() => {
    if (!allLaps.length) return
    cancelRef.current = false

    const cache = loadCache()
    const uncached = allLaps.filter(l => cache[l.address] === undefined)

    // Load cached coords immediately
    const initial: Record<string, Coords> = {}
    allLaps.forEach(l => { if (cache[l.address]) initial[l.id] = cache[l.address]! })
    setCoordsMap(initial)

    if (!uncached.length) return

    setGeocoding(true)
    setProgress({ done: 0, total: uncached.length })

    ;(async () => {
      const newCache = { ...cache }
      const newCoords = { ...initial }

      for (let i = 0; i < uncached.length; i++) {
        if (cancelRef.current) break
        const lap = uncached[i]
        const result = await geocodeAddress(lap.address)
        newCache[lap.address] = result
        if (result) newCoords[lap.id] = result
        setCoordsMap({ ...newCoords })
        setProgress({ done: i + 1, total: uncached.length })
        if (i < uncached.length - 1) await sleep(1100)
      }

      saveCache(newCache)
      if (!cancelRef.current) setGeocoding(false)
    })()

    return () => { cancelRef.current = true }
  }, [allLaps.length]) // eslint-disable-line react-hooks/exhaustive-deps

  // When activeStatus changes, deselect if selected lap is now hidden
  useEffect(() => {
    if (selected && selected.status !== activeStatus) setSelected(null)
  }, [activeStatus]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync edit status when selection changes
  useEffect(() => {
    if (selected) setEditStatus(selected.status as Status)
  }, [selected?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const visibleLaps = allLaps.filter(l => l.status === activeStatus)
  const visiblePoints = visibleLaps
    .filter(l => coordsMap[l.id])
    .map(l => coordsMap[l.id]!)

  const dotColor = (lap: Lap) =>
    SECTION_COLORS[lap.pipeline_section || ''] || '#888'

  const handleStatusChange = (newStatus: Status) => {
    if (!selected) return
    setEditStatus(newStatus)
    onUpdate(selected.id, { status: newStatus })
    setSelected({ ...selected, status: newStatus })
  }

  const handleDelete = (id: string) => {
    if (!confirm('Delete this LAP?')) return
    onDelete(id)
    setSelected(null)
  }

  return (
    <div style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden' }}>
      {/* Geocoding progress bar */}
      {geocoding && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, zIndex: 1000,
          background: '#0d1320', borderBottom: '1px solid #1a1a24',
          padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <div style={{ flex: 1, height: '4px', background: '#1a1a24', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: '#EAEAE0', borderRadius: '2px',
              width: `${(progress.done / progress.total) * 100}%`,
              transition: 'width 0.3s ease',
            }} />
          </div>
          <span style={{ color: '#a0a0b0', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
            Geocoding {progress.done}/{progress.total}
          </span>
        </div>
      )}

      {/* Legend */}
      <div style={{
        position: 'absolute', bottom: 12, left: 12, zIndex: 1000,
        background: 'rgba(13,19,32,0.92)', border: '1px solid #1a1a24',
        borderRadius: '6px', padding: '0.5rem 0.75rem',
        display: 'flex', flexDirection: 'column', gap: '0.3rem',
      }}>
        {Object.entries(SECTION_COLORS).map(([key, color]) => (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
            <span style={{ color: '#a0a0b0', fontSize: '0.7rem' }}>{SECTION_LABELS[key]}</span>
          </div>
        ))}
      </div>

      <MapContainer
        center={MAP_CENTER}
        zoom={MAP_ZOOM}
        style={{ height: '520px', width: '100%', background: '#0d1320' }}
        zoomControl={true}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />
        <MapFitter points={visiblePoints} />
        {visibleLaps.map(lap => {
          const pos = coordsMap[lap.id]
          if (!pos) return null
          const color = dotColor(lap)
          const isSelected = selected?.id === lap.id
          return (
            <CircleMarker
              key={lap.id}
              center={[pos.lat, pos.lng]}
              radius={isSelected ? 11 : 8}
              pathOptions={{
                color: isSelected ? '#fff' : color,
                fillColor: color,
                fillOpacity: 0.9,
                weight: isSelected ? 2.5 : 1.5,
                opacity: 1,
              }}
              eventHandlers={{
                click: () => setSelected(selected?.id === lap.id ? null : lap),
              }}
            />
          )
        })}
      </MapContainer>

      {/* Selected lap panel */}
      {selected && (
        <div style={{
          position: 'absolute', top: geocoding ? '40px' : 0, right: 0, bottom: 0,
          width: '300px', background: 'rgba(13,19,32,0.97)',
          borderLeft: `3px solid ${dotColor(selected)}`,
          overflowY: 'auto', zIndex: 999, padding: '1.25rem',
          display: 'flex', flexDirection: 'column', gap: '0.9rem',
        }}>
          {/* Close */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <h4 style={{ margin: 0, fontSize: '1rem', lineHeight: 1.3 }}>{selected.client_name}</h4>
                {selected.priority && selected.priority !== 'normal' && (
                  <span style={{
                    fontSize: '0.65rem', padding: '0.1rem 0.35rem', borderRadius: '999px',
                    background: `${PRIORITY_COLORS[selected.priority]}22`,
                    color: PRIORITY_COLORS[selected.priority], fontWeight: 600, textTransform: 'uppercase',
                  }}>{selected.priority}</span>
                )}
              </div>
              <p style={{ margin: '0.2rem 0 0', color: '#a0a0b0', fontSize: '0.8rem' }}>{selected.address}</p>
            </div>
            <button
              onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1.1rem', padding: '0 0 0 0.5rem', lineHeight: 1 }}
            >×</button>
          </div>

          {/* Pipeline section */}
          {selected.pipeline_section && (
            <span style={{
              display: 'inline-block', fontSize: '0.72rem', padding: '0.15rem 0.5rem',
              borderRadius: '999px', background: `${dotColor(selected)}22`, color: dotColor(selected), fontWeight: 600,
            }}>
              {SECTION_LABELS[selected.pipeline_section] || selected.pipeline_section}
            </span>
          )}

          {/* Contact */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {selected.phone && (
              <div>
                <span style={{ color: '#555', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Phone</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.15rem' }}>
                  <span style={{ fontSize: '0.88rem' }}>{selected.phone}</span>
                  <a href={`tel:${selected.phone.replace(/\s/g, '')}`} style={{
                    display: 'inline-flex', alignItems: 'center', padding: '0.15rem 0.5rem',
                    background: '#1a3a2a', border: '1px solid #00ff9d44', borderRadius: '4px',
                    color: '#00ff9d', fontSize: '0.72rem', textDecoration: 'none', fontWeight: 600,
                  }}>📞 Call</a>
                </div>
              </div>
            )}
            {selected.email && (
              <div>
                <span style={{ color: '#555', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</span>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.88rem' }}>{selected.email}</p>
              </div>
            )}
            {selected.price_expectation && (
              <div>
                <span style={{ color: '#555', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Price</span>
                <p style={{ margin: '0.15rem 0 0', fontSize: '0.88rem' }}>{selected.price_expectation}</p>
              </div>
            )}
          </div>

          {/* Follow-up */}
          {selected.follow_up_date && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.25rem 0.6rem', borderRadius: '4px', fontSize: '0.8rem',
              background: isOverdue(selected.follow_up_date) ? '#ff444422'
                : isDueSoon(selected.follow_up_date) ? '#ff950022' : '#ffffff11',
              color: isOverdue(selected.follow_up_date) ? '#ff4444'
                : isDueSoon(selected.follow_up_date) ? '#ff9500' : '#a0a0b0',
              fontWeight: isOverdue(selected.follow_up_date) || isDueSoon(selected.follow_up_date) ? 600 : 400,
            }}>
              {isOverdue(selected.follow_up_date) ? '🔴 Overdue'
                : isDueSoon(selected.follow_up_date) ? '🟡 Due soon' : '📅'} {formatDate(selected.follow_up_date)}
            </div>
          )}

          {/* Next action */}
          {selected.next_action && (
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#EAEAE0' }}>→ {selected.next_action}</p>
          )}

          {/* Notes */}
          {selected.note_text && (
            <div style={{
              padding: '0.65rem', background: '#080c14', borderRadius: '6px',
              fontSize: '0.8rem', color: '#c0c0d0', lineHeight: 1.5,
            }}>
              {selected.note_text}
            </div>
          )}

          {/* Status selector */}
          <div>
            <span style={{ color: '#555', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '0.35rem' }}>Status</span>
            <select
              value={editStatus}
              onChange={e => handleStatusChange(e.target.value as Status)}
              style={{
                width: '100%', padding: '0.5rem', background: '#080c14',
                border: '1px solid #333', borderRadius: '4px', color: '#fff',
                cursor: 'pointer', fontSize: '0.85rem', fontFamily: 'inherit',
              }}
            >
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Delete */}
          <button
            onClick={() => handleDelete(selected.id)}
            style={{
              padding: '0.5rem', background: '#2a1a1a', color: '#ff6b6b',
              border: '1px solid #ff6b6b44', borderRadius: '4px', cursor: 'pointer',
              fontSize: '0.82rem', fontFamily: 'inherit', alignSelf: 'flex-start',
            }}
          >🗑️ Delete</button>
        </div>
      )}
    </div>
  )
}
