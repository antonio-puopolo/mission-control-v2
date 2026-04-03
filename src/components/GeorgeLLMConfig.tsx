import { useState, useEffect } from 'react'
import { Settings, Eye, EyeOff, Loader2, CheckCircle2, XCircle } from 'lucide-react'

interface ProviderModels {
  [key: string]: { id: string; label: string }[]
}

interface Providers {
  [key: string]: {
    name: string
    baseUrl: string | null
    defaultModel: string
    models: { id: string; label: string }[]
  }
}

interface Config {
  provider: string
  model: string
  hasApiKey: boolean
  maskedKey?: string
  updatedAt?: string
  providers: Providers
}

const card: React.CSSProperties = {
  background: '#0d1320',
  borderRadius: '12px',
  padding: '1.5rem',
  border: '1px solid #1e3a5f33',
}

const label: React.CSSProperties = {
  color: '#64748b',
  fontSize: '0.72rem',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: '0.25rem',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem 0.75rem',
  background: '#060d1a',
  border: '1px solid #1e3a5f',
  borderRadius: '8px',
  color: '#e2e8f0',
  fontSize: '0.82rem',
  outline: 'none',
  boxSizing: 'border-box',
}

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
  appearance: 'none',
  backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%2394a3b8\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center',
  paddingRight: '2rem',
}

export function GeorgeLLMConfig() {
  const [config, setConfig] = useState<Config | null>(null)
  const [loading, setLoading] = useState(true)
  const [provider, setProvider] = useState('')
  const [model, setModel] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => { fetchConfig() }, [])

  async function fetchConfig() {
    setLoading(true)
    try {
      const res = await fetch('/api/george-llm')
      const data = await res.json()
      setConfig(data)
      setProvider(data.provider || 'groq')
      setModel(data.model || 'llama-3.3-70b-versatile')
    } catch (e: any) {
      console.error('Failed to fetch George LLM config:', e)
    } finally {
      setLoading(false)
    }
  }

  const providers = config?.providers || {}
  const currentModels: ProviderModels = provider && providers[provider]
    ? { [provider]: providers[provider].models }
    : {}

  function handleProviderChange(p: string) {
    setProvider(p)
    setModel(providers[p]?.defaultModel || '')
    setTestResult(null)
  }

  async function handleTest() {
    setTesting(true)
    setTestResult(null)
    try {
      const res = await fetch('/api/george-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', provider, apiKey, model }),
      })
      const data = await res.json()
      setTestResult(data)
    } catch (e: any) {
      setTestResult({ ok: false, error: e.message })
    } finally {
      setTesting(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    setSaveMsg(null)
    try {
      const body: any = { provider, model }
      if (apiKey.trim()) body.apiKey = apiKey.trim()
      const res = await fetch('/api/george-llm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (data.success) {
        setSaveMsg('✅ Config saved — George will use ' + providers[provider]?.name)
        if (apiKey.trim()) setApiKey('') // clear input after save
        setTimeout(fetchConfig, 1000)
        setTimeout(() => setSaveMsg(null), 4000)
      } else {
        setSaveMsg('❌ ' + (data.error || 'Save failed'))
      }
    } catch (e: any) {
      setSaveMsg('❌ ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div style={{ ...card }}>
        <div style={label}>George LLM Config</div>
        <div style={{ color: '#475569', fontSize: '0.85rem', marginTop: '0.5rem' }}>Loading…</div>
      </div>
    )
  }

  return (
    <div style={card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <Settings size={14} color="#64748b" />
        <div style={label}>George LLM Config</div>
      </div>

      <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: '1rem' }}>
        Choose which LLM powers George's voice responses. Changes apply to new conversations.
        {config?.hasApiKey && config?.maskedKey && (
          <span style={{ marginLeft: '0.5rem', fontFamily: 'monospace', color: '#334155' }}>
            Key: {config.maskedKey}
          </span>
        )}
      </div>

      {/* Provider select */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ ...label, marginBottom: '0.3rem' }}>Provider</div>
        <select style={selectStyle} value={provider} onChange={(e) => handleProviderChange(e.target.value)}>
          {Object.entries(providers).map(([key, prov]: [string, any]) => (
            <option key={key} value={key}>{prov.name}</option>
          ))}
        </select>
      </div>

      {/* Model select */}
      <div style={{ marginBottom: '0.75rem' }}>
        <div style={{ ...label, marginBottom: '0.3rem' }}>Model</div>
        <select style={selectStyle} value={model} onChange={(e) => setModel(e.target.value)}>
          {currentModels[provider]?.map((m: any) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </div>

      {/* API Key input */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ ...label, marginBottom: '0.3rem' }}>
          API Key {config?.hasApiKey && <span style={{ color: '#22c55e' }}>(saved)</span>}
        </div>
        <div style={{ position: 'relative' }}>
          <input
            type={showKey ? 'text' : 'password'}
            style={{ ...inputStyle, paddingRight: '2.5rem' }}
            placeholder={config?.hasApiKey ? 'Leave blank to keep current key' : 'Enter API key'}
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); setTestResult(null) }}
          />
          <button
            onClick={() => setShowKey(!showKey)}
            style={{
              position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: '#475569', cursor: 'pointer', padding: '0.25rem',
            }}
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Test result */}
      {testResult && (
        <div style={{
          fontSize: '0.78rem', marginBottom: '0.75rem', padding: '0.5rem 0.75rem',
          borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: testResult.ok ? '#22c55e10' : '#ef444410',
          border: `1px solid ${testResult.ok ? '#22c55e33' : '#ef444433'}`,
          color: testResult.ok ? '#22c55e' : '#ef4444',
        }}>
          {testResult.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
          {testResult.ok ? 'API key valid!' : testResult.error}
        </div>
      )}

      {/* Save message */}
      {saveMsg && (
        <div style={{ fontSize: '0.78rem', marginBottom: '0.75rem', color: saveMsg.startsWith('✅') ? '#22c55e' : '#ef4444' }}>
          {saveMsg}
        </div>
      )}

      {/* Buttons */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          onClick={handleTest}
          disabled={testing || (!apiKey && !config?.hasApiKey)}
          style={{
            padding: '0.45rem 0.85rem',
            background: testing ? '#0d1a2e' : '#1e3a5f33',
            border: '1px solid #1e3a5f',
            borderRadius: '8px',
            color: testing ? '#475569' : '#94a3b8',
            cursor: testing ? 'wait' : 'pointer',
            fontSize: '0.78rem',
            fontWeight: 600,
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            opacity: (!apiKey && !config?.hasApiKey) ? 0.4 : 1,
          }}
        >
          {testing ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          Test Key
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            padding: '0.45rem 0.85rem',
            background: saving ? '#0d1a2e' : '#00d4aa22',
            border: '1px solid #00d4aa44',
            borderRadius: '8px',
            color: '#00d4aa',
            cursor: saving ? 'wait' : 'pointer',
            fontSize: '0.78rem',
            fontWeight: 700,
            display: 'flex', alignItems: 'center', gap: '0.4rem',
          }}
        >
          {saving ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : null}
          Save Config
        </button>
      </div>
    </div>
  )
}
