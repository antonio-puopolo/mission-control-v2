import { useConversation } from '@11labs/react'
import { useState, useCallback, useEffect, useRef } from 'react'
import { Application } from 'pixi.js'
import { Live2DModel } from 'pixi-live2d-display/cubism4'

const AGENT_ID = 'agent_9501kk0dwrjheyy8qwbkxwznm8jr'
const MODEL_PATH = '/models/mark/Mark.model3.json'

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
  const [modelReady, setModelReady] = useState(false)
  const [waveAmplitudes, setWaveAmplitudes] = useState<number[]>(Array(12).fill(0))

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const appRef = useRef<Application | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef = useRef<any>(null)
  const rafRef = useRef<number | null>(null)
  const motionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Init Live2D
  useEffect(() => {
    if (!canvasRef.current) return

    const canvas = canvasRef.current
    const w = canvas.clientWidth || 400
    const h = canvas.clientHeight || 600

    const app = new Application({
      view: canvas,
      width: w,
      height: h,
      backgroundAlpha: 0,
      antialias: true,
      autoDensity: true,
      resolution: window.devicePixelRatio || 1,
    })
    appRef.current = app

    Live2DModel.from(MODEL_PATH, { autoInteract: false })
      .then((model) => {
        modelRef.current = model
        app.stage.addChild(model as unknown as import('pixi.js').DisplayObject)

        // Centre and scale model to fill the canvas nicely
        model.anchor.set(0.5, 0.5)
        model.x = w / 2
        model.y = h / 2 + 40
        const scale = Math.min(w / model.internalModel.originalWidth, h / model.internalModel.originalHeight) * 1.1
        model.scale.set(scale)

        // Start idle motion loop
        const playIdleMotion = () => {
          const idx = Math.floor(Math.random() * 6)
          model.motion('Idle', idx)
          motionTimerRef.current = setTimeout(playIdleMotion, 8000 + Math.random() * 4000)
        }
        playIdleMotion()

        setModelReady(true)
      })
      .catch((err) => {
        console.error('Live2D load error:', err)
        setError('Failed to load character')
      })

    return () => {
      if (motionTimerRef.current) clearTimeout(motionTimerRef.current)
      app.destroy(false, { children: true })
    }
  }, [])

  // Lip sync loop
  useEffect(() => {
    const animate = () => {
      const model = modelRef.current
      if (model && conversation.status === 'connected' && conversation.isSpeaking) {
        try {
          const freqData = conversation.getOutputByteFrequencyData()
          if (freqData && freqData.length > 0) {
            const voiceRange = freqData.slice(0, Math.floor(freqData.length * 0.35))
            const avg = voiceRange.reduce((a: number, b: number) => a + b, 0) / voiceRange.length
            const mouthValue = Math.min(avg / 85, 1)

            // Set mouth open parameter
            model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', mouthValue)

            // Waveform bars
            const bars = 12
            const chunkSize = Math.floor(freqData.length / bars)
            setWaveAmplitudes(Array.from({ length: bars }, (_, i) => {
              const chunk = freqData.slice(i * chunkSize, (i + 1) * chunkSize)
              return Math.min(chunk.reduce((a: number, b: number) => a + b, 0) / chunk.length / 128, 1)
            }))
          } else {
            // Fallback: simulate mouth movement
            const v = Math.abs(Math.sin(Date.now() / 120)) * 0.7
            model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', v)
            setWaveAmplitudes(Array(12).fill(0).map(() => Math.random() * 0.5))
          }
        } catch {
          // silently ignore
        }
      } else if (model) {
        // Close mouth when not speaking
        try {
          model.internalModel.coreModel.setParameterValueById('ParamMouthOpenY', 0)
        } catch { /* ignore */ }
        setWaveAmplitudes(Array(12).fill(0))
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
      {/* Header */}
      <div className="hamm-header">
        <span className="hamm-pig">🐷</span>
        <span className="hamm-name">Hamm</span>
      </div>

      {/* Live2D Stage */}
      <div className="hamm-stage">
        {/* Sonar rings */}
        <div className="hamm-rings">
          <div className="hamm-ring" />
          <div className="hamm-ring" />
          <div className="hamm-ring" />
        </div>

        {/* Glow */}
        <div className="hamm-glow" />

        {/* Loading overlay */}
        {!modelReady && (
          <div className="hamm-loading">
            <div className="hamm-loading-spinner" />
            <span>Loading character...</span>
          </div>
        )}

        <canvas
          ref={canvasRef}
          className="hamm-canvas"
          style={{ opacity: modelReady ? 1 : 0 }}
        />
      </div>

      {/* Waveform */}
      <div className="hamm-waveform">
        {waveAmplitudes.map((amp, i) => (
          <div
            key={i}
            className="hamm-wave-bar"
            style={{
              height: `${Math.max(amp * 40, 3)}px`,
              opacity: state === 'speaking' ? 0.6 + amp * 0.4 : 0.12,
              background: state === 'speaking'
                ? `rgba(0,212,255,${0.4 + amp * 0.6})`
                : 'rgba(255,255,255,0.15)',
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
