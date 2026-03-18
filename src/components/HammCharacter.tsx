import { useConversation } from '@11labs/react'
import { useState, useCallback, useEffect, useRef } from 'react'

const AGENT_ID = 'agent_9501kk0dwrjheyy8qwbkxwznm8jr'

type State = 'idle' | 'connecting' | 'listening' | 'speaking'

const STATUS_TEXT: Record<State, string> = {
  idle: 'Tap to talk',
  connecting: 'Connecting...',
  listening: 'Listening...',
  speaking: 'Speaking...',
}

export function HammCharacter() {
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>(Array(20).fill(0))
  const rafRef = useRef<number | null>(null)

  const conversation = useConversation({
    onConnect: () => { setState('listening'); setError(null) },
    onDisconnect: () => { setState('idle') },
    onError: (err: unknown) => {
      setError(typeof err === 'string' ? err : 'Connection failed')
      setState('idle')
    },
  })

  useEffect(() => {
    if (conversation.status === 'connected') {
      setState(conversation.isSpeaking ? 'speaking' : 'listening')
    } else if (conversation.status === 'connecting') {
      setState('connecting')
    }
  }, [conversation.status, conversation.isSpeaking])

  // Waveform animation
  useEffect(() => {
    const animate = () => {
      if (conversation.status === 'connected' && conversation.isSpeaking) {
        try {
          const freqData = conversation.getOutputByteFrequencyData()
          if (freqData && freqData.length > 0) {
            const bars = 20
            const chunk = Math.floor(freqData.length / bars)
            setWaveAmplitudes(Array.from({ length: bars }, (_, i) => {
              const c = freqData.slice(i * chunk, (i + 1) * chunk)
              return Math.min(c.reduce((a: number, b: number) => a + b, 0) / c.length / 100, 1)
            }))
          } else {
            setWaveAmplitudes(Array(20).fill(0).map(() => Math.random() * 0.7))
          }
        } catch {
          setWaveAmplitudes(Array(20).fill(0))
        }
      } else if (conversation.status === 'connected') {
        // Listening — subtle idle bars
        setWaveAmplitudes(Array(20).fill(0).map((_, i) =>
          Math.abs(Math.sin(Date.now() / 600 + i * 0.4)) * 0.15
        ))
      } else {
        setWaveAmplitudes(Array(20).fill(0))
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [conversation])

  const startConversation = useCallback(async () => {
    try {
      setError(null)
      setState('connecting')
      await navigator.mediaDevices.getUserMedia({ audio: true })
      await conversation.startSession({ agentId: AGENT_ID, connectionType: 'webrtc' })
    } catch {
      setError('Microphone access required')
      setState('idle')
    }
  }, [conversation])

  const stopConversation = useCallback(async () => {
    await conversation.endSession()
    setState('idle')
  }, [conversation])

  const isActive = state !== 'idle'
  const isConnecting = state === 'connecting'

  return (
    <div className={`hamm-root ${state}`}>

      {/* Avatar */}
      <div className="hamm-avatar-wrap">
        <div className={`hamm-avatar-ring ${state}`} />
        <div className={`hamm-avatar-ring hamm-avatar-ring-2 ${state}`} />
        <img
          src="/hamm-avatar.jpg"
          alt="Hamm"
          className={`hamm-avatar ${state}`}
          draggable={false}
        />
      </div>

      {/* Name */}
      <div className="hamm-header">
        <span className="hamm-name">Hamm</span>
        <span className="hamm-tagline">Your personal AI</span>
      </div>

      {/* Waveform */}
      <div className="hamm-waveform">
        {waveAmplitudes.map((amp, i) => (
          <div
            key={i}
            className="hamm-wave-bar"
            style={{
              height: `${Math.max(amp * 56, 3)}px`,
              opacity: isActive ? 0.5 + amp * 0.5 : 0.1,
              background: state === 'speaking'
                ? `rgba(0,212,255,${0.5 + amp * 0.5})`
                : state === 'listening'
                ? `rgba(255,255,255,${0.2 + amp * 0.3})`
                : 'rgba(255,255,255,0.15)',
              transform: `scaleY(${0.3 + amp * 0.7})`,
            }}
          />
        ))}
      </div>

      {/* Status */}
      <div className="hamm-status">
        <div className={`hamm-status-dot ${state}`} />
        <span>{STATUS_TEXT[state]}</span>
      </div>

      {/* Error */}
      {error && <div className="hamm-error">{error}</div>}

      {/* Button */}
      <button
        className={`hamm-btn ${isConnecting ? 'hamm-btn-connecting' : isActive ? 'hamm-btn-end' : 'hamm-btn-start'}`}
        onClick={isActive ? stopConversation : startConversation}
        disabled={isConnecting}
      >
        {isConnecting ? 'Connecting...' : isActive ? 'End' : 'Talk to Hamm'}
      </button>

    </div>
  )
}
