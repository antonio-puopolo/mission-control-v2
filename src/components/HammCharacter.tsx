import { useConversation } from '@11labs/react'
import { useState, useCallback, useEffect, useRef } from 'react'

const AGENT_ID = 'agent_9501kk0dwrjheyy8qwbkxwznm8jr'

type State = 'idle' | 'connecting' | 'listening' | 'speaking'

const STATUS_TEXT: Record<State, string> = {
  idle: 'Tap to wake Hamm',
  connecting: 'Connecting...',
  listening: 'Listening',
  speaking: 'Speaking',
}

export function HammCharacter() {
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  const [mouthOpen, setMouthOpen] = useState(0)
  const [blinkLeft, setBlinkLeft] = useState(false)
  const [blinkRight, setBlinkRight] = useState(false)
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>(Array(12).fill(0))
  const rafRef = useRef<number | null>(null)

  const conversation = useConversation({
    onConnect: () => { setState('listening'); setError(null) },
    onDisconnect: () => { setState('idle'); setMouthOpen(0) },
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

  // Real-time lip sync + waveform via audio frequency data
  useEffect(() => {
    const animate = () => {
      if (conversation.status === 'connected' && conversation.isSpeaking) {
        try {
          const freqData = conversation.getOutputByteFrequencyData()
          if (freqData && freqData.length > 0) {
            // Mouth openness from lower frequencies
            const voiceRange = freqData.slice(0, Math.floor(freqData.length * 0.35))
            const avg = voiceRange.reduce((a: number, b: number) => a + b, 0) / voiceRange.length
            setMouthOpen(Math.min(avg / 85, 1))

            // Waveform bars from across spectrum
            const bars = 12
            const chunkSize = Math.floor(freqData.length / bars)
            const amps = Array.from({ length: bars }, (_, i) => {
              const chunk = freqData.slice(i * chunkSize, (i + 1) * chunkSize)
              const chunkAvg = chunk.reduce((a: number, b: number) => a + b, 0) / chunk.length
              return Math.min(chunkAvg / 128, 1)
            })
            setWaveAmplitudes(amps)
          } else {
            // Fallback oscillation
            setMouthOpen(prev => Math.max(0, Math.min(1, prev + (Math.random() > 0.5 ? 0.2 : -0.2))))
            setWaveAmplitudes(Array(12).fill(0).map(() => Math.random() * 0.6))
          }
        } catch {
          setMouthOpen(0)
          setWaveAmplitudes(Array(12).fill(0))
        }
      } else {
        setMouthOpen(0)
        setWaveAmplitudes(Array(12).fill(0))
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [conversation])

  // Natural eye blinking
  useEffect(() => {
    const scheduleBlink = () => {
      const delay = 2000 + Math.random() * 3500
      return setTimeout(() => {
        setBlinkLeft(true)
        setTimeout(() => setBlinkLeft(false), 110)
        setTimeout(() => { setBlinkRight(true); setTimeout(() => setBlinkRight(false), 110) }, 35)
        scheduleBlink()
      }, delay)
    }
    const t = scheduleBlink()
    return () => clearTimeout(t)
  }, [])

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
    setMouthOpen(0)
  }, [conversation])

  const isActive = state !== 'idle'
  const isConnecting = state === 'connecting'

  // Mouth path morphing (closed → open oval)
  const mouthY = 54.5  // % from top of image — tweak if needed
  const mouthOpenPx = mouthOpen * 2.2  // vh units

  const eyeScaleLeft = blinkLeft ? 'scaleY(0.05)' : 'scaleY(1)'
  const eyeScaleRight = blinkRight ? 'scaleY(0.05)' : 'scaleY(1)'

  return (
    <div className={`hamm-root ${state}`}>
      {/* Header */}
      <div className="hamm-header">
        <span className="hamm-pig">🐷</span>
        <span className="hamm-name">Hamm</span>
      </div>

      {/* Character Stage */}
      <div className="hamm-stage">
        {/* Sonar rings */}
        <div className="hamm-rings">
          <div className="hamm-ring" />
          <div className="hamm-ring" />
          <div className="hamm-ring" />
        </div>

        <div className="hamm-character-wrap">
          {/* Glow behind character */}
          <div className="hamm-glow" />

          {/* Character image */}
          <div className="hamm-img-wrap">
            <img
              src="/hamm-avatar.png"
              alt="Hamm"
              className="hamm-img"
              draggable={false}
            />

            {/* Eye blink overlays — positioned over the character's eyes */}
            <div
              className="hamm-eye-overlay hamm-eye-left"
              style={{ transform: eyeScaleLeft }}
            />
            <div
              className="hamm-eye-overlay hamm-eye-right"
              style={{ transform: eyeScaleRight }}
            />

            {/* Mouth overlay for lip sync */}
            <div className="hamm-mouth-wrap" style={{ bottom: `${100 - mouthY}%` }}>
              <svg
                className="hamm-mouth-svg"
                viewBox="0 0 60 30"
                xmlns="http://www.w3.org/2000/svg"
              >
                {/* Dark mouth interior */}
                {mouthOpen > 0.05 && (
                  <ellipse
                    cx="30"
                    cy="15"
                    rx="22"
                    ry={Math.max(mouthOpenPx * 4, 0.5)}
                    fill="#1a0510"
                  />
                )}
                {/* Teeth when open enough */}
                {mouthOpen > 0.25 && (
                  <rect
                    x="12"
                    y="14"
                    width="36"
                    height={Math.min(mouthOpenPx * 2, 6)}
                    rx="1"
                    fill="#f0ede8"
                    opacity="0.9"
                  />
                )}
                {/* Lip line */}
                <path
                  d={
                    mouthOpen < 0.05
                      ? 'M 8 15 Q 30 18 52 15'
                      : `M 8 ${15 - mouthOpenPx} Q 30 ${12 - mouthOpenPx} 52 ${15 - mouthOpenPx}`
                  }
                  stroke="#7a4a40"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d={
                    mouthOpen < 0.05
                      ? 'M 8 15 Q 30 18 52 15'
                      : `M 8 ${15 + mouthOpenPx} Q 30 ${18 + mouthOpenPx} 52 ${15 + mouthOpenPx}`
                  }
                  stroke="#7a4a40"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Audio waveform */}
      <div className="hamm-waveform">
        {waveAmplitudes.map((amp, i) => (
          <div
            key={i}
            className="hamm-wave-bar"
            style={{
              height: `${Math.max(amp * 40, 3)}px`,
              opacity: state === 'speaking' ? 0.7 + amp * 0.3 : 0.15,
              background: state === 'speaking'
                ? `rgba(0, 212, 255, ${0.5 + amp * 0.5})`
                : 'rgba(255,255,255,0.2)',
            }}
          />
        ))}
      </div>

      {/* Status */}
      <div className="hamm-status">
        <div className="hamm-status-dot" />
        {STATUS_TEXT[state]}
      </div>

      {/* Button */}
      <div className="hamm-btn-wrap">
        {error && <div className="hamm-error">{error}</div>}
        <button
          className={`hamm-btn ${isConnecting ? 'hamm-btn-connecting' : isActive ? 'hamm-btn-end' : 'hamm-btn-start'}`}
          onClick={isActive ? stopConversation : startConversation}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : isActive ? 'End Conversation' : 'Start Conversation'}
        </button>
      </div>
    </div>
  )
}
