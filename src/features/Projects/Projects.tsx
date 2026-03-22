import { useState, useEffect } from 'react'

type Priority = 'high' | 'medium' | 'low'
type Status = 'backlog' | 'in-progress' | 'done'
type Category = 'mc-build' | 'business' | 'personal'

interface Project {
  id: string
  title: string
  description: string
  category: Category
  priority: Priority
  status: Status
  due_date?: string | null
  created_at: string
  updated_at: string
}

const SUPABASE_URL = 'https://zjyrillpennxowntwebo.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpqeXJpbGxwZW5ueG93bnR3ZWJvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MjQzNDA4MiwiZXhwIjoyMDg4MDEwMDgyfQ.qs_YCiL_rfyVVNl2jHyFGDi9lhafOXXSnXjYtogUmXY'

const H = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
}

async function dbFetch(path: string, options?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { ...options, headers: { ...H, ...(options?.headers || {}) } })
  if (!res.ok) throw new Error(await res.text())
  if (res.status === 204) return null
  return res.json()
}

const priorityColors: Record<Priority, string> = {
  high: '#ff6b6b',
  medium: '#ffa502',
  low: '#F59E0B',
}

const categoryLabels: Record<Category, { label: string; color: string }> = {
  'mc-build': { label: 'MC Build', color: '#6c63ff' },
  'business': { label: 'Business', color: '#F59E0B' },
  'personal': { label: 'Personal', color: '#ffa502' },
}

const columns: { id: Status; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
]

const emptyForm = { title: '', description: '', category: 'business' as Category, priority: 'medium' as Priority, status: 'backlog' as Status, due_date: '' }

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  const load = async () => {
    try {
      const data = await dbFetch('/projects?order=created_at.desc')
      setProjects(data || [])
    } catch (e) {
      console.error('Failed to load projects', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const saveProject = async () => {
    if (!form.title.trim()) return
    const payload = {
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date || null,
      updated_at: new Date().toISOString(),
    }
    try {
      if (editingId) {
        await dbFetch(`/projects?id=eq.${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) })
      } else {
        await dbFetch('/projects', { method: 'POST', body: JSON.stringify(payload) })
      }
      await load()
    } catch (e) {
      console.error('Failed to save project', e)
    }
    setForm(emptyForm)
    setEditingId(null)
    setShowForm(false)
  }

  const deleteProject = async (id: string) => {
    await dbFetch(`/projects?id=eq.${id}`, { method: 'DELETE', headers: { Prefer: 'return=minimal' } })
    setProjects(prev => prev.filter(p => p.id !== id))
  }

  const moveProject = async (id: string, status: Status) => {
    await dbFetch(`/projects?id=eq.${id}`, { method: 'PATCH', body: JSON.stringify({ status, updated_at: new Date().toISOString() }) })
    setProjects(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  const startEdit = (p: Project) => {
    setForm({ title: p.title, description: p.description, category: p.category, priority: p.priority, status: p.status, due_date: p.due_date || '' })
    setEditingId(p.id)
    setShowForm(true)
  }

  if (loading) return <div style={{ color: '#a0a0b0', textAlign: 'center', padding: '3rem' }}>Loading projects...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Projects</h2>
          <p style={{ color: '#a0a0b0', margin: '0.25rem 0 0' }}>Hamm + Antonio — experiments & next steps</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm) }}
          style={{ background: '#F59E0B', color: '#080c14', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600' }}>
          + New
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Project title"
            style={{ background: '#0d1320', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#fff', width: '100%', boxSizing: 'border-box' }} />
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description / next steps..." rows={3}
            style={{ background: '#0d1320', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#fff', width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Category })}
              style={{ background: '#0d1320', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', color: '#fff' }}>
              <option value="mc-build">MC Build</option>
              <option value="business">Business</option>
              <option value="personal">Personal</option>
            </select>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })}
              style={{ background: '#0d1320', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', color: '#fff' }}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Status })}
              style={{ background: '#0d1320', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', color: '#fff' }}>
              <option value="backlog">Backlog</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
            <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
              style={{ background: '#0d1320', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', color: '#fff' }} />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={saveProject} style={{ background: '#F59E0B', color: '#080c14', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600' }}>
              {editingId ? 'Update' : 'Add'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null) }}
              style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer' }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {columns.map(col => (
          <div key={col.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1rem', minHeight: '200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a0a0b0' }}>{col.label}</h3>
              <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', color: '#a0a0b0' }}>
                {projects.filter(p => p.status === col.id).length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {projects.filter(p => p.status === col.id).map(p => {
                const cat = categoryLabels[p.category] || { label: p.category, color: '#a0a0b0' }
                const isOverdue = p.due_date && new Date(p.due_date) < new Date() && p.status !== 'done'
                return (
                  <div key={p.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.75rem', borderLeft: `3px solid ${priorityColors[p.priority]}` }}>
                    <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{p.title}</div>
                    {p.description && <div style={{ color: '#a0a0b0', fontSize: '0.8rem', marginBottom: '0.5rem', lineHeight: '1.4' }}>{p.description}</div>}
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      <span style={{ background: `${cat.color}22`, color: cat.color, borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}>{cat.label}</span>
                      <span style={{ background: `${priorityColors[p.priority]}22`, color: priorityColors[p.priority], borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.7rem', textTransform: 'uppercase' }}>{p.priority}</span>
                      {p.due_date && (
                        <span style={{ background: isOverdue ? '#ff6b6b22' : 'rgba(255,255,255,0.06)', color: isOverdue ? '#ff6b6b' : '#a0a0b0', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}>
                          {isOverdue ? '⚠️ ' : '📅 '}{new Date(p.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                        {columns.filter(c => c.id !== col.id).map(c => (
                          <button key={c.id} onClick={() => moveProject(p.id, c.id)} title={`Move to ${c.label}`}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.25rem 0.6rem', color: '#94a3b8', cursor: 'pointer', fontSize: '0.72rem', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                            {c.id === 'in-progress' ? '▶ In Progress' : c.id === 'done' ? '✓ Done' : '← Backlog'}
                          </button>
                        ))}
                      </div>
                      <div style={{ display: 'flex', gap: '0.25rem' }}>
                        <button onClick={() => startEdit(p)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', padding: '0.25rem' }}>✏️</button>
                        <button onClick={() => deleteProject(p.id)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.85rem', padding: '0.25rem' }}>✕</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
