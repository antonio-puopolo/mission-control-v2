import { useState, useEffect } from 'react'
import { LayoutDashboard, Home, FolderKanban, CalendarDays, Cpu, Activity, TrendingUp } from "lucide-react"
import { useDashboardStore } from '@/store/dashboardStore'
import { Dashboard } from '@/features/Dashboard/Dashboard'
import { LAPTracker } from '@/features/LAPTracker/LAPTracker'
import { SystemDashboard } from '@/components/SystemDashboard'
import { Health } from '@/features/Health/Health'
import { Projects } from '@/features/Projects/Projects'
import { Calendar } from '@/features/Calendar/Calendar'
import { Market } from '@/features/Market/Market'
import './App.css'

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "lap-tracker", label: "LAP Tracker", icon: Home },
  { id: "market", label: "Market", icon: TrendingUp },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "calendar", label: "Calendar", icon: CalendarDays },
  { id: "system", label: "System", icon: Cpu },
  { id: "health", label: "Health", icon: Activity },
]

function weatherIcon(code: number): string {
  if (code === 0) return '☀️'
  if (code <= 3) return '🌤️'
  if (code <= 48) return '🌫️'
  if (code <= 55) return '🌦️'
  if (code <= 67) return '🌧️'
  if (code <= 77) return '❄️'
  if (code <= 82) return '🌧️'
  if (code >= 95) return '⛈️'
  return '🌡️'
}

function App() {
  const { activeTab, setActiveTab } = useDashboardStore()

  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const [weather, setWeather] = useState<{ temp: number; icon: string } | null>(null)
  useEffect(() => {
    fetch('https://api.open-meteo.com/v1/forecast?latitude=-27.4698&longitude=153.0251&current=temperature_2m,weather_code&timezone=Australia/Brisbane')
      .then(r => r.json())
      .then(d => setWeather({ temp: Math.round(d.current.temperature_2m), icon: weatherIcon(d.current.weather_code) }))
      .catch(() => {})
    const wt = setInterval(() => {
      fetch('https://api.open-meteo.com/v1/forecast?latitude=-27.4698&longitude=153.0251&current=temperature_2m,weather_code&timezone=Australia/Brisbane')
        .then(r => r.json())
        .then(d => setWeather({ temp: Math.round(d.current.temperature_2m), icon: weatherIcon(d.current.weather_code) }))
        .catch(() => {})
    }, 30 * 60 * 1000)
    return () => clearInterval(wt)
  }, [])

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
            {weather && (
              <div className="mc-weather">
                <span className="mc-weather-icon">{weather.icon}</span>
                <span className="mc-weather-temp">{weather.temp}°</span>
              </div>
            )}
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
        {activeTab === 'market' && <Market />}
        {activeTab === 'calendar' && <Calendar />}
        {activeTab === 'system' && <SystemDashboard />}
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
        title="Talk to George"
      >
        🎙️ Talk to George
      </button>

      <footer className="mc-footer">
        Mission Control v3 • Antonio Puopolo × Hamm 🐷
      </footer>


    </div>
  )
}

export default App
