import { useLaps } from '@/hooks/useLaps'
import { useActivityThisWeek, useTotalPointsThisMonth } from '@/hooks/useActivity'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { useDashboardStore } from '@/store/dashboardStore'

export function Dashboard() {
  const { gciCurrent, gciTarget, listingsCurrent, listingsTarget, lapsCurrent, lapsTarget } =
    useDashboardStore()

  // Real-time sync
  useRealtimeSync('laps', ['laps'])
  useRealtimeSync('activity_log', ['activity'])

  // Fetch data
  const { data: laps = [], isLoading: lapsLoading } = useLaps()
  const { data: activity = [], isLoading: activityLoading } = useActivityThisWeek()
  const { data: pointsThisMonth = 0, isLoading: pointsLoading } = useTotalPointsThisMonth()

  // Calculate stats
  const gciPercent = Math.round((gciCurrent / gciTarget) * 100)
  const listingsPercent = Math.round((listingsCurrent / listingsTarget) * 100)
  const lapsPercent = Math.round((lapsCurrent / lapsTarget) * 100)

  const lapsByStatus = {
    lap: laps.filter((l) => l.status === 'LAP').length,
    listed: laps.filter((l) => l.status === 'Listed').length,
    sold: laps.filter((l) => l.status === 'Sold').length,
  }

  const todayActivity = activity.filter((a) => {
    const today = new Date().toDateString()
    return new Date(a.created_at).toDateString() === today
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h2>Dashboard</h2>
        <p style={{ color: '#a0a0b0' }}>Real-time business metrics • Last 7 days activity</p>
      </div>

      {/* Metrics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {/* GCI Card */}
        <MetricCard
          label="GCI Progress"
          value={`$${gciCurrent.toLocaleString()}`}
          target={`$${gciTarget.toLocaleString()}`}
          percent={gciPercent}
          color="#00D4AA"
          loading={false}
        />

        {/* Listings Card */}
        <MetricCard
          label="Listings"
          value={listingsCurrent.toString()}
          target={listingsTarget.toString()}
          percent={listingsPercent}
          color="#6c63ff"
          loading={false}
        />

        {/* LAPs Card */}
        <MetricCard
          label="LAPs"
          value={lapsCurrent.toString()}
          target={lapsTarget.toString()}
          percent={lapsPercent}
          color="#ffa502"
          loading={lapsLoading}
        />

        {/* Points This Month */}
        <MetricCard
          label="Points (Month)"
          value={pointsThisMonth.toString()}
          target="250"
          percent={(pointsThisMonth / 250) * 100}
          color="#ff6b6b"
          loading={pointsLoading}
        />
      </div>

      {/* LAP Status Breakdown */}
      <div style={{ background: '#0f0f14', padding: '1.5rem', borderRadius: '8px' }}>
        <h3>LAP Status Breakdown</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginTop: '1rem' }}>
          <StatusBox label="In Progress" count={lapsByStatus.lap} color="#00D4AA" />
          <StatusBox label="Listed" count={lapsByStatus.listed} color="#6c63ff" />
          <StatusBox label="Sold" count={lapsByStatus.sold} color="#ff6b6b" />
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ background: '#0f0f14', padding: '1.5rem', borderRadius: '8px' }}>
        <h3>Today's Activity ({todayActivity.length})</h3>
        {activityLoading ? (
          <p style={{ color: '#a0a0b0' }}>Loading...</p>
        ) : todayActivity.length === 0 ? (
          <p style={{ color: '#a0a0b0' }}>No activity yet today</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
            {todayActivity.slice(0, 5).map((act) => (
              <div
                key={act.id}
                style={{
                  background: '#141e1e',
                  padding: '0.75rem',
                  borderRadius: '4px',
                  fontSize: '0.9rem',
                  borderLeft: '3px solid #00D4AA',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>{act.activity_type}</span>
                  <span style={{ color: '#00D4AA', fontWeight: '600' }}>+{act.points_awarded} pts</span>
                </div>
                {act.description && <div style={{ color: '#a0a0b0', fontSize: '0.8rem', marginTop: '0.25rem' }}>{act.description}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface MetricCardProps {
  label: string
  value: string
  target: string
  percent: number
  color: string
  loading: boolean
}

function MetricCard({ label, value, target, percent, color, loading }: MetricCardProps) {
  return (
    <div style={{ background: '#141e1e', padding: '1.5rem', borderRadius: '8px' }}>
      <div style={{ color: '#a0a0b0', fontSize: '0.85rem', marginBottom: '0.5rem' }}>{label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>
        {loading ? '...' : value}
      </div>
      <div style={{ fontSize: '0.8rem', color: '#a0a0b0', marginBottom: '0.75rem' }}>
        {target}
      </div>
      <div style={{ background: '#0f0f14', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
        <div
          style={{
            background: color,
            height: '100%',
            width: `${Math.min(percent, 100)}%`,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <div style={{ fontSize: '0.75rem', color: '#a0a0b0', marginTop: '0.5rem' }}>{Math.round(percent)}%</div>
    </div>
  )
}

function StatusBox({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div style={{ background: '#141e1e', padding: '1rem', borderRadius: '8px', borderTop: `3px solid ${color}` }}>
      <div style={{ fontSize: '0.9rem', color: '#a0a0b0' }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem', color }}>{count}</div>
    </div>
  )
}
