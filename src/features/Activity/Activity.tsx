import { useMemo } from 'react'
import { useActivityThisWeek, useTotalPointsThisMonth } from '@/hooks/useActivity'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

export function Activity() {
  const { data: activityData = [], isLoading } = useActivityThisWeek()
  const { data: pointsThisMonth = 0 } = useTotalPointsThisMonth()

  // Real-time sync
  useRealtimeSync('activity_log', ['activity'])

  // Calculate stats
  const stats = useMemo(() => {
    const activityTypes: Record<string, { count: number; points: number; color: string }> = {}

    activityData.forEach((activity) => {
      if (!activityTypes[activity.activity_type]) {
        activityTypes[activity.activity_type] = {
          count: 0,
          points: 0,
          color: getColorForActivity(activity.activity_type),
        }
      }
      activityTypes[activity.activity_type].count++
      activityTypes[activity.activity_type].points += activity.points_awarded
    })

    return activityTypes
  }, [activityData])

  const topActivityType = Object.entries(stats).sort(([, a], [, b]) => b.points - a.points)[0]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h2>📈 Activity</h2>
        <p style={{ color: '#a0a0b0', marginTop: '0.5rem' }}>
          Track calls, appraisals, and performance metrics
        </p>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard
          label="Points (This Month)"
          value={pointsThisMonth.toString()}
          color="#F59E0B"
        />
        <StatCard
          label="Total Activities"
          value={activityData.length.toString()}
          color="#6c63ff"
        />
        <StatCard
          label="Top Activity"
          value={topActivityType ? topActivityType[0] : 'N/A'}
          color="#ffa502"
        />
        <StatCard
          label="Avg Points/Activity"
          value={
            activityData.length > 0
              ? (pointsThisMonth / activityData.length).toFixed(1)
              : '0'
          }
          color="#ff6b6b"
        />
      </div>

      {/* Activity Breakdown */}
      <div style={{ background: '#0f0f14', padding: '1.5rem', borderRadius: '8px' }}>
        <h3>Activity Breakdown</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem' }}>
          {Object.entries(stats).map(([type, data]) => (
            <div
              key={type}
              style={{
                background: '#141e1e',
                padding: '1rem',
                borderRadius: '4px',
                borderLeft: `4px solid ${data.color}`,
              }}
            >
              <div style={{ fontSize: '0.9rem', color: '#a0a0b0' }}>{type}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginTop: '0.5rem', color: data.color }}>
                {data.count}
              </div>
              <div style={{ fontSize: '0.8rem', color: '#a0a0b0', marginTop: '0.5rem' }}>
                {data.points} points
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity Feed */}
      <div>
        <h3>Recent Activity</h3>
        {isLoading ? (
          <p style={{ color: '#a0a0b0' }}>Loading...</p>
        ) : activityData.length === 0 ? (
          <p style={{ color: '#a0a0b0' }}>No activity this week</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activityData.slice(0, 20).map((activity) => (
              <div
                key={activity.id}
                style={{
                  background: '#0f0f14',
                  padding: '1rem',
                  borderRadius: '4px',
                  borderLeft: `4px solid ${getColorForActivity(activity.activity_type)}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                    {activity.activity_type}
                  </div>
                  <div style={{ color: '#a0a0b0', fontSize: '0.85rem' }}>
                    {activity.description || 'No description'}
                  </div>
                  <div style={{ color: '#a0a0b0', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                    {new Date(activity.created_at).toLocaleString()}
                  </div>
                </div>
                <div
                  style={{
                    background: 'rgba(0, 212, 170, 0.2)',
                    color: '#F59E0B',
                    padding: '0.5rem 1rem',
                    borderRadius: '4px',
                    fontWeight: '600',
                    whiteSpace: 'nowrap',
                  }}
                >
                  +{activity.points_awarded} pts
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  color: string
}

function StatCard({ label, value, color }: StatCardProps) {
  return (
    <div style={{ background: '#0f0f14', padding: '1.5rem', borderRadius: '8px' }}>
      <div style={{ color: '#a0a0b0', fontSize: '0.85rem', marginBottom: '0.5rem' }}>
        {label}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', color }}>{value}</div>
    </div>
  )
}

function getColorForActivity(type: string): string {
  const colors: Record<string, string> = {
    call: '#F59E0B',
    appraisal: '#6c63ff',
    listing: '#ffa502',
    follow_up: '#ff6b6b',
    default: '#a0a0b0',
  }

  const normalizedType = type.toLowerCase().replace(/\s+/g, '_')
  return colors[normalizedType] || colors.default
}
