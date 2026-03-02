import { useState, useEffect } from 'react'

type Priority = 'high' | 'medium' | 'low'
type Status = 'backlog' | 'in-progress' | 'done'

interface Project {
  id: string
  title: string
  description: string
  priority: Priority
  status: Status
  createdAt: string
}

const STORAGE_KEY = 'mc_projects'

const priorityColors: Record<Priority, string> = {
  high: '#ff6b6b',
  medium: '#ffa502',
  low: '#00D4AA',
}

const columns: { id: Status; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
]

export function Projects() {
  const [projects, setProjects] = useState<Project[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium' as Priority, status: 'backlog' as Status })

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) setProjects(JSON.parse(saved))
  }, [])

  const save = (updated: Project[]) => {
    setProjects(updated)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  }

  const addProject = () => {
    if (!form.title.trim()) return
    if (editingId) {
      save(projects.map(p => p.id === editingId ? { ...p, ...form } : p))
      setEditingId(null)
    } else {
      save([...projects, { id: crypto.randomUUID(), ...form, createdAt: new Date().toISOString() }])
    }
    setForm({ title: '', description: '', priority: 'medium', status: 'backlog' })
    setShowForm(false)
  }

  const deleteProject = (id: string) => save(projects.filter(p => p.id !== id))

  const moveProject = (id: string, status: Status) => save(projects.map(p => p.id === id ? { ...p, status } : p))

  const startEdit = (p: Project) => {
    setForm({ title: p.title, description: p.description, priority: p.priority, status: p.status })
    setEditingId(p.id)
    setShowForm(true)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0 }}>Projects</h2>
          <p style={{ color: '#a0a0b0', margin: '0.25rem 0 0' }}>Hamm + Antonio — experiments & next steps</p>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm({ title: '', description: '', priority: 'medium', status: 'backlog' }) }}
          style={{ background: '#00D4AA', color: '#050508', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600' }}>
          + New
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Project title" style={{ background: '#0f0f14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#fff', width: '100%', boxSizing: 'border-box' }} />
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description / next steps..." rows={3} style={{ background: '#0f0f14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#fff', width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })} style={{ background: '#0f0f14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', color: '#fff', flex: 1 }}>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="low">Low Priority</option>
            </select>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Status })} style={{ background: '#0f0f14', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', color: '#fff', flex: 1 }}>
              <option value="backlog">Backlog</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={addProject} style={{ background: '#00D4AA', color: '#050508', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600' }}>{editingId ? 'Update' : 'Add'}</button>
            <button onClick={() => { setShowForm(false); setEditingId(null) }} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: 'none', borderRadius: '6px', padding: '0.5rem 1rem', cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {columns.map(col => (
          <div key={col.id} style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '1rem', minHeight: '200px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#a0a0b0' }}>{col.label}</h3>
              <span style={{ background: 'rgba(255,255,255,0.08)', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.75rem', color: '#a0a0b0' }}>
                {projects.filter(p => p.status === col.id).length}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {projects.filter(p => p.status === col.id).map(p => (
                <div key={p.id} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '0.75rem', borderLeft: `3px solid ${priorityColors[p.priority]}` }}>
                  <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.25rem' }}>{p.title}</div>
                  {p.description && <div style={{ color: '#a0a0b0', fontSize: '0.8rem', marginBottom: '0.5rem', lineHeight: '1.4' }}>{p.description}</div>}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                    <span style={{ background: `${priorityColors[p.priority]}22`, color: priorityColors[p.priority], borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.7rem', textTransform: 'uppercase' }}>{p.priority}</span>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {columns.filter(c => c.id !== col.id).map(c => (
                        <button key={c.id} onClick={() => moveProject(p.id, c.id)} title={`Move to ${c.label}`}
                          style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px', padding: '0.1rem 0.4rem', color: '#a0a0b0', cursor: 'pointer', fontSize: '0.7rem' }}>
                          → {c.label}
                        </button>
                      ))}
                      <button onClick={() => startEdit(p)} style={{ background: 'none', border: 'none', color: '#a0a0b0', cursor: 'pointer', fontSize: '0.8rem' }}>✏️</button>
                      <button onClick={() => deleteProject(p.id)} style={{ background: 'none', border: 'none', color: '#ff6b6b', cursor: 'pointer', fontSize: '0.8rem' }}>✕</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
