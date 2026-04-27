import { useState } from 'react'
import { useLapsByStatus, useCreateLap, useUpdateLap, useDeleteLap, useLapStatusCounts } from '@/hooks/useLaps'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { LAPMap } from './LAPMap'

const STATUSES = ['LAP', 'Listed', 'Sold', 'Withdrawn'] as const
type Status = typeof STATUSES[number]

const PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const

const PIPELINE_SECTIONS = [
  { value: 'under_construction', label: '🏗️ Under Construction', color: '#a78bfa' },
  { value: 'pipeline_a', label: '🔥 Pipeline A (1–3 months)', color: '#F59E0B' },
  { value: 'pipeline_b', label: '📋 Pipeline B (3–6 months)', color: '#60a5fa' },
  { value: 'pipeline_c', label: '🕐 Pipeline C (6+ months)', color: '#f59e0b' },
]

function getSectionTag(section?: string | null) {
  return PIPELINE_SECTIONS.find(s => s.value === section) || null
}
const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#ff4444',
  high: '#ff9500',
  normal: '#F59E0B',
  low: '#666',
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

interface Lap {
  id: string
  address: string
  client_name: string
  status: Status
  follow_up_date?: string | null
  phone?: string | null
  email?: string | null
  price_expectation?: string | null
  priority?: string | null
  next_action?: string | null
  note_text?: string | null
  pipeline_section?: string | null
  created_at?: string
}

interface EditState {
  address: string
  client_name: string
  follow_up_date: string
  phone: string
  email: string
  price_expectation: string
  priority: string
  next_action: string
  note_text: string
  pipeline_section: string
}

