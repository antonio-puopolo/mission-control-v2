import { useState } from 'react'
import { useLapsByStatus, useCreateLap, useUpdateLap, useDeleteLap, useLapStatusCounts } from '@/hooks/useLaps'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { LAPMap } from './LAPMap'

const STATUSES = ['LAP', 'Listed', 'Sold', 'Withdrawn'] as const
type Status = typeof STATUSES[number]

const PRIORITIES = ['urgent', 'high', 'normal', 'low'] as const

const STATUS_COLORS: Record<Status, string> = {
  LAP: '#EAEAE0',
  Listed: '#22c55e',
  Sold: '#60a5fa',
  Withdrawn: '#64748b',
}

const PIPELINE_SECTIONS = [
  { value: 'under_construction', label: '🏗️ Under Construction', color: '#a78bfa' },
  { value: 'pipeline_a', label: '🔥 Pipeline A (1–3 months)', color: '#EAEAE0' },
  { value: 'pipeline_b', label: '📋 Pipeline B (3–6 months)', color: '#60a5fa' },
  { value: 'pipeline_c', label: '🕐 Pipeline C (6+ months)', color: '#94a3b8' },
]

function getSectionTag(section?: string | null) {
  return PIPELINE_SECTIONS.find(s => s.value === section) || null
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#f87171',
  high: '#fb923c',
  normal: '#EAEAE0',
  low: '#64748b',
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
  address: string; client_name: string; follow_up_date: string
  phone: string; email: string; price_expectation: string
  priority: string; next_action: string; note_text: string; pipeline_section: string
}

// Shared style tokens
const inputStyle: React.CSSProperties = {
  padding: '0.55rem 0.75rem',
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontFamily: 'inherit',
  fontSize: '0.85rem',
  width: '100%',
}

