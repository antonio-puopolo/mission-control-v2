import { useState, useEffect, useRef } from 'react'
import { HammBoard } from './HammBoard'

type Priority = 'high' | 'medium' | 'low'
type Status = 'backlog' | 'in-progress' | 'done' | 'archive'
type Category = 'mc-build' | 'business' | 'personal' | 'hamm'
type Owner = 'antonio' | 'hamm' | null
type ViewType = 'hamm' | 'kanban'

interface ChecklistItem {
  id: string
  project_id: string
  task: string
  completed: boolean
  task_order: number
  created_at: string
  updated_at: string
}

interface ProjectPlan {
  id: string
  project_id: string
  plan_steps: string[]
  created_at: string
  updated_at: string
}

interface Project {
  id: string
  title: string
  description: string
  category: Category
  priority: Priority
  status: Status
  owner: Owner
  due_date?: string | null
  created_at: string
  updated_at: string
  plan?: ProjectPlan | null
  checklist?: ChecklistItem[]
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

const H = {
  'apikey': SUPABASE_KEY,
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
  high: '#f87171',
  medium: '#fb923c',
  low: '#F59E0B',
}

const categoryLabels: Record<Category, { label: string; color: string }> = {
  'mc-build': { label: 'MC Build', color: '#60a5fa' },
  'business': { label: 'Business', color: '#F59E0B' },
  'personal': { label: 'Personal', color: '#ffa502' },
  'hamm': { label: 'Hamm 🐷', color: '#F97316' },
}

const columns: { id: Status; label: string }[] = [
  { id: 'backlog', label: 'Backlog' },
  { id: 'in-progress', label: 'In Progress' },
  { id: 'done', label: 'Done' },
  { id: 'archive', label: 'Archive' },
]


const emptyForm = {
  title: '',
  description: '',
  category: 'business' as Category,
  priority: 'medium' as Priority,
  status: 'backlog' as Status,
  owner: null as Owner,
  due_date: '',
  planStepsText: '',
  checklistText: '',
}

function OwnerBadge({ owner }: { owner: Owner }) {
  if (!owner) return null
  const isAntonio = owner === 'antonio'
  return (
    <span style={{
      background: isAntonio ? 'rgba(96, 165, 250, 0.15)' : 'rgba(249, 115, 22, 0.15)',
      color: isAntonio ? '#60a5fa' : '#F97316',
      borderRadius: '4px',
      padding: '0.1rem 0.4rem',
      fontSize: '0.7rem',
      fontWeight: '600',
    }}>
      {isAntonio ? '👤 Antonio' : '🐷 Hamm'}
    </span>
  )
}

function PlanSection({ steps }: { steps: string[] }) {
  const [expanded, setExpanded] = useState(false)
  if (!steps || steps.length === 0) return null
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          background: 'none',
          border: 'none',
          color: '#94a3b8',
          cursor: 'pointer',
          fontSize: '0.75rem',
          padding: '0',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          fontFamily: 'inherit',
        }}
      >
        <span style={{ transform: expanded ? 'rotate(90deg)' : 'none', display: 'inline-block', transition: 'transform 0.15s' }}>▶</span>
        Plan ({steps.length} steps)
      </button>
      {expanded && (
        <ol style={{ margin: '0.4rem 0 0 1rem', padding: 0, color: '#94a3b8', fontSize: '0.78rem', lineHeight: '1.6' }}>
          {steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      )}
    </div>
  )
}