function LapCard({ lap, onUpdate, onDelete }: {
  lap: Lap
  onUpdate: (id: string, data: Partial<Lap>) => void
  onDelete: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<EditState>({
    address: lap.address || '',
    client_name: lap.client_name || '',
    follow_up_date: lap.follow_up_date || '',
    phone: lap.phone || '',
    email: lap.email || '',
    price_expectation: lap.price_expectation || '',
    priority: lap.priority || 'normal',
    next_action: lap.next_action || '',
    note_text: lap.note_text || '',
    pipeline_section: lap.pipeline_section || 'pipeline_b',
  })

  const overdue = isOverdue(lap.follow_up_date)
  const dueSoon = isDueSoon(lap.follow_up_date)
  const priorityColor = PRIORITY_COLORS[lap.priority || 'normal']
  const sectionTag = getSectionTag(lap.pipeline_section)

  const save = () => {
    onUpdate(lap.id, draft)
    setEditing(false)
  }

  const inputStyle = {
    padding: '0.5rem',
    background: '#080c14',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#fff',
    fontFamily: 'inherit',
    fontSize: '0.85rem',
    width: '100%',
  }

  return (
    <div style={{
      background: '#0d1320',
      borderRadius: '8px',
      borderLeft: `4px solid ${priorityColor}`,
      overflow: 'hidden',
      transition: 'all 0.2s ease',
    }}>
      {/* Card Header - always visible */}
      <div
        style={{ padding: '1.25rem', cursor: 'pointer' }}
        onClick={() => !editing && setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h4 style={{ margin: 0, fontSize: '1rem' }}>{lap.client_name}</h4>
              {lap.priority && lap.priority !== 'normal' && (
                <span style={{
                  fontSize: '0.7rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '999px',
                  background: `${priorityColor}22`,
                  color: priorityColor,
                  fontWeight: 600,
                  textTransform: 'uppercase',
                }}>
                  {lap.priority}
                </span>
              )}
            </div>
            <p style={{ margin: 0, color: '#a0a0b0', fontSize: '0.85rem' }}>{lap.address}</p>
            {sectionTag && (
              <span style={{ display: 'inline-block', marginTop: '0.4rem', fontSize: '0.72rem', padding: '0.15rem 0.5rem', borderRadius: '999px', background: `${sectionTag.color}22`, color: sectionTag.color, fontWeight: 600 }}>
                {sectionTag.label}
              </span>
            )}
          </div>
          <span style={{ color: '#555', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{expanded ? '▲' : '▼'}</span>
        </div>

        {/* Follow-up badge */}
        {lap.follow_up_date && (
          <div style={{
            marginTop: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.25rem 0.6rem',
            borderRadius: '4px',
            fontSize: '0.8rem',
            background: overdue ? '#ff444422' : dueSoon ? '#ff950022' : '#ffffff11',
            color: overdue ? '#ff4444' : dueSoon ? '#ff9500' : '#a0a0b0',
            fontWeight: overdue || dueSoon ? 600 : 400,
          }}>
            {overdue ? '🔴 Overdue' : dueSoon ? '🟡 Due soon'  : '📅'} {formatDate(lap.follow_up_date)}
          </div>
        )}

        {lap.next_action && (
          <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', color: '#F59E0B' }}>
            → {lap.next_action}
          </p>
        )}
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid #1a1a24' }}>
          {!editing ? (
            // View mode
            <div style={{ paddingTop: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                {lap.phone && <div><span style={{ color: '#666', fontSize: '0.75rem' }}>PHONE</span><div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }}><p style={{ margin: 0, fontSize: '0.9rem' }}>{lap.phone}</p><a href={`tel:${lap.phone.replace(/\s/g, '')}`} onClick={e => e.stopPropagation()} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.2rem 0.6rem', background: '#1a3a2a', border: '1px solid #00ff9d44', borderRadius: '4px', color: '#00ff9d', fontSize: '0.75rem', textDecoration: 'none', fontWeight: 600, letterSpacing: '0.03em' }}>📞 Call</a></div></div>}
                {lap.email && <div><span style={{ color: '#666', fontSize: '0.75rem' }}>EMAIL</span><p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem' }}>{lap.email}</p></div>}
                {lap.price_expectation && <div><span style={{ color: '#666', fontSize: '0.75rem' }}>PRICE EXPECTATION</span><p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem' }}>{lap.price_expectation}</p></div>}
              </div>

              {lap.note_text && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: '#0d1320', borderRadius: '6px', fontSize: '0.85rem', color: '#c0c0d0', lineHeight: 1.5 }}>
                  {lap.note_text}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select
                  value={lap.status}
                  onChange={(e) => onUpdate(lap.id, { status: e.target.value as Status })}
                  onClick={(e) => e.stopPropagation()}
                  style={{ padding: '0.5rem', background: '#0d1320', border: '1px solid #333', borderRadius: '4px', color: '#fff', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>

                <button
                  onClick={(e) => { e.stopPropagation(); setDraft({ address: lap.address||'', client_name: lap.client_name||'', follow_up_date: lap.follow_up_date||'', phone: lap.phone||'', email: lap.email||'', price_expectation: lap.price_expectation||'', priority: lap.priority||'normal', next_action: lap.next_action||'', note_text: lap.note_text||'', pipeline_section: lap.pipeline_section||'pipeline_b' }); setEditing(true) }}
                  style={{ padding: '0.5rem 1rem', background: '#1a2a3a', color: '#F59E0B', border: '1px solid #F59E0B44', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  ✏️ Edit
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); if (confirm('Delete this LAP?')) onDelete(lap.id) }}
                  style={{ padding: '0.5rem 0.75rem', background: '#2a1a1a', color: '#ff6b6b', border: '1px solid #ff6b6b44', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  🗑️
                </button>
              </div>
            </div>
          ) : (
            // Edit mode
            <div style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>CLIENT NAME</label>
                  <input style={inputStyle} value={draft.client_name} onChange={e => setDraft({...draft, client_name: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>ADDRESS</label>
                  <input style={inputStyle} value={draft.address} onChange={e => setDraft({...draft, address: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>PHONE</label>
                  <input style={inputStyle} value={draft.phone} onChange={e => setDraft({...draft, phone: e.target.value})} placeholder="04xx xxx xxx" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>EMAIL</label>
                  <input style={inputStyle} value={draft.email} onChange={e => setDraft({...draft, email: e.target.value})} placeholder="client@email.com" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>PRICE EXPECTATION</label>
                  <input style={inputStyle} value={draft.price_expectation} onChange={e => setDraft({...draft, price_expectation: e.target.value})} placeholder="e.g. $850K–$900K" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>FOLLOW-UP DATE</label>
                  <input type="date" style={inputStyle} value={draft.follow_up_date} onChange={e => setDraft({...draft, follow_up_date: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>PRIORITY</label>
                  <select style={inputStyle} value={draft.priority} onChange={e => setDraft({...draft, priority: e.target.value})}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>NEXT ACTION</label>
                  <input style={inputStyle} value={draft.next_action} onChange={e => setDraft({...draft, next_action: e.target.value})} placeholder="e.g. Call back Thursday" />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>PIPELINE SECTION</label>
                  <select style={inputStyle} value={draft.pipeline_section} onChange={e => setDraft({...draft, pipeline_section: e.target.value})}>
                    {PIPELINE_SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#666', display: 'block', marginBottom: '0.25rem' }}>NOTES</label>
                <textarea
                  style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
                  value={draft.note_text}
                  onChange={e => setDraft({...draft, note_text: e.target.value})}
                  placeholder="Any notes about this client, conversation, objections..."
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={save} style={{ padding: '0.6rem 1.5rem', background: '#F59E0B', color: '#000', border: 'none', borderRadius: '4px', fontWeight: 600, cursor: 'pointer' }}>
                  Save
                </button>
                <button onClick={() => setEditing(false)} style={{ padding: '0.6rem 1rem', background: 'transparent', color: '#a0a0b0', border: '1px solid #333', borderRadius: '4px', cursor: 'pointer' }}>
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function LAPTracker() {
  const [activeStatus, setActiveStatus] = useState<Status>('LAP')
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list')
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newLap, setNewLap] = useState({ address: '', client_name: '', follow_up_date: '', phone: '', priority: 'normal', pipeline_section: 'pipeline_b' })

  useRealtimeSync('laps', ['laps'])

  const { data: lapsByStatus = [], isLoading } = useLapsByStatus(activeStatus)
  const { data: statusCounts = {} } = useLapStatusCounts()
  const { mutateAsync: createAsync, isPending: isCreatingLap } = useCreateLap()
  const updateMutation = useUpdateLap()
  const deleteMutation = useDeleteLap()
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const filtered = lapsByStatus.filter(
    (lap) =>
      lap.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lap.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Count overdue/due soon across all visible
  const overdueCount = filtered.filter(l => isOverdue((l as any).follow_up_date)).length
  const dueSoonCount = filtered.filter(l => isDueSoon((l as any).follow_up_date)).length

  const handleCreate = async () => {
    if (!newLap.address || !newLap.client_name) return
    try {
      await createAsync({
        address: newLap.address,
        client_name: newLap.client_name,
        follow_up_date: newLap.follow_up_date || null,
        phone: newLap.phone || null,
        email: null,
        price_expectation: null,
        priority: newLap.priority,
        pipeline_section: newLap.pipeline_section,
        next_action: null,
        note_text: null,
        status: 'LAP',
        notes: {},
      } as any)
      setNewLap({ address: '', client_name: '', follow_up_date: '', phone: '', priority: 'normal', pipeline_section: 'pipeline_b' })
      setIsCreating(false)
    } catch (e) {
      alert('Failed to create LAP. Please try again.')
      console.error(e)
    }
  }

  const inputStyle = {
    padding: '0.75rem',
    background: '#0d1320',
    border: '1px solid #333',
    borderRadius: '4px',
    color: '#fff',
    fontFamily: 'inherit',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', position: 'relative' }}>
      {/* Toast notification */}
      {toast && (
        <div
          style={{
            position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
            padding: '0.75rem 1.25rem', borderRadius: '8px', fontSize: '0.9rem',
            background: toast.type === 'success' ? '#065f46' : '#7f1d1d',
            color: toast.type === 'success' ? '#a7f3d0' : '#fca5a5',
            border: `1px solid ${toast.type === 'success' ? '#059669' : '#dc2626'}`,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', cursor: 'pointer',
          }}
          onClick={() => setToast(null)}
        >
          {toast.type === 'success' ? '✅ ' : '❌ '}{toast.message}
        </div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>LAP Tracker</h3>
          <p style={{ color: '#475569', margin: '0.15rem 0 0', fontSize: '0.72rem' }}>Listings • Conversions • Follow-ups</p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          style={{ padding: '0.5rem 1.1rem', background: '#F59E0B', color: '#000', border: 'none', borderRadius: '8px', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
        >
          {isCreating ? '✕ Cancel' : '+ New LAP'}
        </button>
      </div>

      {/* Attention banner */}
      {(overdueCount > 0 || dueSoonCount > 0) && (
        <div style={{ padding: '0.75rem 1.25rem', borderRadius: '8px', background: overdueCount > 0 ? '#ff444415' : '#ff950015', border: `1px solid ${overdueCount > 0 ? '#ff444433' : '#ff950033'}`, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {overdueCount > 0 && <span style={{ color: '#ff4444', fontWeight: 600 }}>🔴 {overdueCount} overdue follow-up{overdueCount > 1 ? 's' : ''}</span>}
          {dueSoonCount > 0 && <span style={{ color: '#ff9500', fontWeight: 600 }}>🟡 {dueSoonCount} due within 2 days</span>}
        </div>
      )}

      {/* Create Form */}
      {isCreating && (
        <div style={{ background: '#0d1320', padding: '1.5rem', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
            <input type="text" placeholder="Client Name *" value={newLap.client_name} onChange={(e) => setNewLap({ ...newLap, client_name: e.target.value })} style={inputStyle} />
            <input type="text" placeholder="Address *" value={newLap.address} onChange={(e) => setNewLap({ ...newLap, address: e.target.value })} style={inputStyle} />
            <input type="text" placeholder="Phone" value={newLap.phone} onChange={(e) => setNewLap({ ...newLap, phone: e.target.value })} style={inputStyle} />
            <input type="date" value={newLap.follow_up_date} onChange={(e) => setNewLap({ ...newLap, follow_up_date: e.target.value })} style={inputStyle} />
            <select value={newLap.priority} onChange={(e) => setNewLap({ ...newLap, priority: e.target.value })} style={inputStyle}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)} Priority</option>)}
            </select>
            <select value={newLap.pipeline_section} onChange={(e) => setNewLap({ ...newLap, pipeline_section: e.target.value })} style={inputStyle}>
              {PIPELINE_SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button onClick={handleCreate} disabled={isCreatingLap} style={{ padding: '0.75rem', background: '#F59E0B', color: '#000', border: 'none', borderRadius: '4px', fontWeight: '600', cursor: 'pointer', opacity: isCreatingLap ? 0.5 : 1 }}>
              {isCreatingLap ? 'Creating...' : 'Create LAP'}
            </button>
          </div>
        </div>
      )}

      {/* Status Tabs + View Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid #333', paddingBottom: '1rem', flexWrap: 'wrap' }}>
        {STATUSES.map((status) => (
          <button key={status} onClick={() => setActiveStatus(status)} style={{
            padding: "0.5rem 1rem",
            background: activeStatus === status ? "rgba(245,158,11,0.15)" : "transparent",
            color: activeStatus === status ? "#F59E0B" : "#a0a0b0",
            border: "none",
            cursor: "pointer",
            borderBottom: activeStatus === status ? "2px solid #F59E0B" : "2px solid transparent",
            transition: "all 0.2s ease",
            fontFamily: "inherit",
            fontSize: "0.85rem",
            whiteSpace: "nowrap",
          }}>
            {status} <span style={{ opacity: 0.7, fontSize: "0.78rem" }}>({statusCounts[status] ?? "…"})</span>
          </button>
        ))}
        {/* View toggle — sits at end of tab row */}
        <div style={{ marginLeft: 'auto', display: 'flex', background: '#0d1320', border: '1px solid #333', borderRadius: '6px', overflow: 'hidden', flexShrink: 0 }}>
          <button
            onClick={() => setViewMode('list')}
            style={{ padding: '0.4rem 0.9rem', background: viewMode === 'list' ? '#F59E0B' : 'transparent', color: viewMode === 'list' ? '#000' : '#a0a0b0', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'inherit' }}
          >☰ List</button>
          <button
            onClick={() => setViewMode('map')}
            style={{ padding: '0.4rem 0.9rem', background: viewMode === 'map' ? '#F59E0B' : 'transparent', color: viewMode === 'map' ? '#000' : '#a0a0b0', border: 'none', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700, fontFamily: 'inherit' }}
          >⊙ Map</button>
        </div>
      </div>

      {/* Search */}
      <input type="text" placeholder="Search by address or client name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ padding: '0.75rem 1rem', background: '#0d1320', border: '1px solid #333', borderRadius: '4px', color: '#fff', fontFamily: 'inherit', width: '100%' }} />

      {/* Map or List view */}
      {viewMode === 'map' ? (
        <LAPMap
          activeStatus={activeStatus}
          onUpdate={(id, data) => updateMutation.mutate({ id, ...data } as any)}
          onDelete={(id) => deleteMutation.mutate(id, {
            onSuccess: () => setToast({ message: 'LAP deleted', type: 'success' }),
            onError: (err) => setToast({ message: `Delete failed: ${err.message}`, type: 'error' }),
          })}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '1rem' }}>
          {isLoading ? (
            <p style={{ color: '#a0a0b0' }}>Loading...</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: '#a0a0b0' }}>No LAPs in {activeStatus} status</p>
          ) : (
            filtered.map((lap) => (
              <LapCard
                key={lap.id}
                lap={lap as any}
                onUpdate={(id, data) => updateMutation.mutate({ id, ...data } as any)}
                onDelete={(id) => deleteMutation.mutate(id, {
                  onSuccess: () => setToast({ message: 'LAP deleted', type: 'success' }),
                  onError: (err) => setToast({ message: `Delete failed: ${err.message}`, type: 'error' }),
                })}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