const fieldLabel: React.CSSProperties = {
  fontSize: '0.67rem',
  fontWeight: 600,
  color: '#555',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  display: 'block',
  marginBottom: '0.3rem',
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

  const save = () => { onUpdate(lap.id, draft); setEditing(false) }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      borderRadius: '12px',
      borderLeft: `3px solid ${priorityColor}`,
      borderRight: '1px solid rgba(255,255,255,0.08)',
      borderBottom: '1px solid rgba(255,255,255,0.08)',
      overflow: 'hidden',
      transition: 'background 0.2s ease',
    }}>
      {/* Header */}
      <div style={{ padding: '1.1rem 1.25rem', cursor: 'pointer' }} onClick={() => !editing && setExpanded(!expanded)}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem', flexWrap: 'wrap' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>{lap.client_name}</h4>
              {lap.priority && lap.priority !== 'normal' && (
                <span style={{
                  fontSize: '0.62rem', padding: '0.1rem 0.4rem', borderRadius: '999px',
                  background: `${priorityColor}20`, color: priorityColor,
                  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>{lap.priority}</span>
              )}
            </div>
            <p style={{ margin: 0, color: '#555', fontSize: '0.8rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lap.address}</p>
            {sectionTag && (
              <span style={{
                display: 'inline-block', marginTop: '0.4rem',
                fontSize: '0.68rem', padding: '0.12rem 0.45rem', borderRadius: '999px',
                background: `${sectionTag.color}18`, color: sectionTag.color, fontWeight: 600,
              }}>{sectionTag.label}</span>
            )}
          </div>
          <span style={{ color: '#334155', fontSize: '0.75rem', marginLeft: '0.5rem', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
        </div>

        {lap.follow_up_date && (
          <div style={{
            marginTop: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
            padding: '0.2rem 0.55rem', borderRadius: '6px', fontSize: '0.75rem',
            background: overdue ? 'rgba(248,113,113,0.12)' : dueSoon ? 'rgba(251,146,60,0.12)' : 'rgba(255,255,255,0.06)',
            color: overdue ? '#f87171' : dueSoon ? '#fb923c' : '#555',
            fontWeight: overdue || dueSoon ? 600 : 400,
          }}>
            {overdue ? '🔴 Overdue' : dueSoon ? '🟡 Due soon' : '📅'} {formatDate(lap.follow_up_date)}
          </div>
        )}

        {lap.next_action && (
          <p style={{ margin: '0.45rem 0 0', fontSize: '0.78rem', color: '#EAEAE0' }}>→ {lap.next_action}</p>
        )}
      </div>

      {/* Expanded */}
      {expanded && (
        <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {!editing ? (
            <div style={{ paddingTop: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                {lap.phone && (
                  <div>
                    <span style={fieldLabel}>Phone</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.88rem' }}>{lap.phone}</span>
                      <a href={`tel:${lap.phone.replace(/\s/g, '')}`} onClick={e => e.stopPropagation()}
                        style={{ padding: '0.15rem 0.5rem', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '5px', color: '#4ade80', fontSize: '0.72rem', textDecoration: 'none', fontWeight: 600 }}>
                        📞 Call
                      </a>
                    </div>
                  </div>
                )}
                {lap.email && <div><span style={fieldLabel}>Email</span><p style={{ margin: 0, fontSize: '0.88rem' }}>{lap.email}</p></div>}
                {lap.price_expectation && <div><span style={fieldLabel}>Price</span><p style={{ margin: 0, fontSize: '0.88rem' }}>{lap.price_expectation}</p></div>}
              </div>

              {lap.note_text && (
                <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '8px', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.55 }}>
                  {lap.note_text}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <select value={lap.status} onChange={(e) => onUpdate(lap.id, { status: e.target.value as Status })} onClick={(e) => e.stopPropagation()}
                  style={{ ...inputStyle, width: 'auto', padding: '0.4rem 0.75rem' }}>
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <button
                  onClick={(e) => { e.stopPropagation(); setDraft({ address: lap.address||'', client_name: lap.client_name||'', follow_up_date: lap.follow_up_date||'', phone: lap.phone||'', email: lap.email||'', price_expectation: lap.price_expectation||'', priority: lap.priority||'normal', next_action: lap.next_action||'', note_text: lap.note_text||'', pipeline_section: lap.pipeline_section||'pipeline_b' }); setEditing(true) }}
                  style={{ padding: '0.4rem 0.9rem', background: 'rgba(245,158,11,0.1)', color: '#EAEAE0', border: '1px solid rgba(245,158,11,0.25)', borderRadius: '7px', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' }}>
                  ✏️ Edit
                </button>
                <button onClick={(e) => { e.stopPropagation(); if (confirm('Delete this LAP?')) onDelete(lap.id) }}
                  style={{ padding: '0.4rem 0.65rem', background: 'rgba(248,113,113,0.08)', color: '#f87171', border: '1px solid rgba(248,113,113,0.2)', borderRadius: '7px', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'inherit' }}>
                  🗑️
                </button>
              </div>
            </div>
          ) : (
            <div style={{ paddingTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                {[
                  { label: 'Client Name', key: 'client_name', placeholder: '' },
                  { label: 'Address', key: 'address', placeholder: '' },
                  { label: 'Phone', key: 'phone', placeholder: '04xx xxx xxx' },
                  { label: 'Email', key: 'email', placeholder: 'client@email.com' },
                  { label: 'Price Expectation', key: 'price_expectation', placeholder: 'e.g. $850K–$900K' },
                  { label: 'Next Action', key: 'next_action', placeholder: 'e.g. Call back Thursday' },
                ].map(({ label, key, placeholder }) => (
                  <div key={key}>
                    <label style={fieldLabel}>{label}</label>
                    <input style={inputStyle} value={(draft as any)[key]} placeholder={placeholder}
                      onChange={e => setDraft({ ...draft, [key]: e.target.value })} />
                  </div>
                ))}
                <div>
                  <label style={fieldLabel}>Follow-up Date</label>
                  <input type="date" style={inputStyle} value={draft.follow_up_date} onChange={e => setDraft({ ...draft, follow_up_date: e.target.value })} />
                </div>
                <div>
                  <label style={fieldLabel}>Priority</label>
                  <select style={inputStyle} value={draft.priority} onChange={e => setDraft({ ...draft, priority: e.target.value })}>
                    {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label style={fieldLabel}>Pipeline Section</label>
                  <select style={inputStyle} value={draft.pipeline_section} onChange={e => setDraft({ ...draft, pipeline_section: e.target.value })}>
                    {PIPELINE_SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={fieldLabel}>Notes</label>
                <textarea style={{ ...inputStyle, minHeight: '75px', resize: 'vertical' }}
                  value={draft.note_text} onChange={e => setDraft({ ...draft, note_text: e.target.value })}
                  placeholder="Notes about this client, conversation, objections…" />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={save} style={{ padding: '0.55rem 1.5rem', background: '#EAEAE0', color: '#06080c', border: 'none', borderRadius: '7px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Save</button>
                <button onClick={() => setEditing(false)} style={{ padding: '0.55rem 1rem', background: 'transparent', color: '#555', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '7px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
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

  const filtered = lapsByStatus.filter(lap =>
    lap.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lap.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const overdueCount = filtered.filter(l => isOverdue((l as any).follow_up_date)).length
  const dueSoonCount = filtered.filter(l => isDueSoon((l as any).follow_up_date)).length

  const handleCreate = async () => {
    if (!newLap.address || !newLap.client_name) return
    try {
      await createAsync({
        address: newLap.address, client_name: newLap.client_name,
        follow_up_date: newLap.follow_up_date || null, phone: newLap.phone || null,
        email: null, price_expectation: null, priority: newLap.priority,
        pipeline_section: newLap.pipeline_section, next_action: null, note_text: null,
        status: 'LAP', notes: {},
      } as any)
      setNewLap({ address: '', client_name: '', follow_up_date: '', phone: '', priority: 'normal', pipeline_section: 'pipeline_b' })
      setIsCreating(false)
    } catch (e) {
      alert('Failed to create LAP. Please try again.')
      console.error(e)
    }
  }

  const createInputStyle: React.CSSProperties = {
    ...inputStyle,
    padding: '0.65rem 0.85rem',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', position: 'relative' }}>

      {/* Toast */}
      {toast && (
        <div onClick={() => setToast(null)} style={{
          position: 'fixed', bottom: '1.5rem', right: '1.5rem', zIndex: 9999,
          padding: '0.75rem 1.25rem', borderRadius: '10px', fontSize: '0.88rem', cursor: 'pointer',
          background: toast.type === 'success' ? 'rgba(34,197,94,0.12)' : 'rgba(248,113,113,0.12)',
          color: toast.type === 'success' ? '#4ade80' : '#f87171',
          border: `1px solid ${toast.type === 'success' ? 'rgba(34,197,94,0.25)' : 'rgba(248,113,113,0.25)'}`,
          backdropFilter: 'blur(16px)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {toast.type === 'success' ? '✓ ' : '✕ '}{toast.message}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#f0f0f0', letterSpacing: '-0.02em' }}>LAP Tracker</h1>
          <p style={{ color: '#64748b', margin: '0.2rem 0 0', fontSize: '0.72rem' }}>Listings · Conversions · Follow-ups</p>
        </div>
        <button onClick={() => setIsCreating(!isCreating)} style={{
          padding: '0.45rem 1rem', background: '#EAEAE0', color: '#06080c',
          border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer',
          fontSize: '0.82rem', whiteSpace: 'nowrap', fontFamily: 'inherit',
        }}>
          {isCreating ? '✕ Cancel' : '+ New LAP'}
        </button>
      </div>

      {/* Attention banner */}
      {(overdueCount > 0 || dueSoonCount > 0) && (
        <div style={{
          padding: '0.65rem 1rem', borderRadius: '10px', display: 'flex', gap: '1rem', flexWrap: 'wrap',
          background: overdueCount > 0 ? 'rgba(248,113,113,0.08)' : 'rgba(251,146,60,0.08)',
          border: `1px solid ${overdueCount > 0 ? 'rgba(248,113,113,0.2)' : 'rgba(251,146,60,0.2)'}`,
        }}>
          {overdueCount > 0 && <span style={{ color: '#f87171', fontWeight: 600, fontSize: '0.85rem' }}>🔴 {overdueCount} overdue follow-up{overdueCount > 1 ? 's' : ''}</span>}
          {dueSoonCount > 0 && <span style={{ color: '#fb923c', fontWeight: 600, fontSize: '0.85rem' }}>🟡 {dueSoonCount} due within 2 days</span>}
        </div>
      )}

      {/* Create Form */}
      {isCreating && (
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px', padding: '1.25rem',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.85rem' }}>
            <input type="text" placeholder="Client Name *" value={newLap.client_name} onChange={e => setNewLap({ ...newLap, client_name: e.target.value })} style={createInputStyle} />
            <input type="text" placeholder="Address *" value={newLap.address} onChange={e => setNewLap({ ...newLap, address: e.target.value })} style={createInputStyle} />
            <input type="text" placeholder="Phone" value={newLap.phone} onChange={e => setNewLap({ ...newLap, phone: e.target.value })} style={createInputStyle} />
            <input type="date" value={newLap.follow_up_date} onChange={e => setNewLap({ ...newLap, follow_up_date: e.target.value })} style={createInputStyle} />
            <select value={newLap.priority} onChange={e => setNewLap({ ...newLap, priority: e.target.value })} style={createInputStyle}>
              {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)} Priority</option>)}
            </select>
            <select value={newLap.pipeline_section} onChange={e => setNewLap({ ...newLap, pipeline_section: e.target.value })} style={createInputStyle}>
              {PIPELINE_SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <button onClick={handleCreate} disabled={isCreatingLap} style={{
              padding: '0.65rem', background: '#EAEAE0', color: '#06080c', border: 'none',
              borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              opacity: isCreatingLap ? 0.5 : 1,
            }}>
              {isCreatingLap ? 'Creating…' : 'Create LAP'}
            </button>
          </div>
        </div>
      )}

      {/* Status Tabs + View Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
        {STATUSES.map(status => (
          <button key={status} onClick={() => setActiveStatus(status)} style={{
            padding: '0.4rem 0.85rem',
            background: activeStatus === status ? 'rgba(255,255,255,0.08)' : 'transparent',
            color: activeStatus === status ? STATUS_COLORS[status] : '#555',
            border: 'none', borderRadius: '8px', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: '0.8rem',
            fontWeight: activeStatus === status ? 600 : 400,
            whiteSpace: 'nowrap', transition: 'all 0.15s ease',
          }}>
            {status} <span style={{ opacity: 0.6, fontSize: '0.74rem' }}>({statusCounts[status] ?? '…'})</span>
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', overflow: 'hidden', flexShrink: 0 }}>
          <button onClick={() => setViewMode('list')} style={{ padding: '0.35rem 0.85rem', background: viewMode === 'list' ? '#EAEAE0' : 'transparent', color: viewMode === 'list' ? '#06080c' : '#555', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit' }}>☰ List</button>
          <button onClick={() => setViewMode('map')} style={{ padding: '0.35rem 0.85rem', background: viewMode === 'map' ? '#EAEAE0' : 'transparent', color: viewMode === 'map' ? '#06080c' : '#555', border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, fontFamily: 'inherit' }}>⊙ Map</button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text" placeholder="Search by address or client name…"
        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
        style={{ ...inputStyle, padding: '0.7rem 1rem', borderRadius: '10px', fontSize: '0.85rem' }}
      />

      {/* Map or List */}
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))', gap: '0.85rem' }}>
          {isLoading ? (
            <p style={{ color: '#555' }}>Loading…</p>
          ) : filtered.length === 0 ? (
            <p style={{ color: '#555' }}>No LAPs in {activeStatus} status</p>
          ) : (
            filtered.map(lap => (
              <LapCard
                key={lap.id} lap={lap as any}
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
