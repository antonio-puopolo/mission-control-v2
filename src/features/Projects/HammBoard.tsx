import { useState } from 'react'

type ProjectStatus = 'done' | 'in-progress' | 'blocked'

interface HammProject {
  id: string
  title: string
  status: ProjectStatus
  blocker?: string
  nextAction: string
  waitingOnAntonio?: boolean
}

const PROJECTS: HammProject[] = [
  {
    id: 'sound-visualizer',
    title: 'Sound Visualizer',
    status: 'done',
    nextAction: 'Complete',
  },
  {
    id: 'agentos',
    title: 'AgentOS',
    status: 'in-progress',
    nextAction: 'Package Mission Control as product',
  },
  {
    id: 'moltbook',
    title: 'Moltbook',
    status: 'in-progress',
    nextAction: 'Weekly post analysis → report to Antonio',
  },
  {
    id: 'property-finance',
    title: 'Property Finance',
    status: 'in-progress',
    nextAction: 'Research & validate market thesis',
  },
  {
    id: 'race-weekend',
    title: 'Race Weekend',
    status: 'in-progress',
    nextAction: 'Add live timing + schedule',
  },
]

const statusConfig: Record<ProjectStatus, { icon: string; color: string; bg: string }> = {
  done: { icon: '✅', color: '#4ade80', bg: 'rgba(74, 222, 128, 0.08)' },
  'in-progress': { icon: '🟡', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.08)' },
  blocked: { icon: '🔴', color: '#ff6b6b', bg: 'rgba(255, 107, 107, 0.08)' },
}

export function HammBoard() {
  const [projects] = useState<HammProject[]>(PROJECTS)

  const getCompletionPercentage = () => {
    if (projects.length === 0) return 0
    const doneCount = projects.filter(p => p.status === 'done').length
    return Math.round((doneCount / projects.length) * 100)
  }

  const inProgressCount = projects.filter(p => p.status === 'in-progress').length
  const blockedCount = projects.filter(p => p.status === 'blocked').length
  const doneCount = projects.filter(p => p.status === 'done').length
  const completionPct = getCompletionPercentage()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Hamm Projects
          </h3>
          <p style={{ color: '#475569', margin: '0.15rem 0 0', fontSize: '0.72rem' }}>
            Goal status across 5 active projects
          </p>
        </div>
      </div>

      {/* Summary Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.05), rgba(245, 158, 11, 0.05))',
          border: '1px solid rgba(249, 115, 22, 0.2)',
          borderRadius: '12px',
          padding: '1.25rem',
          boxShadow: '0 0 20px rgba(249, 115, 22, 0.04)',
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
          {/* Completion % */}
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Overall Progress
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: '700', color: '#F97316' }}>
              {completionPct}%
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              {doneCount} of {projects.length} done
            </div>
          </div>

          {/* Status breakdown */}
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              In Progress
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: '700', color: '#fbbf24' }}>
              {inProgressCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              projects active
            </div>
          </div>

          {/* Blocked */}
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
              Blocked
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: '700', color: '#ff6b6b' }}>
              {blockedCount}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
              {blockedCount === 1 ? 'needs intervention' : 'all clear'}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              background: `linear-gradient(90deg, #4ade80 0%, #fbbf24 ${completionPct}%, transparent ${completionPct}%)`,
              transition: 'width 0.3s ease',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* Project Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {projects.map(project => {
          const config = statusConfig[project.status]
          const isBlocked = project.status === 'blocked'
          const isWaitingOnAntonio = project.waitingOnAntonio

          return (
            <div
              key={project.id}
              style={{
                background: config.bg,
                border: `1.5px solid ${config.color}`,
                borderRadius: '10px',
                padding: '1.1rem',
                boxShadow: isBlocked ? `0 0 15px ${config.color}33` : '0 0 10px rgba(255,255,255,0.02)',
                position: 'relative',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              {/* Red alert for Antonio wait */}
              {isWaitingOnAntonio && (
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#ff6b6b',
                    boxShadow: '0 0 8px #ff6b6b',
                    animation: 'pulse 2s ease-in-out infinite',
                  }}
                />
              )}

              {/* Status + Title */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>{config.icon}</span>
                  <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: config.color, fontWeight: '600', letterSpacing: '0.05em' }}>
                    {project.status === 'in-progress' ? 'In Progress' : project.status === 'blocked' ? 'Blocked' : 'Done'}
                  </span>
                </div>
                <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: '700', color: '#f1f5f9' }}>
                  {project.title}
                </h4>
              </div>

              {/* Blocker (if any) */}
              {project.blocker && (
                <div
                  style={{
                    background: 'rgba(255, 107, 107, 0.15)',
                    border: '1px solid rgba(255, 107, 107, 0.3)',
                    borderRadius: '6px',
                    padding: '0.6rem',
                    fontSize: '0.8rem',
                    color: '#ff8888',
                    lineHeight: '1.4',
                  }}
                >
                  ⚠️ {project.blocker}
                </div>
              )}

              {/* Next Action */}
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
                  Next Action
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: '0.9rem',
                    color: '#cbd5e1',
                    lineHeight: '1.4',
                    fontWeight: '500',
                  }}
                >
                  {project.nextAction}
                </p>
              </div>

              {/* Wait status badge */}
              {isWaitingOnAntonio && (
                <div
                  style={{
                    background: 'rgba(255, 107, 107, 0.12)',
                    color: '#ff6b6b',
                    border: '1px solid rgba(255, 107, 107, 0.25)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    fontSize: '0.75rem',
                    fontWeight: '600',
                    textAlign: 'center',
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                  }}
                >
                  🔴 Waiting on Antonio
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
