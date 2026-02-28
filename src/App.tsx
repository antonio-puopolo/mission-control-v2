import { useDashboardStore } from '@/store/dashboardStore'
import { Dashboard } from '@/features/Dashboard/Dashboard'

function App() {
  const { activeTab, setActiveTab } = useDashboardStore()

  return (
    <div style={{ fontFamily: 'sans-serif', background: '#050508', color: '#fff', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #333' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
          <h1 style={{ margin: 0, marginBottom: '0.5rem' }}>🎯 Mission Control</h1>
          <p style={{ margin: 0, color: '#a0a0b0', fontSize: '0.9rem' }}>
            Antonio's Real Estate Command Center • React v2
          </p>
        </div>
      </header>

      {/* Navigation */}
      <nav style={{ padding: '0 2rem', borderBottom: '1px solid #333' }}>
        <div style={{ maxWidth: '1600px', margin: '0 auto', display: 'flex', gap: '0.5rem' }}>
          {[
            { id: 'dashboard', label: '📊 Dashboard' },
            { id: 'lap-tracker', label: '📋 LAP Tracker' },
            { id: 'agents', label: '🤖 Agents' },
            { id: 'activity', label: '📈 Activity' },
            { id: 'team', label: '👥 Team' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '1rem 1.5rem',
                background: activeTab === tab.id ? 'rgba(0, 212, 170, 0.1)' : 'transparent',
                color: activeTab === tab.id ? '#00D4AA' : '#a0a0b0',
                border: 'none',
                cursor: 'pointer',
                borderBottom: activeTab === tab.id ? '2px solid #00D4AA' : '2px solid transparent',
                transition: 'all 0.2s ease',
                fontSize: '0.95rem',
                fontWeight: activeTab === tab.id ? '600' : '400',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
        {activeTab === 'dashboard' && <Dashboard />}

        {activeTab !== 'dashboard' && (
          <div style={{ background: '#0f0f14', padding: '2rem', borderRadius: '8px', color: '#a0a0b0' }}>
            <h2>{activeTab.toUpperCase()}</h2>
            <p>Coming soon in Phase 3...</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        style={{
          marginTop: '2rem',
          padding: '1.5rem 2rem',
          borderTop: '1px solid #333',
          color: '#a0a0b0',
          fontSize: '0.85rem',
          textAlign: 'center',
        }}
      >
        <p style={{ margin: 0 }}>
          Mission Control v2 • React + TypeScript + Zustand + Supabase + Real-time Sync
        </p>
        <p style={{ margin: '0.5rem 0 0 0' }}>
          GitHub:{' '}
          <a href="https://github.com/antonio-puopolo/mission-control-v2" style={{ color: '#00D4AA', textDecoration: 'none' }}>
            antonio-puopolo/mission-control-v2
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App
