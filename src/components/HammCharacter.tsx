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
  const [mouthOpen, setMouthOpen] = useState(0) // 0 = closed, 1 = fully open
  const [blinkLeft, setBlinkLeft] = useState(false)
  const [blinkRight, setBlinkRight] = useState(false)
  const rafRef = useRef<number | null>(null)

  const conversation = useConversation({
    onConnect: () => {
      setState('listening')
      setError(null)
    },
    onDisconnect: () => {
      setState('idle')
      setMouthOpen(0)
    },
    onError: (err: unknown) => {
      setError(typeof err === 'string' ? err : 'Connection failed')
      setState('idle')
    },
  })

  // Update state from isSpeaking
  useEffect(() => {
    if (conversation.status === 'connected') {
      setState(conversation.isSpeaking ? 'speaking' : 'listening')
    } else if (conversation.status === 'connecting') {
      setState('connecting')
    }
  }, [conversation.status, conversation.isSpeaking])

  // Real-time lip sync via audio frequency data
  useEffect(() => {
    const animate = () => {
      if (conversation.status === 'connected' && conversation.isSpeaking) {
        try {
          const freqData = conversation.getOutputByteFrequencyData()
          if (freqData && freqData.length > 0) {
            // Average lower frequencies (more relevant to speech/voice)
            const voiceRange = freqData.slice(0, Math.floor(freqData.length * 0.4))
            const avg = voiceRange.reduce((a: number, b: number) => a + b, 0) / voiceRange.length
            const normalised = Math.min(avg / 90, 1) // 0–1
            setMouthOpen(normalised)
          } else {
            // Fallback: oscillate when speaking but no data
            setMouthOpen((prev) => {
              const next = prev + (Math.random() > 0.5 ? 0.15 : -0.15)
              return Math.max(0, Math.min(1, next))
            })
          }
        } catch {
          setMouthOpen(0)
        }
      } else {
        setMouthOpen(0)
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [conversation])

  // Random blinking
  useEffect(() => {
    const blink = () => {
      setBlinkLeft(true)
      setTimeout(() => setBlinkLeft(false), 120)
      setTimeout(() => {
        setBlinkRight(true)
        setTimeout(() => setBlinkRight(false), 120)
      }, 40)
    }
    const interval = setInterval(blink, 2500 + Math.random() * 2000)
    return () => clearInterval(interval)
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

  // Mouth path: morphs between closed line and open oval
  const mouthY = 270
  const mouthCX = 140
  const mouthOpen1 = mouthOpen * 18 // vertical opening (max 18px)
  const mouthPath = mouthOpen < 0.05
    ? `M ${mouthCX - 22} ${mouthY} Q ${mouthCX} ${mouthY + 4} ${mouthCX + 22} ${mouthY}`
    : `M ${mouthCX - 22} ${mouthY} 
       Q ${mouthCX} ${mouthY - 3} ${mouthCX + 22} ${mouthY}
       Q ${mouthCX + 22} ${mouthY + mouthOpen1} ${mouthCX} ${mouthY + mouthOpen1 + 3}
       Q ${mouthCX - 22} ${mouthY + mouthOpen1} ${mouthCX - 22} ${mouthY}`

  // Eye height: 0 = open, eyeH = blinked closed
  const eyeHLeft = blinkLeft ? 11 : 0
  const eyeHRight = blinkRight ? 11 : 0

  return (
    <div className={`hamm-root ${state}`}>
      {/* Header */}
      <div className="hamm-header">
        <span className="hamm-pig">🐷</span>
        <span className="hamm-name">Hamm</span>
      </div>

      {/* Stage */}
      <div className="hamm-stage">
        {/* Sonar rings */}
        <div className="hamm-rings">
          <div className="hamm-ring" />
          <div className="hamm-ring" />
          <div className="hamm-ring" />
        </div>

        <div className="hamm-character-wrap">
          <div className="hamm-glow" />

          {/* SVG Character */}
          <svg
            className="hamm-svg"
            viewBox="0 0 280 370"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <radialGradient id="skinGrad" cx="50%" cy="40%" r="55%">
                <stop offset="0%" stopColor="#f9d5b0" />
                <stop offset="100%" stopColor="#e8b48a" />
              </radialGradient>
              <radialGradient id="eyeGrad" cx="50%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#80eeff" />
                <stop offset="60%" stopColor="#00d4ff" />
                <stop offset="100%" stopColor="#0088bb" />
              </radialGradient>
              <filter id="eyeGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="softGlow">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <clipPath id="eyeClipLeft">
                <ellipse cx="105" cy="175" rx="22" ry="13" />
              </clipPath>
              <clipPath id="eyeClipRight">
                <ellipse cx="175" cy="175" rx="22" ry="13" />
              </clipPath>
            </defs>

            {/* ── BODY / SUIT ── */}
            {/* Suit jacket */}
            <path d="M 60 340 L 60 280 Q 70 260 140 258 Q 210 260 220 280 L 220 340 Z"
              fill="#1a1f3a" />
            {/* Shirt / tie area */}
            <path d="M 120 260 L 140 310 L 160 260 Q 155 255 140 256 Q 125 255 120 260 Z"
              fill="#e8e8f0" />
            {/* Tie */}
            <path d="M 136 265 L 140 320 L 144 265 Q 142 260 140 260 Q 138 260 136 265 Z"
              fill="#cc2244" />
            {/* Lapels */}
            <path d="M 120 260 L 95 290 L 110 290 L 140 260 Z" fill="#252a4a" />
            <path d="M 160 260 L 185 290 L 170 290 L 140 260 Z" fill="#252a4a" />

            {/* ── NECK ── */}
            <rect x="124" y="248" width="32" height="18" rx="8" fill="#e8b48a" />

            {/* ── HEAD ── */}
            {/* Head shape */}
            <ellipse cx="140" cy="160" rx="105" ry="115" fill="url(#skinGrad)" />
            {/* Subtle jaw shadow */}
            <ellipse cx="140" cy="245" rx="70" ry="18" fill="rgba(0,0,0,0.08)" />
            {/* Cheek blush (subtle) */}
            <ellipse cx="92" cy="210" rx="22" ry="14" fill="rgba(255,140,120,0.18)" />
            <ellipse cx="188" cy="210" rx="22" ry="14" fill="rgba(255,140,120,0.18)" />

            {/* ── HAIR ── */}
            {/* Main hair mass */}
            <path d="M 45 125 Q 50 30 140 25 Q 230 30 235 125 Q 220 60 140 55 Q 60 60 45 125 Z"
              fill="#1a1a2e" />
            {/* Side hair left */}
            <path d="M 35 140 Q 32 100 50 80 Q 45 120 48 155 Z"
              fill="#1a1a2e" />
            {/* Side hair right */}
            <path d="M 245 140 Q 248 100 230 80 Q 235 120 232 155 Z"
              fill="#1a1a2e" />
            {/* Hair detail / strand */}
            <path d="M 95 30 Q 100 20 115 25 Q 108 35 100 45 Z" fill="#252540" />
            <path d="M 140 22 Q 145 12 158 18 Q 150 30 142 38 Z" fill="#252540" />

            {/* ── EARS ── */}
            <ellipse cx="34" cy="165" rx="16" ry="22" fill="#e8b48a" />
            <ellipse cx="34" cy="165" rx="9" ry="14" fill="#d4956a" />
            <ellipse cx="246" cy="165" rx="16" ry="22" fill="#e8b48a" />
            <ellipse cx="246" cy="165" rx="9" ry="14" fill="#d4956a" />

            {/* ── EYEBROWS ── */}
            <path d="M 83 148 Q 97 140 119 144" stroke="#1a1a2e" strokeWidth="4"
              strokeLinecap="round" fill="none" />
            <path d="M 161 144 Q 183 140 197 148" stroke="#1a1a2e" strokeWidth="4"
              strokeLinecap="round" fill="none" />

            {/* ── EYES ── */}
            {/* Left eye */}
            <g filter="url(#eyeGlow)">
              <ellipse cx="105" cy="175" rx="22" ry="13" fill="#0a0a1a" />
              <g clipPath="url(#eyeClipLeft)">
                {/* Iris */}
                <ellipse cx="105" cy="175" rx="14" ry="12" fill="url(#eyeGrad)" />
                {/* Pupil */}
                <ellipse cx="106" cy="176" rx="7" ry="8" fill="#001520" />
                {/* Highlight */}
                <ellipse cx="100" cy="170" rx="4" ry="3" fill="rgba(255,255,255,0.7)" />
                {/* Blink lid */}
                <rect x="83" y="163" width="44" height={eyeHLeft} fill="#e8b48a" />
              </g>
            </g>

            {/* Right eye */}
            <g filter="url(#eyeGlow)">
              <ellipse cx="175" cy="175" rx="22" ry="13" fill="#0a0a1a" />
              <g clipPath="url(#eyeClipRight)">
                {/* Iris */}
                <ellipse cx="175" cy="175" rx="14" ry="12" fill="url(#eyeGrad)" />
                {/* Pupil */}
                <ellipse cx="176" cy="176" rx="7" ry="8" fill="#001520" />
                {/* Highlight */}
                <ellipse cx="170" cy="170" rx="4" ry="3" fill="rgba(255,255,255,0.7)" />
                {/* Blink lid */}
                <rect x="153" y="163" width="44" height={eyeHRight} fill="#e8b48a" />
              </g>
            </g>

            {/* ── NOSE ── */}
            <ellipse cx="140" cy="220" rx="10" ry="7" fill="rgba(0,0,0,0.1)" />
            <ellipse cx="133" cy="222" rx="5" ry="4" fill="rgba(0,0,0,0.15)" />
            <ellipse cx="147" cy="222" rx="5" ry="4" fill="rgba(0,0,0,0.15)" />

            {/* ── MOUTH (lip sync) ── */}
            <path
              d={mouthPath}
              fill={mouthOpen > 0.1 ? '#1a0510' : 'none'}
              stroke="#b07050"
              strokeWidth="2.5"
              strokeLinecap="round"
              style={{ transition: mouthOpen > 0.05 ? 'none' : 'd 0.1s ease' }}
            />
            {/* Upper lip line when open */}
            {mouthOpen > 0.1 && (
              <path
                d={`M ${mouthCX - 22} ${mouthY} Q ${mouthCX} ${mouthY - 3} ${mouthCX + 22} ${mouthY}`}
                fill="none"
                stroke="#b07050"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            )}
            {/* Teeth when mouth open enough */}
            {mouthOpen > 0.3 && (
              <path
                d={`M ${mouthCX - 18} ${mouthY + 2} Q ${mouthCX} ${mouthY + 1} ${mouthCX + 18} ${mouthY + 2}
                    L ${mouthCX + 18} ${mouthY + Math.min(mouthOpen1 * 0.5, 8)}
                    Q ${mouthCX} ${mouthY + Math.min(mouthOpen1 * 0.5 + 1, 9)} ${mouthCX - 18} ${mouthY + Math.min(mouthOpen1 * 0.5, 8)} Z`}
                fill="#f5f0e8"
              />
            )}

            {/* Eye glow overlay when speaking/listening */}
            {state !== 'idle' && (
              <>
                <ellipse cx="105" cy="175" rx="22" ry="13"
                  fill="none"
                  stroke={state === 'speaking' ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.2)'}
                  strokeWidth="2"
                  filter="url(#softGlow)"
                />
                <ellipse cx="175" cy="175" rx="22" ry="13"
                  fill="none"
                  stroke={state === 'speaking' ? 'rgba(0,212,255,0.5)' : 'rgba(0,212,255,0.2)'}
                  strokeWidth="2"
                  filter="url(#softGlow)"
                />
              </>
            )}
          </svg>
        </div>
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
          className={`hamm-btn ${
            isConnecting
              ? 'hamm-btn-connecting'
              : isActive
              ? 'hamm-btn-end'
              : 'hamm-btn-start'
          }`}
          onClick={isActive ? stopConversation : startConversation}
          disabled={isConnecting}
        >
          {isConnecting ? 'Connecting...' : isActive ? 'End Conversation' : 'Start Conversation'}
        </button>
      </div>
    </div>
  )
}
