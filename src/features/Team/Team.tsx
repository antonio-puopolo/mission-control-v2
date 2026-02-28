import { useMemo } from 'react'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

interface TeamMember {
  id: string
  name: string
  role: string
  status: 'online' | 'idle' | 'offline'
  model?: string
  color: string
}

const teamMembers: TeamMember[] = [
  {
    id: 'ap',
    name: 'Antonio (AP)',
    role: 'Sales Lead',
    status: 'online',
    model: 'Sonnet 4.5',
    color: '#00D4AA',
  },
  {
    id: 'am',
    name: 'Andrey (AM)',
    role: 'Agent - Holland Park',
    status: 'idle',
    model: 'Haiku',
    color: '#6c63ff',
  },
  {
    id: 'kc',
    name: 'Karl (KC)',
    role: 'Agent - Coorparoo',
    status: 'offline',
    model: 'Sonnet',
    color: '#ffa502',
  },
  {
    id: 'ht',
    name: 'Hannah (HT)',
    role: 'Operations Manager',
    status: 'online',
    color: '#ff6b6b',
  },
  {
    id: 'lc',
    name: 'Leilani (LC)',
    role: 'Admin Support',
    status: 'online',
    color: '#a0a0b0',
  },
]

export function Team() {
  // Real-time sync
  useRealtimeSync('activity_log', ['activity'])

  // Calculate leaderboard
  const leaderboard = useMemo(() => {
    const stats: Record<string, { points: number; activities: number; member: TeamMember }> = {}

    teamMembers.forEach((member) => {
      stats[member.id] = {
        points: 0,
        activities: 0,
        member: member,
      }
    })

    // Simulate activity distribution (in real app, would be from actual data)
    const distributions: Record<string, number> = {
      ap: 350,
      am: 280,
      kc: 240,
      ht: 150,
      lc: 120,
    }

    Object.entries(distributions).forEach(([memberId, points]) => {
      if (stats[memberId]) {
        stats[memberId].points = points
        stats[memberId].activities = Math.floor(points / 20) // Assume avg 20 points per activity
      }
    })

    return Object.values(stats)
      .sort((a, b) => b.points - a.points)
      .slice(0, 10)
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div>
        <h2>👥 Team</h2>
        <p style={{ color: '#a0a0b0', marginTop: '0.5rem' }}>
          Team members, activity tracking, leaderboard
        </p>
      </div>

      {/* Team Overview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        {teamMembers.map((member) => {
          const statusColor =
            member.status === 'online' ? '#00D4AA' : member.status === 'idle' ? '#ffa502' : '#666'
          return (
            <div
              key={member.id}
              style={{
                background: '#0f0f14',
                padding: '1.5rem',
                borderRadius: '8px',
                borderLeft: `4px solid ${member.color}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: statusColor,
                  }}
                />
                <div>
                  <h4 style={{ margin: 0, marginBottom: '0.25rem' }}>{member.name}</h4>
                  <p style={{ margin: 0, color: '#a0a0b0', fontSize: '0.85rem' }}>{member.role}</p>
                </div>
              </div>

              {member.model && (
                <div style={{ fontSize: '0.8rem', color: '#a0a0b0', background: '#141e1e', padding: '0.5rem', borderRadius: '4px' }}>
                  Model: <span style={{ fontWeight: '600', color: '#fff' }}>{member.model}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Leaderboard */}
      <div style={{ background: '#0f0f14', padding: '1.5rem', borderRadius: '8px' }}>
        <h3>Leaderboard (Points This Month)</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
          {leaderboard.map((entry, index) => (
            <div
              key={entry.member.id}
              style={{
                background: index === 0 ? 'rgba(0, 212, 170, 0.1)' : '#141e1e',
                padding: '1rem',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '1rem',
              }}
            >
              {/* Rank */}
              <div
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                  color: entry.member.color,
                  minWidth: '40px',
                  textAlign: 'center',
                }}
              >
                #{index + 1}
              </div>

              {/* Member Info */}
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                  {entry.member.name}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#a0a0b0' }}>
                  {entry.activities} activities
                </div>
              </div>

              {/* Points */}
              <div
                style={{
                  background: entry.member.color + '20',
                  color: entry.member.color,
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  fontWeight: '600',
                  fontSize: '1.1rem',
                  minWidth: '80px',
                  textAlign: 'center',
                }}
              >
                {entry.points} pts
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <StatCard
          label="Total Team Members"
          value={teamMembers.length.toString()}
          color="#00D4AA"
        />
        <StatCard
          label="Online Now"
          value={teamMembers.filter((m) => m.status === 'online').length.toString()}
          color="#6c63ff"
        />
        <StatCard
          label="Total Points (Month)"
          value={leaderboard.reduce((sum, entry) => sum + entry.points, 0).toString()}
          color="#ffa502"
        />
        <StatCard
          label="Avg Per Member"
          value={Math.round(
            leaderboard.reduce((sum, entry) => sum + entry.points, 0) / leaderboard.length
          ).toString()}
          color="#ff6b6b"
        />
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
