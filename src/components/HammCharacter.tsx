import { useConversation } from '@11labs/react'
import { useState, useCallback, useEffect, useRef } from 'react'
import { GeorgeOrb } from './GeorgeOrb'

type ConversationWithFrequency = ReturnType<typeof useConversation> & {
  getOutputByteFrequencyData?: () => Uint8Array
}

const AGENT_ID = 'agent_9501kk0dwrjheyy8qwbkxwznm8jr'

type State = 'idle' | 'connecting' | 'listening' | 'speaking'

function useOrbSize() {
  const [size, setSize] = useState(() => Math.min(window.innerWidth, window.innerHeight) * 0.52)
  useEffect(() => {
    const update = () => setSize(Math.min(window.innerWidth, window.innerHeight) * 0.52)
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])
  return Math.round(size)
}

export function HammCharacter() {
  const [state, setState] = useState<State>('idle')
  const [error, setError] = useState<string | null>(null)
  const [audioData, setAudioData] = useState<Uint8Array | null>(null)
  const rafRef = useRef<number | null>(null)
  const orbSize = useOrbSize()

  const conversation = useConversation({
    onConnect: () => { setState('listening'); setError(null) },
    onDisconnect: () => { setState('idle') },
    onError: (err: unknown) => {
      setError(typeof err === 'string' ? err : 'Connection failed')
      setState('idle')
    },
  }) as ConversationWithFrequency

  useEffect(() => {
    if (conversation.status === 'connected') {
      setState(conversation.isSpeaking ? 'speaking' : 'listening')
    } else if (conversation.status === 'connecting') {
      setState('connecting')
    }
  }, [conversation.status, conversation.isSpeaking])

  // rafRef cleanup on unmount
  useEffect(() => {
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  // Poll frequency data at ~60fps while George is speaking
  useEffect(() => {
    if (state !== 'speaking') {
      setAudioData(null)
      return
    }
    let raf: number
    const poll = () => {
      try {
        const data = conversation.getOutputByteFrequencyData?.()
        if (data && data.length > 0) setAudioData(new Uint8Array(data))
      } catch { /* ignore if not available */ }
      raf = requestAnimationFrame(poll)
    }
    raf = requestAnimationFrame(poll)
    return () => cancelAnimationFrame(raf)
  }, [state, conversation])

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

  const orbStatus = state === 'listening' ? 'listening' : state === 'speaking' ? 'speaking' : 'idle'

  return (
    <div className={`hamm-root ${state}`}>

      <GeorgeOrb
        status={orbStatus}
        onClick={isActive ? stopConversation : startConversation}
        size={orbSize}
        audioData={audioData}
      />

      <span className="hamm-hint">
        {isConnecting ? 'connecting...' : isActive ? 'tap to end' : 'tap to talk'}
      </span>

      {error && <div className="hamm-error">{error}</div>}

    </div>
  )
}