function ChecklistSection({ items, onToggle }: { items: ChecklistItem[]; onToggle: (id: string, completed: boolean) => void }) {
  if (!items || items.length === 0) return null
  const done = items.filter(i => i.completed).length
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        Checklist {done}/{items.length}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {[...items].sort((a, b) => a.task_order - b.task_order).map(item => (
          <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
            <input
              type="checkbox"
              checked={item.completed}
              onChange={() => onToggle(item.id, !item.completed)}
              style={{ cursor: 'pointer', accentColor: '#4ade80' }}
            />
            <span style={{ color: item.completed ? '#4ade80' : '#cbd5e1', textDecoration: item.completed ? 'line-through' : 'none', opacity: item.completed ? 0.7 : 1 }}>
              {item.task}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

export function Projects() {
  const [view, setView] = useState<ViewType>('kanban')
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [archiveCollapsed, setArchiveCollapsed] = useState(true)
  const [dragOverCol, setDragOverCol] = useState<Status | null>(null)
  const dragProjectId = useRef<string | null>(null)

  const load = async () => {
    try {
      const [data, plans, checklist] = await Promise.all([
        dbFetch('/projects?order=created_at.desc'),
        dbFetch('/projects_plans?select=*'),
        dbFetch('/projects_checklist?select=*&order=task_order.asc'),
      ])

      const enriched = (data || []).map((p: Project) => ({
        ...p,
        plan: (plans || []).find((pl: ProjectPlan) => pl.project_id === p.id) || null,
        checklist: (checklist || []).filter((c: ChecklistItem) => c.project_id === p.id),
      }))
      setProjects(enriched)
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
      owner: form.owner || null,
      due_date: form.due_date || null,
      updated_at: new Date().toISOString(),
    }
    try {
      let projectId = editingId
      if (editingId) {
        await dbFetch(`/projects?id=eq.${editingId}`, { method: 'PATCH', body: JSON.stringify(payload) })
      } else {
        const created = await dbFetch('/projects', { method: 'POST', body: JSON.stringify(payload) })
        projectId = created?.[0]?.id
      }

      if (projectId) {
        const steps = form.planStepsText
          .split('\n')
          .map(s => s.trim())
          .filter(Boolean)

        const existingPlans = await dbFetch(`/projects_plans?project_id=eq.${projectId}`)
        if (existingPlans?.length > 0) {
          await dbFetch(`/projects_plans?project_id=eq.${projectId}`, {
            method: 'PATCH',
            body: JSON.stringify({ plan_steps: steps, updated_at: new Date().toISOString() }),
          })
        } else if (steps.length > 0) {
          await dbFetch('/projects_plans', {
            method: 'POST',
            body: JSON.stringify({ project_id: projectId, plan_steps: steps }),
          })
        }

        const tasks = form.checklistText
          .split('\n')
          .map(t => t.trim())
          .filter(Boolean)

        await dbFetch(`/projects_checklist?project_id=eq.${projectId}`, {
          method: 'DELETE',
          headers: { Prefer: 'return=minimal' },
        })

        if (tasks.length > 0) {
          const checklistPayload = tasks.map((task, i) => ({
            project_id: projectId,
            task,
            completed: false,
            task_order: i,
          }))
          await dbFetch('/projects_checklist', {
            method: 'POST',
            body: JSON.stringify(checklistPayload),
          })
        }
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

  const toggleChecklist = async (itemId: string, completed: boolean) => {
    try {
      await dbFetch(`/projects_checklist?id=eq.${itemId}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed, updated_at: new Date().toISOString() }),
      })
      setProjects(prev => prev.map(p => ({
        ...p,
        checklist: (p.checklist || []).map(c =>
          c.id === itemId ? { ...c, completed } : c
        ),
      })))
    } catch (e) {
      console.error('Failed to toggle checklist item', e)
    }
  }

  const startEdit = (p: Project) => {
    setForm({
      title: p.title,
      description: p.description,
      category: p.category,
      priority: p.priority,
      status: p.status,
      owner: p.owner || null,
      due_date: p.due_date || '',
      planStepsText: (p.plan?.plan_steps || []).join('\n'),
      checklistText: (p.checklist || [])
        .sort((a, b) => a.task_order - b.task_order)
        .map(c => c.task)
        .join('\n'),
    })
    setEditingId(p.id)
    setShowForm(true)
  }

  // Drag handlers
  const onDragStart = (projectId: string) => {
    dragProjectId.current = projectId
  }

  const onDragOver = (e: React.DragEvent, colId: Status) => {
    e.preventDefault()
    setDragOverCol(colId)
  }

  const onDrop = async (colId: Status) => {
    if (dragProjectId.current && dragProjectId.current !== colId) {
      const proj = projects.find(p => p.id === dragProjectId.current)
      if (proj && proj.status !== colId) {
        await moveProject(dragProjectId.current, colId)
        // Auto-expand archive if dropping into it
        if (colId === 'archive') setArchiveCollapsed(false)
      }
    }
    dragProjectId.current = null
    setDragOverCol(null)
  }

  const onDragEnd = () => {
    dragProjectId.current = null
    setDragOverCol(null)
  }

  if (loading) return <div style={{ color: '#94a3b8', textAlign: 'center', padding: '3rem' }}>Loading projects...</div>

  // Hamm Board view
  if (view === 'hamm') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Projects</h3>
            <p style={{ color: '#475569', margin: '0.15rem 0 0', fontSize: '0.72rem' }}>Hamm × Antonio — experiments & builds</p>
          </div>
          <button
            onClick={() => setView('kanban')}
            style={{ background: 'rgba(255,255,255,0.07)', color: '#94a3b8', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          >
            ⊞ Kanban View
          </button>
        </div>
        <HammBoard />
      </div>
    )
  }

  // Kanban view
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Projects</h3>
          <p style={{ color: '#475569', margin: '0.15rem 0 0', fontSize: '0.72rem' }}>Hamm × Antonio — experiments & builds</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={() => setView('hamm')}
            style={{ background: 'rgba(255,255,255,0.07)', color: '#94a3b8', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
          >
            🐷 Board
          </button>
          <button onClick={() => { setShowForm(!showForm); setEditingId(null); setForm(emptyForm) }}
            style={{ background: '#F59E0B', color: '#000', border: 'none', borderRadius: '8px', padding: '0.5rem 1.1rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>
            + New
          </button>
        </div>
      </div>

      {/* New/Edit Form */}
      {showForm && (
        <div style={{ background: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(32px) saturate(1.8)', WebkitBackdropFilter: 'blur(32px) saturate(1.8)', border: '1px solid rgba(255,255,255,0.09)', borderTop: '1px solid rgba(255,255,255,0.18)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.10), 0 4px 20px rgba(0,0,0,0.4)', borderRadius: '10px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Project title"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#f1f5f9', width: '100%', boxSizing: 'border-box' }} />
          <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Description / next steps..." rows={3}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#f1f5f9', width: '100%', boxSizing: 'border-box', resize: 'vertical' }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value as Category })}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', color: '#f1f5f9' }}>
              <option value="mc-build">MC Build</option>
              <option value="business">Business</option>
              <option value="personal">Personal</option>
              <option value="hamm">Hamm 🐷</option>
            </select>
            <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as Priority })}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', color: '#f1f5f9' }}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Status })}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', color: '#f1f5f9' }}>
              <option value="backlog">Backlog</option>
              <option value="in-progress">In Progress</option>
              <option value="done">Done</option>
              <option value="archive">Archive</option>
            </select>
            <select value={form.owner || ''} onChange={e => setForm({ ...form, owner: (e.target.value || null) as Owner })}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', color: '#f1f5f9' }}>
              <option value="">No owner</option>
              <option value="antonio">👤 Antonio</option>
              <option value="hamm">🐷 Hamm</option>
            </select>
            <input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem', color: '#f1f5f9' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Plan Steps (one per line)
            </label>
            <textarea
              value={form.planStepsText}
              onChange={e => setForm({ ...form, planStepsText: e.target.value })}
              placeholder="Step 1: Do this&#10;Step 2: Then this&#10;Step 3: Finally this"
              rows={4}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#f1f5f9', width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: '0.85rem' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Checklist (one task per line)
            </label>
            <textarea
              value={form.checklistText}
              onChange={e => setForm({ ...form, checklistText: e.target.value })}
              placeholder="Write the brief&#10;Get sign-off&#10;Send to client"
              rows={4}
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', padding: '0.5rem 0.75rem', color: '#f1f5f9', width: '100%', boxSizing: 'border-box', resize: 'vertical', fontSize: '0.85rem' }}
            />
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

      {/* Kanban Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', alignItems: 'start' }}>
        {columns.map(col => {
          const colProjects = projects.filter(p => p.status === col.id)
          const isArchive = col.id === 'archive'
          const isDragOver = dragOverCol === col.id

          return (
            <div
              key={col.id}
              onDragOver={e => onDragOver(e, col.id)}
              onDrop={() => onDrop(col.id)}
              style={{
                background: isDragOver
                  ? (isArchive ? 'rgba(100, 116, 139, 0.12)' : 'rgba(255,255,255,0.05)')
                  : 'rgba(255,255,255,0.04)',
                border: isDragOver
                  ? `1px solid ${isArchive ? '#64748b' : 'rgba(255,255,255,0.2)'}`
                  : '1px solid rgba(255,255,255,0.09)',
                borderRadius: '10px',
                padding: '1rem',
                minHeight: '200px',
                transition: 'background 0.15s, border-color 0.15s',
              }}
            >
              {/* Column Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isArchive && archiveCollapsed ? 0 : '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isArchive && (
                    <button
                      onClick={() => setArchiveCollapsed(c => !c)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#64748b',
                        cursor: 'pointer',
                        padding: '0',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ display: 'inline-block', transform: archiveCollapsed ? 'none' : 'rotate(90deg)', transition: 'transform 0.15s' }}>▶</span>
                    </button>
                  )}
                  <h3 style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: isArchive ? '#64748b' : '#94a3b8',
                  }}>
                    {isArchive ? '🗄 ' : ''}{col.label}
                  </h3>
                </div>
                <span style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderRadius: '999px',
                  padding: '0.1rem 0.5rem',
                  fontSize: '0.75rem',
                  color: isArchive ? '#64748b' : '#94a3b8',
                }}>
                  {colProjects.length}
                </span>
              </div>

              {/* Cards */}
              {(!isArchive || !archiveCollapsed) && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {colProjects.map(p => {
                    const cat = categoryLabels[p.category] || { label: p.category, color: '#94a3b8' }
                    const isOverdue = p.due_date && new Date(p.due_date) < new Date() && p.status !== 'done' && p.status !== 'archive'
                    const lastUpdated = new Date(p.updated_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })
                    return (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={() => onDragStart(p.id)}
                        onDragEnd={onDragEnd}
                        style={{
                          background: isArchive ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '8px',
                          padding: '0.75rem',
                          borderLeft: `3px solid ${isArchive ? '#475569' : priorityColors[p.priority]}`,
                          cursor: 'grab',
                          opacity: isArchive ? 0.75 : 1,
                          transition: 'opacity 0.15s',
                        }}
                      >
                        <div style={{ fontWeight: '600', fontSize: '0.9rem', marginBottom: '0.25rem', color: isArchive ? '#64748b' : '#fff' }}>{p.title}</div>
                        {p.description && (
                          <div style={{ color: isArchive ? '#475569' : '#94a3b8', fontSize: '0.8rem', marginBottom: '0.5rem', lineHeight: '1.4' }}>{p.description}</div>
                        )}
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                          <span style={{ background: `${cat.color}22`, color: isArchive ? '#475569' : cat.color, borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}>{cat.label}</span>
                          {!isArchive && (
                            <span style={{ background: `${priorityColors[p.priority]}22`, color: priorityColors[p.priority], borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.7rem', textTransform: 'uppercase' }}>{p.priority}</span>
                          )}
                          <OwnerBadge owner={p.owner} />
                          {p.due_date && (
                            <span style={{ background: isOverdue ? '#f8717122' : 'rgba(255,255,255,0.06)', color: isOverdue ? '#f87171' : '#94a3b8', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.7rem' }}>
                              {isOverdue ? '⚠️ ' : '📅 '}{new Date(p.due_date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                            </span>
                          )}
                        </div>
                        <PlanSection steps={p.plan?.plan_steps || []} />
                        <ChecklistSection items={p.checklist || []} onToggle={toggleChecklist} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
                            {columns.filter(c => c.id !== col.id).map(c => (
                              <button key={c.id} onClick={() => moveProject(p.id, c.id)} title={`Move to ${c.label}`}
                                style={{
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: '6px',
                                  padding: '0.25rem 0.6rem',
                                  color: c.id === 'archive' ? '#64748b' : '#94a3b8',
                                  cursor: 'pointer',
                                  fontSize: '0.72rem',
                                  fontFamily: 'inherit',
                                  transition: 'all 0.15s',
                                }}>
                                {c.id === 'backlog' ? '← Backlog' : c.id === 'in-progress' ? '▶ In Progress' : c.id === 'done' ? '✓ Done' : '🗄 Archive'}
                              </button>
                            ))}
                          </div>
                          <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.65rem', color: '#475569' }}>↻ {lastUpdated}</span>
                            <button onClick={() => startEdit(p)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem', padding: '0.25rem' }}>✏️</button>
                            <button onClick={() => deleteProject(p.id)} style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.85rem', padding: '0.25rem' }}>✕</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  {colProjects.length === 0 && (
                    <div style={{
                      textAlign: 'center',
                      color: isArchive ? '#2d3748' : '#2d3748',
                      fontSize: '0.8rem',
                      padding: '1.5rem 0.5rem',
                      border: `1px dashed ${isArchive ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.07)'}`,
                      borderRadius: '6px',
                    }}>
                      {isArchive ? 'Drag completed projects here' : 'Drop here'}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
