import { useState, useEffect } from 'react'
// @ts-ignore
import Model from 'react-body-highlighter'
// @ts-ignore
import { MuscleType, ModelType } from 'react-body-highlighter'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

const H = { 'apikey': KEY, 'Authorization': `Bearer ${KEY}`, 'Content-Type': 'application/json', 'Prefer': 'return=representation' }

async function db(path: string, opts?: RequestInit) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1${path}`, { ...opts, headers: { ...H, ...(opts?.headers || {}) } })
  if (res.status === 204) return null
  return res.json()
}

const WORKOUT_TYPES = ['🏋️ Weights', '🏃 Run', '🚴 Bike', '🏊 Swim', '🧘 Yoga', '🥊 Boxing', '⚽ Sport', '🚶 Walk', '💪 PT Session', '🏠 Home Workout', '🔥 Cardio', '🤸 Stretch']
const MUSCLE_GROUPS = ['Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Forearms', 'Core / Abs', 'Glutes', 'Quads', 'Hamstrings', 'Calves', 'Full Body']

interface Workout { id: string; workout_type: string; duration_mins: number; notes?: string; logged_at: string }
interface WeightLog { id: string; weight_kg: number; logged_at: string }
interface BodyMetric { id: string; chest_cm?: number; waist_cm?: number; hips_cm?: number; arms_cm?: number; legs_cm?: number; body_fat_pct?: number; logged_at: string }
interface Goals { weekly_workout_target: number; weight_goal_kg?: number; goal_notes?: string }

function getWeekStart() {
  const d = new Date(); d.setHours(0,0,0,0); d.setDate(d.getDate() - d.getDay() + 1); return d
}

function calcStreak(workouts: Workout[]): number {
  if (!workouts.length) return 0
  const days = new Set(workouts.map(w => new Date(w.logged_at).toDateString()))
  let streak = 0; let d = new Date(); d.setHours(0,0,0,0)
  while (days.has(d.toDateString())) { streak++; d.setDate(d.getDate() - 1) }
  return streak
}

function MiniLineGraph({ data, color = '#EAEAE0', label = '' }: { data: number[]; color?: string; label?: string }) {
  if (data.length < 2) return <div style={{ color: '#555', fontSize: '0.8rem', textAlign: 'center', padding: '2rem' }}>Log more entries to see trend</div>
  const min = Math.min(...data); const max = Math.max(...data)
  const range = max - min || 1
  const w = 300; const h = 80; const pad = 10
  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2)
    const y = pad + ((max - v) / range) * (h - pad * 2)
    return `${x},${y}`
  }).join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', maxHeight: '80px' }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2)
        const y = pad + ((max - v) / range) * (h - pad * 2)
        return <circle key={i} cx={x} cy={y} r="3" fill={color} />
      })}
      <text x={pad} y={h - 2} fontSize="9" fill="#475569">{data[0]}{label}</text>
      <text x={w - pad} y={h - 2} fontSize="9" fill="#475569" textAnchor="end">{data[data.length-1]}{label}</text>
    </svg>
  )
}

// Parse muscles out of workout_type string e.g. "🏋️ Weights [Chest, Biceps]"
function parseMusclesFromWorkout(workout_type: string): string[] {
  const match = workout_type.match(/\[(.+)\]/)
  if (!match) return []
  return match[1].split(', ').flatMap((m: string) => MUSCLE_LABEL_MAP[m] || [])
}

const MUSCLE_LABEL_MAP: Record<string, string[]> = {
  'Chest': [MuscleType.CHEST],
  'Back': [MuscleType.UPPER_BACK, MuscleType.LOWER_BACK],
  'Shoulders': [MuscleType.FRONT_DELTOIDS, MuscleType.BACK_DELTOIDS],
  'Biceps': [MuscleType.BICEPS],
  'Triceps': [MuscleType.TRICEPS],
  'Forearms': [MuscleType.FOREARM],
  'Core / Abs': [MuscleType.ABS, MuscleType.OBLIQUES],
  'Glutes': [MuscleType.GLUTEAL],
  'Quads': [MuscleType.QUADRICEPS],
  'Hamstrings': [MuscleType.HAMSTRING],
  'Calves': [MuscleType.CALVES],
  'Full Body': [MuscleType.CHEST, MuscleType.ABS, MuscleType.QUADRICEPS, MuscleType.UPPER_BACK, MuscleType.BICEPS],
}

function BodyOutline({ workouts }: { workouts: Workout[] }) {
  // Build highlighted muscles from recent workouts (last 7 days)
  const recentMuscles = new Set<string>()
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000
  workouts.forEach(w => {
    if (new Date(w.logged_at).getTime() > cutoff) {
      parseMusclesFromWorkout(w.workout_type).forEach((m: string) => recentMuscles.add(m))
    }
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any[] = [{ name: 'Worked', muscles: Array.from(recentMuscles) }]

  return (
    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ filter: 'hue-rotate(140deg) saturate(2) brightness(1.1)' }}>
        <Model data={data} style={{ width: '110px' }} type={ModelType.ANTERIOR} />
      </div>
      <div style={{ filter: 'hue-rotate(140deg) saturate(2) brightness(1.1)' }}>
        <Model data={data} style={{ width: '110px' }} type={ModelType.POSTERIOR} />
      </div>
    </div>
  )
}

export function Health() {
  const [tab, setTab] = useState<'overview'|'workouts'|'weight'|'metrics'|'goals'>('overview')
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [weights, setWeights] = useState<WeightLog[]>([])
  const [metrics, setMetrics] = useState<BodyMetric[]>([])
  const [goals, setGoals] = useState<Goals>({ weekly_workout_target: 4 })
  const [loading, setLoading] = useState(true)

  // Log workout modal
  const [showWorkoutModal, setShowWorkoutModal] = useState(false)
  const [wType, setWType] = useState(WORKOUT_TYPES[0])
  const [wMuscles, setWMuscles] = useState<string[]>([])
  const [wDuration, setWDuration] = useState('')
  const [wNotes, setWNotes] = useState('')

  // Log weight modal
  const [showWeightModal, setShowWeightModal] = useState(false)
  const [newWeight, setNewWeight] = useState('')

  // Log metrics modal
  const [showMetricModal, setShowMetricModal] = useState(false)
  const [newMetric, setNewMetric] = useState({ chest_cm: '', waist_cm: '', hips_cm: '', arms_cm: '', legs_cm: '', body_fat_pct: '' })

  // Goals edit
  const [editingGoals, setEditingGoals] = useState(false)
  const [goalDraft, setGoalDraft] = useState<Goals>({ weekly_workout_target: 4 })

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [w, wl, bm, g] = await Promise.all([
      db('/workouts?order=logged_at.desc&limit=100'),
      db('/weight_logs?order=logged_at.desc&limit=52'),
      db('/body_metrics?order=logged_at.desc&limit=20'),
      db('/fitness_goals?id=eq.main'),
    ])
    setWorkouts(w || [])
    setWeights(wl || [])
    setMetrics(bm || [])
    if (g?.[0]) { setGoals(g[0]); setGoalDraft(g[0]) }
    setLoading(false)
  }

  const thisWeekWorkouts = workouts.filter(w => new Date(w.logged_at) >= getWeekStart())
  const streak = calcStreak(workouts)
  const latestWeight = weights[0]?.weight_kg
  const prevWeight = weights[1]?.weight_kg
  const weightChange = latestWeight && prevWeight ? +(latestWeight - prevWeight).toFixed(1) : null
  const latestMetrics = metrics[0]

  async function logWorkout() {
    if (!wType || !wDuration) return
    const muscleTag = wMuscles.length ? ` [${wMuscles.join(', ')}]` : ''
    await db('/workouts', { method: 'POST', body: JSON.stringify({ workout_type: wType + muscleTag, duration_mins: parseInt(wDuration), notes: wNotes || null }) })
    setShowWorkoutModal(false); setWDuration(''); setWNotes(''); setWMuscles([]); loadAll()
  }

  async function logWeight() {
    if (!newWeight) return
    await db('/weight_logs', { method: 'POST', body: JSON.stringify({ weight_kg: parseFloat(newWeight) }) })
    setShowWeightModal(false); setNewWeight(''); loadAll()
  }

  async function logMetrics() {
    const payload: any = {}
    if (newMetric.chest_cm) payload.chest_cm = parseFloat(newMetric.chest_cm)
    if (newMetric.waist_cm) payload.waist_cm = parseFloat(newMetric.waist_cm)
    if (newMetric.hips_cm) payload.hips_cm = parseFloat(newMetric.hips_cm)
    if (newMetric.arms_cm) payload.arms_cm = parseFloat(newMetric.arms_cm)
    if (newMetric.legs_cm) payload.legs_cm = parseFloat(newMetric.legs_cm)
    if (newMetric.body_fat_pct) payload.body_fat_pct = parseFloat(newMetric.body_fat_pct)
    await db('/body_metrics', { method: 'POST', body: JSON.stringify(payload) })
    setShowMetricModal(false); setNewMetric({ chest_cm:'',waist_cm:'',hips_cm:'',arms_cm:'',legs_cm:'',body_fat_pct:'' }); loadAll()
  }

  async function saveGoals() {
    await db('/fitness_goals?id=eq.main', { method: 'PATCH', body: JSON.stringify({ ...goalDraft, updated_at: new Date().toISOString() }) })
    setGoals(goalDraft); setEditingGoals(false)
  }

  const inputStyle: React.CSSProperties = { padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#f1f5f9', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' }
  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '1.25rem' }
  const TABS = ['overview', 'workouts', 'weight', 'metrics', 'goals'] as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Health & Fitness</h3>
          <p style={{ color: '#555', margin: '0.15rem 0 0', fontSize: '0.72rem' }}>Body • Habits • Process</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => setShowWorkoutModal(true)} style={{ padding: '0.6rem 1rem', background: '#EAEAE0', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' }}>+ Workout</button>
          <button onClick={() => setShowWeightModal(true)} style={{ padding: '0.6rem 1rem', background: 'rgba(96,165,250,0.1)', color: '#60a5fa', border: '1px solid #60a5fa44', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>⚖️ Weight</button>
          <button onClick={() => setShowMetricModal(true)} style={{ padding: '0.6rem 1rem', background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid #a78bfa44', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>📏 Metrics</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,0.08)', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ display: 'flex', gap: '0.25rem', minWidth: 'max-content' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: '0.5rem 1rem', background: tab === t ? 'rgba(245,158,11,0.12)' : 'transparent', border: 'none', borderRadius: '8px', color: tab === t ? '#EAEAE0' : '#64748b', cursor: 'pointer', fontFamily: 'inherit', textTransform: 'capitalize', fontWeight: tab === t ? 600 : 400, whiteSpace: 'nowrap' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {loading ? <p style={{ color: '#555' }}>Loading...</p> : (
        <>
          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>

              {/* Body outline card */}
              <div style={{ ...cardStyle, gridRow: 'span 2' }}>
                <h4 style={{ margin: '0 0 1rem', color: '#555', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Your Body</h4>
                <BodyOutline workouts={workouts} />
                {latestWeight && <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                  <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#fff' }}>{latestWeight}</span>
                  <span style={{ color: '#555', marginLeft: '4px' }}>kg</span>
                  {weightChange !== null && <span style={{ marginLeft: '8px', fontSize: '0.85rem', color: weightChange < 0 ? '#EAEAE0' : weightChange > 0 ? '#f87171' : '#64748b' }}>
                    {weightChange > 0 ? '+' : ''}{weightChange} kg
                  </span>}
                </div>}
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={cardStyle}>
                  <div style={{ color: '#555', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>This Week</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 700, color: thisWeekWorkouts.length >= goals.weekly_workout_target ? '#EAEAE0' : '#fff' }}>
                      {thisWeekWorkouts.length}
                    </span>
                    <span style={{ color: '#555', marginBottom: '0.5rem' }}>/ {goals.weekly_workout_target} workouts</span>
                  </div>
                  {/* Progress bar */}
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.07)', borderRadius: '999px', marginTop: '0.5rem' }}>
                    <div style={{ height: '100%', borderRadius: '999px', background: '#EAEAE0', width: `${Math.min(100, (thisWeekWorkouts.length / goals.weekly_workout_target) * 100)}%`, transition: 'width 0.5s ease' }} />
                  </div>
                </div>

                <div style={cardStyle}>
                  <div style={{ color: '#555', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Current Streak</div>
                  <div style={{ fontSize: '2.5rem', fontWeight: 700 }}>
                    {streak > 0 ? `🔥 ${streak}` : '–'}
                    <span style={{ fontSize: '1rem', color: '#555', fontWeight: 400, marginLeft: '4px' }}>{streak === 1 ? 'day' : 'days'}</span>
                  </div>
                </div>

                {goals.weight_goal_kg && latestWeight && (
                  <div style={cardStyle}>
                    <div style={{ color: '#555', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Weight Goal</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                      {latestWeight} → {goals.weight_goal_kg} kg
                      <span style={{ marginLeft: '8px', color: '#EAEAE0', fontSize: '0.85rem' }}>
                        {Math.abs(+(latestWeight - goals.weight_goal_kg).toFixed(1))} kg to go
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Weight mini graph */}
              {weights.length >= 2 && (
                <div style={cardStyle}>
                  <h4 style={{ margin: '0 0 1rem', color: '#555', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Weight Trend</h4>
                  <MiniLineGraph data={[...weights].reverse().map(w => w.weight_kg)} label="kg" />
                </div>
              )}
            </div>
          )}

          {/* WORKOUTS */}
          {tab === 'workouts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '0.5rem' }}>
                <div style={cardStyle}>
                  <div style={{ color: '#555', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>This Week</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>{thisWeekWorkouts.length} <span style={{ fontSize: '0.9rem', color: '#555', fontWeight: 400 }}>/ {goals.weekly_workout_target}</span></div>
                </div>
                <div style={cardStyle}>
                  <div style={{ color: '#555', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Total Sessions</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>{workouts.length}</div>
                </div>
                <div style={cardStyle}>
                  <div style={{ color: '#555', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Streak</div>
                  <div style={{ fontSize: '2rem', fontWeight: 700 }}>{streak > 0 ? `🔥 ${streak}d` : '–'}</div>
                </div>
              </div>
              {workouts.map(w => (
                <div key={w.id} style={{ ...cardStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{w.workout_type}</div>
                    {w.notes && <div style={{ color: '#555', fontSize: '0.82rem', marginTop: '0.2rem' }}>{w.notes}</div>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '1rem' }}>
                    <div style={{ color: '#EAEAE0', fontWeight: 600 }}>{w.duration_mins} min</div>
                    <div style={{ color: '#555', fontSize: '0.78rem' }}>{new Date(w.logged_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</div>
                  </div>
                </div>
              ))}
              {workouts.length === 0 && <p style={{ color: '#555' }}>No workouts logged yet. Hit + Workout to start!</p>}
            </div>
          )}

          {/* WEIGHT */}
          {tab === 'weight' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {weights.length >= 2 && (
                <div style={cardStyle}>
                  <h4 style={{ margin: '0 0 1rem', color: '#555', fontSize: '0.8rem', textTransform: 'uppercase' }}>Weight Over Time</h4>
                  <MiniLineGraph data={[...weights].reverse().map(w => w.weight_kg)} color="#60a5fa" label="kg" />
                </div>
              )}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '0.75rem' }}>
                {weights.map((w, i) => (
                  <div key={w.id} style={{ ...cardStyle, textAlign: 'center', borderLeft: i === 0 ? '3px solid #60a5fa' : '3px solid rgba(255,255,255,0.07)' }}>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{w.weight_kg}<span style={{ fontSize: '0.8rem', color: '#555' }}>kg</span></div>
                    <div style={{ color: '#555', fontSize: '0.75rem', marginTop: '0.25rem' }}>{new Date(w.logged_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}</div>
                    {i > 0 && (() => { const diff = +(w.weight_kg - weights[i-1].weight_kg).toFixed(1); return <div style={{ fontSize: '0.75rem', color: diff < 0 ? '#EAEAE0' : diff > 0 ? '#f87171' : '#475569' }}>{diff > 0 ? '+' : ''}{diff}kg</div> })()}
                  </div>
                ))}
              </div>
              {weights.length === 0 && <p style={{ color: '#555' }}>No weight entries yet. Tap ⚖️ Weight to log your first.</p>}
            </div>
          )}

          {/* METRICS */}
          {tab === 'metrics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {latestMetrics && (
                <div style={{ ...cardStyle }}>
                  <h4 style={{ margin: '0 0 1rem', color: '#555', fontSize: '0.8rem', textTransform: 'uppercase' }}>Latest Measurements</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem' }}>
                    {[['Chest', latestMetrics.chest_cm], ['Waist', latestMetrics.waist_cm], ['Hips', latestMetrics.hips_cm], ['Arms', latestMetrics.arms_cm], ['Legs', latestMetrics.legs_cm], ['Body Fat', latestMetrics.body_fat_pct ? `${latestMetrics.body_fat_pct}%` : null]].filter(([,v]) => v).map(([label, val]) => (
                      <div key={label as string} style={{ textAlign: 'center' }}>
                        <div style={{ color: '#555', fontSize: '0.72rem', textTransform: 'uppercase', marginBottom: '0.25rem' }}>{label}</div>
                        <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{typeof val === 'number' ? `${val}cm` : val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {metrics.length >= 2 && metrics[0].waist_cm && (
                <div style={cardStyle}>
                  <h4 style={{ margin: '0 0 1rem', color: '#555', fontSize: '0.8rem', textTransform: 'uppercase' }}>Waist Trend</h4>
                  <MiniLineGraph data={[...metrics].reverse().map(m => m.waist_cm!).filter(Boolean)} label="cm" color="#a78bfa" />
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {metrics.map(m => (
                  <div key={m.id} style={{ ...cardStyle, fontSize: '0.85rem' }}>
                    <div style={{ color: '#555', marginBottom: '0.5rem' }}>{new Date(m.logged_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                      {m.chest_cm && <span>Chest: <strong>{m.chest_cm}cm</strong></span>}
                      {m.waist_cm && <span>Waist: <strong>{m.waist_cm}cm</strong></span>}
                      {m.hips_cm && <span>Hips: <strong>{m.hips_cm}cm</strong></span>}
                      {m.arms_cm && <span>Arms: <strong>{m.arms_cm}cm</strong></span>}
                      {m.legs_cm && <span>Legs: <strong>{m.legs_cm}cm</strong></span>}
                      {m.body_fat_pct && <span>Body Fat: <strong>{m.body_fat_pct}%</strong></span>}
                    </div>
                  </div>
                ))}
              </div>
              {metrics.length === 0 && <p style={{ color: '#555' }}>No measurements yet. Tap 📏 Metrics to log your first.</p>}
            </div>
          )}

          {/* GOALS */}
          {tab === 'goals' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '480px' }}>
              {!editingGoals ? (
                <div style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                    <h4 style={{ margin: 0 }}>Fitness Goals</h4>
                    <button onClick={() => setEditingGoals(true)} style={{ padding: '0.4rem 0.75rem', background: 'rgba(245,158,11,0.1)', color: '#EAEAE0', border: '1px solid #EAEAE044', borderRadius: '6px', cursor: 'pointer', fontSize: '0.8rem' }}>✏️ Edit</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#555' }}>Weekly workouts target</span>
                      <strong>{goals.weekly_workout_target} sessions</strong>
                    </div>
                    {goals.weight_goal_kg && <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#555' }}>Weight goal</span>
                      <strong>{goals.weight_goal_kg} kg</strong>
                    </div>}
                    {goals.goal_notes && <div style={{ marginTop: '0.5rem', color: '#555', fontSize: '0.85rem', fontStyle: 'italic' }}>{goals.goal_notes}</div>}
                  </div>
                </div>
              ) : (
                <div style={cardStyle}>
                  <h4 style={{ margin: '0 0 1.25rem' }}>Edit Goals</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '0.3rem' }}>WEEKLY WORKOUT TARGET</label>
                      <input type="number" style={inputStyle} value={goalDraft.weekly_workout_target} onChange={e => setGoalDraft({...goalDraft, weekly_workout_target: parseInt(e.target.value)})} min={1} max={14} />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '0.3rem' }}>WEIGHT GOAL (KG)</label>
                      <input type="number" step="0.1" style={inputStyle} value={goalDraft.weight_goal_kg || ''} onChange={e => setGoalDraft({...goalDraft, weight_goal_kg: parseFloat(e.target.value)})} placeholder="e.g. 80" />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '0.3rem' }}>NOTES / MOTIVATION</label>
                      <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} value={goalDraft.goal_notes || ''} onChange={e => setGoalDraft({...goalDraft, goal_notes: e.target.value})} placeholder="e.g. Get lean before winter" />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={saveGoals} style={{ flex: 1, padding: '0.7rem', background: '#EAEAE0', color: '#000', border: 'none', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}>Save Goals</button>
                      <button onClick={() => setEditingGoals(false)} style={{ padding: '0.7rem 1rem', background: 'transparent', color: '#555', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Log Workout Modal */}
      {showWorkoutModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '420px', margin: '1rem' }}>
            <h3 style={{ margin: '0 0 1.5rem' }}>💪 Log Workout</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '0.3rem' }}>ACTIVITY</label>
                <select style={inputStyle} value={wType} onChange={e => setWType(e.target.value)}>
                  {WORKOUT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '0.4rem' }}>MUSCLE GROUPS <span style={{ color: '#555' }}>(tap to select)</span></label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {MUSCLE_GROUPS.map(m => {
                    const active = wMuscles.includes(m)
                    return <button key={m} type="button" onClick={() => setWMuscles(prev => active ? prev.filter(x => x !== m) : [...prev, m])}
                      style={{ padding: '0.35rem 0.75rem', borderRadius: '20px', border: active ? '1px solid #EAEAE0' : '1px solid rgba(255,255,255,0.12)', background: active ? 'rgba(0,212,170,0.15)' : 'transparent', color: active ? '#EAEAE0' : '#64748b', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                      {m}
                    </button>
                  })}
                </div>
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '0.3rem' }}>DURATION (MINUTES)</label>
                <input type="number" style={inputStyle} value={wDuration} onChange={e => setWDuration(e.target.value)} placeholder="e.g. 45" min={1} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '0.3rem' }}>NOTES (OPTIONAL)</label>
                <input style={inputStyle} value={wNotes} onChange={e => setWNotes(e.target.value)} placeholder="e.g. Legs day, PB on squats" />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button onClick={() => setShowWorkoutModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', color: '#555', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
                <button onClick={logWorkout} disabled={!wDuration} style={{ flex: 2, padding: '0.75rem', background: '#EAEAE0', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', opacity: !wDuration ? 0.5 : 1 }}>Log It ✓</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Log Weight Modal */}
      {showWeightModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '360px', margin: '1rem' }}>
            <h3 style={{ margin: '0 0 1.5rem' }}>⚖️ Log Weight</h3>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#555', display: 'block', marginBottom: '0.3rem' }}>WEIGHT (KG)</label>
              <input type="number" step="0.1" style={inputStyle} value={newWeight} onChange={e => setNewWeight(e.target.value)} placeholder="e.g. 82.5" autoFocus />
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button onClick={() => setShowWeightModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', color: '#555', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={logWeight} disabled={!newWeight} style={{ flex: 2, padding: '0.75rem', background: '#60a5fa', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', opacity: !newWeight ? 0.5 : 1 }}>Log Weight</button>
            </div>
          </div>
        </div>
      )}

      {/* Log Metrics Modal */}
      {showMetricModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#0d0d0d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '2rem', width: '100%', maxWidth: '420px', margin: '1rem' }}>
            <h3 style={{ margin: '0 0 1.5rem' }}>📏 Log Body Measurements</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[['CHEST (CM)', 'chest_cm'], ['WAIST (CM)', 'waist_cm'], ['HIPS (CM)', 'hips_cm'], ['ARMS (CM)', 'arms_cm'], ['LEGS (CM)', 'legs_cm'], ['BODY FAT (%)', 'body_fat_pct']].map(([label, key]) => (
                <div key={key}>
                  <label style={{ fontSize: '0.7rem', color: '#555', display: 'block', marginBottom: '0.3rem' }}>{label}</label>
                  <input type="number" step="0.1" style={inputStyle} value={(newMetric as any)[key]} onChange={e => setNewMetric({...newMetric, [key]: e.target.value})} placeholder="–" />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button onClick={() => setShowMetricModal(false)} style={{ flex: 1, padding: '0.75rem', background: 'transparent', color: '#555', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '8px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={logMetrics} style={{ flex: 2, padding: '0.75rem', background: '#a78bfa', color: '#000', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer' }}>Save Measurements</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
