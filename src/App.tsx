import { useState, useEffect } from 'react'
import { LayoutDashboard, Home, FolderKanban, CalendarDays, Cpu, Activity, TrendingUp, BarChart2 } from "lucide-react"
import { useDashboardStore } from '@/store/dashboardStore'
import { Dashboard } from '@/features/Dashboard/Dashboard'
import { LAPTracker } from '@/features/LAPTracker/LAPTracker'
import { SystemDashboard } from '@/components/SystemDashboard'
import { Health } from '@/features/Health/Health'
import { Projects } from '@/features/Projects/Projects'
import { Calendar } from '@/features/Calendar/Calendar'
import { MarketPulse } from '@/features/MarketPulse/MarketPulse'
import { GeorgeMCPopup } from '@/components/George/GeorgeMCPopup'
import './App.css'

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "lap-tracker", label: "LAP Tracker", icon: Home },
  { id: "market-pulse", label: "Market Pulse", icon: BarChart2 },
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
  
  // Extract weather fetching to avoid duplication
  const fetchWeather = async () => {
    try {
      const response = await fetch(
        'https://api.open-meteo.com/v1/forecast?latitude=-27.4698&longitude=153.0251&current=temperature_2m,weather_code&timezone=Australia/Brisbane',
        { signal: AbortSignal.timeout(5000) } // 5 second timeout
      )
      if (response.ok) {
        const data = await response.json()
        setWeather({ 
          temp: Math.round(data.current.temperature_2m), 
          icon: weatherIcon(data.current.weather_code) 
        })
      }
    } catch (error) {
      // Silently fail - weather is nice-to-have, not critical
      console.debug('Weather fetch failed:', error)
    }
  }
  
  useEffect(() => {
    fetchWeather() // Initial fetch
    const weatherInterval = setInterval(fetchWeather, 30 * 60 * 1000) // Every 30 min
    return () => clearInterval(weatherInterval)
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
        {activeTab === 'market-pulse' && <MarketPulse />}
        {activeTab === 'projects' && <Projects />}
        {activeTab === 'calendar' && <Calendar />}
        {activeTab === 'system' && <SystemDashboard />}
        {activeTab === 'health' && <Health />}

      </main>

      {/* George MC Popup — floating AI assistant */}
      <GeorgeMCPopup currentTab={activeTab} />

      <footer className="mc-footer">
        Mission Control v3 • Antonio Puopolo × Hamm 🐷
      </footer>


    </div>
  )
}

export default App
