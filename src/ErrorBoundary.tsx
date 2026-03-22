import React from 'react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error) {
    console.error('Error caught:', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: '#fff', background: '#050508', minHeight: '100vh' }}>
          <h1>❌ App Error</h1>
          <pre style={{ background: '#0f0f14', padding: '1rem', borderRadius: '4px', overflow: 'auto', color: '#ff6b6b' }}>
            {this.state.error?.message || 'Unknown error'}
          </pre>
          <p style={{ color: '#a0a0b0', marginTop: '1rem' }}>Check the browser console (F12) for more details.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '0.75rem 1.5rem', background: '#F59E0B', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: '600', marginTop: '1rem' }}>
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
