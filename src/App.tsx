import { useDashboardStore } from './store/dashboardStore'

function App() {
  const { gciCurrent, gciTarget, activeTab, setActiveTab } = useDashboardStore()
  const gciPercent = Math.round((gciCurrent / gciTarget) * 100)

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', background: '#050508', color: '#fff', minHeight: '100vh' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1>🎯 Mission Control</h1>
        <p style={{ color: '#a0a0b0' }}>Antonio's Real Estate Command Center (React v2)</p>
      </header>

      <nav style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
        {['dashboard', 'lap-tracker', 'agents', 'team'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '0.5rem 1rem',
              background: activeTab === tab ? '#00D4AA' : 'transparent',
              color: activeTab === tab ? '#000' : '#fff',
              border: 'none',
              cursor: 'pointer',
              borderRadius: '4px',
              fontWeight: activeTab === tab ? '600' : '400',
            }}
          >
            {tab.toUpperCase()}
          </button>
        ))}
      </nav>

      <main>
        {activeTab === 'dashboard' && (
          <div style={{ background: '#141e1e', padding: '1.5rem', borderRadius: '8px' }}>
            <h2>Dashboard</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginTop: '1rem' }}>
              <div style={{ background: '#0f0f14', padding: '1rem', borderRadius: '8px' }}>
                <div style={{ color: '#a0a0b0', fontSize: '0.9rem' }}>GCI Progress</div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', marginTop: '0.5rem' }}>
                  ${gciCurrent.toLocaleString()}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#a0a0b0', marginTop: '0.5rem' }}>
                  {gciPercent}% of ${gciTarget.toLocaleString()} target
                </div>
                <div style={{ background: '#333', height: '8px', borderRadius: '4px', marginTop: '1rem', overflow: 'hidden' }}>
                  <div
                    style={{
                      background: '#00D4AA',
                      height: '100%',
                      width: `${gciPercent}%`,
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'dashboard' && (
          <div style={{ background: '#141e1e', padding: '1.5rem', borderRadius: '8px', color: '#a0a0b0' }}>
            {activeTab.toUpperCase()} tab - Coming soon in Phase 2
          </div>
        )}
      </main>

      <footer style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #333', color: '#a0a0b0', fontSize: '0.85rem' }}>
        <p>Mission Control v2 • React + TypeScript + Zustand + Supabase</p>
        <p>Building in GitHub: antonio-puopolo/mission-control</p>
      </footer>
    </div>
  )
}

export default App
