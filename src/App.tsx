import { useState, useEffect } from 'react'
import { LayoutDashboard, Home, FolderKanban, CalendarDays, Bot, Activity } from "lucide-react"
import { useDashboardStore } from '@/store/dashboardStore'
import { Dashboard } from '@/features/Dashboard/Dashboard'
import { LAPTracker } from '@/features/LAPTracker/LAPTracker'
import { Agents } from '@/features/Agents/Agents'
import { Health } from '@/features/Health/Health'
import { Projects } from '@/features/Projects/Projects'
import { Calendar } from '@/features/Calendar/Calendar'
import './App.css'

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "lap-tracker", label: "LAP Tracker", icon: Home },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "agents", label: "Agents", icon: Bot },
  { id: "health", label: "Health", icon: Activity },
]

function App() {
  const { activeTab, setActiveTab } = useDashboardStore()

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="mc-app">
      {/* Header */}
      <header className="mc-header">
        <div className="mc-header-inner">
          <div className="mc-brand">
            <span className="mc-logo">🎯</span>
            <div>
              <div className="mc-title">Mission Control</div>
              <div className="mc-subtitle">{greeting}, Antonio</div>
            </div>
          </div>
          <div className="mc-header-right">
            <div className="mc-clock">{now.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' })}</div>
            <div className="mc-status"><span className="mc-status-dot" />Live</div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="mc-nav">
        <div className="mc-nav-inner">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`mc-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
            >
              <span className="mc-nav-icon"><tab.icon size={15} strokeWidth={1.8} /></span>
              <span className="mc-nav-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="mc-main">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'lap-tracker' && <LAPTracker />}
        {activeTab === 'projects' && <Projects />}
        {activeTab === 'calendar' && <Calendar />}
        {activeTab === 'agents' && <Agents />}
        {activeTab === 'health' && <Health />}

      </main>

      {/* Talk to Hamm floating button */}
      <button
        onClick={() => window.open('/hamm', '_blank', 'width=480,height=820,toolbar=no,menubar=no,resizable=yes')}
        style={{
          position: 'fixed',
          bottom: '5rem',
          right: '1rem',
          background: "linear-gradient(135deg, #F59E0B, #D97706)",
          color: "#000",
          border: 'none',
          borderRadius: '50px',
          padding: '0.6rem 1rem',
          fontWeight: 700,
          fontSize: '0.8rem',
          cursor: 'pointer',
          boxShadow: "0 0 20px rgba(245,158,11,0.35)",
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: '0.4rem',
          letterSpacing: '0.03em',
        }}
        title="Talk to Hamm"
      >
        🐷 Talk to Hamm
      </button>

      <footer className="mc-footer">
        Mission Control v3 • Antonio Puopolo × Hamm 🐷
      </footer>


    </div>
  )
}

export default App
