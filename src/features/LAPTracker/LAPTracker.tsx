import { useState } from 'react'
import { useLapsByStatus, useCreateLap, useUpdateLap, useDeleteLap } from '@/hooks/useLaps'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'

export function LAPTracker() {
  const [activeStatus, setActiveStatus] = useState<'LAP' | 'Listed' | 'Sold' | 'Withdrawn'>('LAP')
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [newLap, setNewLap] = useState({ address: '', client_name: '', follow_up_date: '' })

  // Real-time sync
  useRealtimeSync('laps', ['laps'])

  // Fetch LAPs
  const { data: lapsByStatus = [], isLoading } = useLapsByStatus(activeStatus)
  const { mutateAsync: createAsync, isPending: isCreatingLap } = useCreateLap()
  const updateMutation = useUpdateLap()
  const deleteMutation = useDeleteLap()

  // Filter by search term
  const filtered = lapsByStatus.filter(
    (lap) =>
      lap.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lap.client_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreate = async () => {
    if (!newLap.address || !newLap.client_name) return
    await createAsync({
      ...newLap,
      status: 'LAP',
      notes: {},
    } as any)
    setNewLap({ address: '', client_name: '', follow_up_date: '' })
    setIsCreating(false)
  }

  const handleUpdateStatus = async (id: string, newStatus: string) => {
    await updateMutation.mutateAsync({
      id,
      status: newStatus as any,
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
        <div>
          <h2>LAP Tracker</h2>
          <p style={{ color: '#a0a0b0', marginTop: '0.5rem' }}>
            Manage listings, track conversions, follow-ups
          </p>
        </div>
        <button
          onClick={() => setIsCreating(!isCreating)}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#00D4AA',
            color: '#000',
            border: 'none',
            borderRadius: '4px',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          {isCreating ? '✕ Cancel' : '+ New LAP'}
        </button>
      </div>

      {/* Create Form */}
      {isCreating && (
        <div style={{ background: '#0f0f14', padding: '1.5rem', borderRadius: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <input
              type="text"
              placeholder="Address"
              value={newLap.address}
              onChange={(e) => setNewLap({ ...newLap, address: e.target.value })}
              style={{
                padding: '0.75rem',
                background: '#141e1e',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
                fontFamily: 'inherit',
              }}
            />
            <input
              type="text"
              placeholder="Client Name"
              value={newLap.client_name}
              onChange={(e) => setNewLap({ ...newLap, client_name: e.target.value })}
              style={{
                padding: '0.75rem',
                background: '#141e1e',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
                fontFamily: 'inherit',
              }}
            />
            <input
              type="date"
              value={newLap.follow_up_date}
              onChange={(e) => setNewLap({ ...newLap, follow_up_date: e.target.value })}
              style={{
                padding: '0.75rem',
                background: '#141e1e',
                border: '1px solid #333',
                borderRadius: '4px',
                color: '#fff',
                fontFamily: 'inherit',
              }}
            />
            <button
              onClick={handleCreate}
              disabled={isCreatingLap}
              style={{
                padding: '0.75rem',
                background: '#00D4AA',
                color: '#000',
                border: 'none',
                borderRadius: '4px',
                fontWeight: '600',
                cursor: 'pointer',
                opacity: isCreatingLap ? 0.5 : 1,
              }}
            >
              {isCreatingLap ? 'Creating...' : 'Create LAP'}
            </button>
          </div>
        </div>
      )}

      {/* Status Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
        {(['LAP', 'Listed', 'Sold', 'Withdrawn'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setActiveStatus(status)}
            style={{
              padding: '0.5rem 1rem',
              background: activeStatus === status ? 'rgba(0, 212, 170, 0.2)' : 'transparent',
              color: activeStatus === status ? '#00D4AA' : '#a0a0b0',
              border: 'none',
              cursor: 'pointer',
              borderBottom: activeStatus === status ? '2px solid #00D4AA' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            {status} ({lapsByStatus.length})
          </button>
        ))}
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search by address or client name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{
          padding: '0.75rem 1rem',
          background: '#0f0f14',
          border: '1px solid #333',
          borderRadius: '4px',
          color: '#fff',
          fontFamily: 'inherit',
          width: '100%',
        }}
      />

      {/* LAPs List */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {isLoading ? (
          <p style={{ color: '#a0a0b0' }}>Loading...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#a0a0b0' }}>No LAPs in {activeStatus} status</p>
        ) : (
          filtered.map((lap) => (
            <div
              key={lap.id}
              style={{
                background: '#0f0f14',
                padding: '1.5rem',
                borderRadius: '8px',
                borderLeft: '4px solid #00D4AA',
              }}
            >
              <div style={{ marginBottom: '1rem' }}>
                <h4 style={{ margin: '0 0 0.25rem 0' }}>{lap.client_name}</h4>
                <p style={{ margin: '0', color: '#a0a0b0', fontSize: '0.9rem' }}>{lap.address}</p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                <select
                  value={lap.status}
                  onChange={(e) => handleUpdateStatus(lap.id, e.target.value)}
                  style={{
                    padding: '0.5rem',
                    background: '#141e1e',
                    border: '1px solid #333',
                    borderRadius: '4px',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  <option value="LAP">LAP</option>
                  <option value="Listed">Listed</option>
                  <option value="Sold">Sold</option>
                  <option value="Withdrawn">Withdrawn</option>
                </select>
                <button
                  onClick={() => deleteMutation.mutate(lap.id)}
                  disabled={deleteMutation.isPending}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#ff6b6b',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    opacity: deleteMutation.isPending ? 0.5 : 1,
                  }}
                >
                  🗑️
                </button>
              </div>

              {lap.follow_up_date && (
                <div style={{ fontSize: '0.85rem', color: '#a0a0b0' }}>
                  Follow-up: {new Date(lap.follow_up_date).toLocaleDateString()}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
