import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Minimize2, Maximize2, Send, ChevronDown } from 'lucide-react'
import { ChatMessage, type Message } from './ChatMessage'
import { VoiceControls } from './VoiceControls'
import { callGroq, GroqRateLimitError, GroqAPIError, type ChatMessage as GroqMessage } from './groqClient'
import { executeTool } from './FunctionCaller'
import { GEORGE_TOOLS } from '@/services/georgeTools'
import {
  speakText,
  stopSpeaking,
  setMuted as setTTSMuted,
  setVolume as setTTSVolume,
  isSpeaking as checkIsSpeaking,
  unlockAudio,
} from '@/services/elevenLabsVoice'

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeorgeMCPopupProps {
  currentTab?: string
  selectedLapId?: string | null
  selectedLapAddress?: string | null
}

// ─── System Prompt ────────────────────────────────────────────────────────────

function buildSystemPrompt(currentTab: string, selectedLap?: string | null): string {
  return `You are George, the AI assistant embedded in Mission Control — Antonio Puopolo's real estate operations dashboard.

Antonio is a real estate agent at Place Real Estate (Hicks Team) in Brisbane, Australia. His focus area is Camp Hill. His boss is Shane Hicks.

**Your role:**
- Help Antonio manage his LAPs (Listing Appointment Presentations), projects, activities, and market data
- Be concise, sharp, and direct — like a top-performing colleague, not a corporate chatbot
- You have access to 8 tools: get_laps, update_lap, get_projects, update_project, get_activities, log_activity, get_market_data, get_goals
- Use tools proactively when the user asks about data, or needs to update something

**Current context:**
- Antonio is on the **${currentTab}** tab${selectedLap ? `\n- He has "${selectedLap}" selected/in view` : ''}

**Personality:**
- Sharp, helpful, no fluff
- Real estate domain expert
- Short responses for simple questions, detailed for complex ones
- When using tools, explain what you found concisely

**Key targets:**
- Weekly KPIs: 5 BAP / 2 MAP / 1 LAP
- Quarterly GCI target: $60K
- Monthly LAP target: 4 LAPs

Today's date: ${new Date().toLocaleDateString('en-AU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

**Your model:** Claude Haiku 4.5 (via OpenRouter)`
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GeorgeMCPopup({
  currentTab = 'dashboard',
  selectedLapId,
  selectedLapAddress,
}: GeorgeMCPopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [messages, setMessages] = useState<Message[]>(() => {
    // Restore message history from sessionStorage on mount
    try {
      const saved = sessionStorage.getItem('george-messages')
      if (saved) {
        const parsed = JSON.parse(saved) as Message[]
        // Re-hydrate Date objects and filter out loading indicators
        return parsed
          .filter(m => !m.isLoading)
          .map(m => ({ ...m, timestamp: new Date(m.timestamp) }))
      }
    } catch {
      // Ignore parse errors
    }
    return []
  })
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [retryStatus, setRetryStatus] = useState<string | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(0.85)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const abortRef = useRef<AbortController | null>(null)
  const speakingCheckRef = useRef<number | null>(null)

  // Check voice support
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    setVoiceSupported(!!SR)
  }, [])

  // Poll isSpeaking state
  useEffect(() => {
    speakingCheckRef.current = window.setInterval(() => {
      setIsSpeaking(checkIsSpeaking())
    }, 300)
    return () => {
      if (speakingCheckRef.current) clearInterval(speakingCheckRef.current)
    }
  }, [])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Persist message history to sessionStorage (survives tab switches, not page refreshes)
  useEffect(() => {
    try {
      const toSave = messages.filter(m => !m.isLoading)
      // Keep last 50 messages to avoid bloating storage
      const trimmed = toSave.slice(-50)
      sessionStorage.setItem('george-messages', JSON.stringify(trimmed))
    } catch {
      // Quota exceeded or private mode — ignore
    }
  }, [messages])

  // Focus input when opened
  useEffect(() => {
    if (isOpen && !isMinimized) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isMinimized])

  // Count unread when closed
  useEffect(() => {
    if (!isOpen) {
      const assistantMessages = messages.filter(m => m.role === 'assistant' && !m.isLoading)
      setUnreadCount(assistantMessages.length > 0 ? assistantMessages.length : 0)
    } else {
      setUnreadCount(0)
    }
  }, [isOpen, messages])

  // ── Message sending ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text.trim(),
      timestamp: new Date(),
    }

    const loadingMsg: Message = {
      id: `loading-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    }

    setMessages(prev => [...prev, userMsg, loadingMsg])
    setInput('')
    setIsLoading(true)

    abortRef.current = new AbortController()

    try {
      // Build conversation history for Groq
      const systemPrompt = buildSystemPrompt(currentTab, selectedLapAddress || selectedLapId)
      const groqMessages: GroqMessage[] = [
        { role: 'system', content: systemPrompt },
        // Include recent message history (last 20)
        ...messages
          .filter(m => !m.isLoading && m.role !== 'tool_result')
          .slice(-20)
          .map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content,
          })),
        { role: 'user', content: text.trim() },
      ]

      let response = await callGroq(groqMessages, GEORGE_TOOLS, abortRef.current.signal, (attempt, waitMs) => {
        const secs = Math.round(waitMs / 1000)
        setRetryStatus(`Rate limited — retrying in ${secs}s… (attempt ${attempt}/3)`)
      })
      let assistantMessage = response.choices[0].message

      // Handle tool calls (agentic loop — max 3 rounds)
      let rounds = 0
      while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0 && rounds < 3) {
        rounds++
        const toolCalls = assistantMessage.tool_calls

        // Add assistant message with tool calls to history
        // IMPORTANT: must include tool_calls so Groq can match tool_call_ids in tool results
        groqMessages.push({
          role: 'assistant',
          content: assistantMessage.content ?? null,
          tool_calls: assistantMessage.tool_calls,
        })

        // Execute each tool call
        const toolResults: GroqMessage[] = []
        for (const tc of toolCalls) {
          // Show tool execution indicator
          const toolResultMsg: Message = {
            id: `tool-${tc.id}`,
            role: 'tool_result',
            content: '',
            timestamp: new Date(),
            toolName: tc.function.name,
          }
          setMessages(prev => [...prev.filter(m => !m.isLoading), toolResultMsg])

          let result: unknown
          try {
            result = await executeTool(tc.function.name, tc.function.arguments)
          } catch (err) {
            result = { error: String(err), message: 'Tool execution failed' }
          }

          toolResults.push({
            role: 'tool',
            content: JSON.stringify(result),
            tool_call_id: tc.id,
            name: tc.function.name,
          })

          groqMessages.push({
            role: 'tool' as const,
            content: JSON.stringify(result),
            tool_call_id: tc.id,
            name: tc.function.name,
          })
        }

        // Re-add loading indicator
        setMessages(prev => [
          ...prev.filter(m => !m.isLoading),
          { id: `loading-${Date.now()}`, role: 'assistant', content: '', timestamp: new Date(), isLoading: true },
        ])

        // Call Groq again with tool results — force 'none' so model responds with text, not another tool call
        response = await callGroq(groqMessages, GEORGE_TOOLS, abortRef.current.signal, (attempt, waitMs) => {
          const secs = Math.round(waitMs / 1000)
          setRetryStatus(`Rate limited — retrying in ${secs}s… (attempt ${attempt}/3)`)
        }, 'none')
        assistantMessage = response.choices[0].message
      }

      const finalText = assistantMessage.content || "I've taken care of that for you."

      // Replace loading with final message
      const finalMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: finalText,
        timestamp: new Date(),
      }

      setMessages(prev => [
        ...prev.filter(m => !m.isLoading),
        finalMsg,
      ])

      // Speak response
      if (!isMuted) {
        speakText(finalText)
      }

    } catch (err: unknown) {
      // Remove loading indicator
      setMessages(prev => prev.filter(m => !m.isLoading))
      setRetryStatus(null)

      const isAbort = err instanceof Error && err.name === 'AbortError'
      if (!isAbort) {
        let errorContent: string

        if (err instanceof GroqRateLimitError) {
          errorContent = "I'm being rate limited by Groq right now — I tried 3 times but keep hitting the limit. Give it 30 seconds and try again."
        } else if (err instanceof GroqAPIError) {
          errorContent = `Groq returned an error (${err.status}). Try again in a moment.`
        } else if (!navigator.onLine) {
          errorContent = "Looks like we're offline. Check your connection and try again."
        } else {
          errorContent = 'Something went wrong. Try again in a moment.'
        }

        const errorMsg: Message = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: errorContent,
          timestamp: new Date(),
        }
        setMessages(prev => [...prev, errorMsg])
      }
    } finally {
      setIsLoading(false)
      setRetryStatus(null)
      abortRef.current = null
    }
  }, [isLoading, messages, currentTab, selectedLapId, selectedLapAddress, isMuted])

  // ── Voice input ──────────────────────────────────────────────────────────────

  const toggleListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (isListening) {
      recognitionRef.current?.stop()
      setIsListening(false)
      return
    }

    if (!SpeechRecognitionClass) return

    const recognition = new SpeechRecognitionClass()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-AU'

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      if (transcript.trim()) {
        sendMessage(transcript.trim())
      }
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [isListening, sendMessage])

  // ── Volume / mute ────────────────────────────────────────────────────────────

  const handleMuteToggle = useCallback(() => {
    const newMuted = !isMuted
    setIsMuted(newMuted)
    setTTSMuted(newMuted)
    if (newMuted) stopSpeaking()
  }, [isMuted])

  const handleVolumeChange = useCallback((vol: number) => {
    setVolume(vol)
    setTTSVolume(vol)
  }, [])

  const handleStopSpeaking = useCallback(() => {
    stopSpeaking()
    setIsSpeaking(false)
  }, [])

  // ── Keyboard ─────────────────────────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // ── Quick actions based on current tab ───────────────────────────────────────

  const quickActions = getQuickActions(currentTab)

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      {/* CSS Animations */}
      <style>{`
        @keyframes george-bounce {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1.2); opacity: 1; }
        }
        @keyframes george-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes george-slide-up {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes george-fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .george-input:focus {
          outline: none;
          border-color: #EAEAE0 !important;
          box-shadow: 0 0 0 2px rgba(245,158,11,0.15) !important;
        }
        .george-input::placeholder {
          color: #4B5563;
        }
        .george-send-btn:hover {
          background: #EAEAE0 !important;
          transform: scale(1.05);
        }
        .george-send-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
          transform: none !important;
        }
        .george-quick-btn:hover {
          background: rgba(245,158,11,0.15) !important;
          border-color: rgba(245,158,11,0.4) !important;
          color: #EAEAE0 !important;
        }
        .george-messages::-webkit-scrollbar {
          width: 4px;
        }
        .george-messages::-webkit-scrollbar-track {
          background: transparent;
        }
        .george-messages::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
        }
      `}</style>

      {/* Floating FAB */}
      {!isOpen && (
        <button
          onClick={() => { unlockAudio(); setIsOpen(true) }}
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #EAEAE0, #EAEAE0)',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(245,158,11,0.4), 0 2px 8px rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            zIndex: 9999,
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}
          title="Talk to George"
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.08)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 6px 24px rgba(245,158,11,0.5), 0 3px 12px rgba(0,0,0,0.4)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'
            ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 4px 20px rgba(245,158,11,0.4), 0 2px 8px rgba(0,0,0,0.3)'
          }}
        >
          🤖
          {unreadCount > 0 && (
            <div style={{
              position: 'absolute',
              top: '-2px',
              right: '-2px',
              width: '18px',
              height: '18px',
              borderRadius: '50%',
              background: '#EF4444',
              color: '#fff',
              fontSize: '0.65rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '2px solid #111',
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: '1.5rem',
            right: '1.5rem',
            width: isMinimized ? '280px' : '380px',
            height: isMinimized ? 'auto' : '560px',
            background: '#111827',
            border: '1px solid rgba(245,158,11,0.2)',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            overflow: 'hidden',
            animation: 'george-slide-up 0.25s ease-out',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0.75rem 1rem',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(217,119,6,0.08))',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            gap: '0.5rem',
          }}>
            {/* Avatar + Status */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #EAEAE0, #EAEAE0)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
              }}>
                🤖
              </div>
              <div style={{
                position: 'absolute',
                bottom: '0',
                right: '0',
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: isLoading ? '#EAEAE0' : '#10B981',
                border: '1.5px solid #111827',
                animation: isLoading ? 'george-pulse 1s infinite' : 'none',
              }} />
            </div>

            {/* Name + Tab context */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: '#EAEAE0', fontWeight: 700, fontSize: '0.85rem', lineHeight: 1.2 }}>
                George
              </div>
              <div style={{ color: retryStatus ? '#EAEAE0' : '#6B7280', fontSize: '0.68rem', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {retryStatus ?? (isLoading ? 'Thinking…' : `Viewing: ${tabLabel(currentTab)}`)}
              </div>
            </div>

            {/* Voice controls */}
            {!isMinimized && (
              <VoiceControls
                isListening={isListening}
                isMuted={isMuted}
                isSpeaking={isSpeaking}
                volume={volume}
                onMicToggle={toggleListening}
                onMuteToggle={handleMuteToggle}
                onVolumeChange={handleVolumeChange}
                onStopSpeaking={handleStopSpeaking}
                voiceSupported={voiceSupported}
              />
            )}

            {/* Window controls */}
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px', borderRadius: '6px', display: 'flex' }}
              title={isMinimized ? 'Expand' : 'Minimize'}
            >
              {isMinimized ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
            </button>
            <button
              onClick={() => {
                setIsOpen(false)
                stopSpeaking()
                if (recognitionRef.current) recognitionRef.current.stop()
              }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '4px', borderRadius: '6px', display: 'flex' }}
              title="Close"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body (hidden when minimized) */}
          {!isMinimized && (
            <>
              {/* Messages */}
              <div
                className="george-messages"
                style={{
                  flex: 1,
                  overflowY: 'auto',
                  padding: '0.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
              >
                {messages.length === 0 && (
                  <WelcomeScreen currentTab={currentTab} onQuickAction={sendMessage} />
                )}

                {messages.map(msg => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}

                <div ref={messagesEndRef} />
              </div>

              {/* Quick actions (shown when messages exist) */}
              {messages.length > 0 && quickActions.length > 0 && (
                <div style={{
                  padding: '0 0.75rem 0.5rem',
                  display: 'flex',
                  gap: '0.4rem',
                  flexWrap: 'wrap',
                }}>
                  {quickActions.slice(0, 3).map(qa => (
                    <button
                      key={qa}
                      className="george-quick-btn"
                      onClick={() => sendMessage(qa)}
                      disabled={isLoading}
                      style={{
                        background: 'rgba(255,255,255,0.04)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '20px',
                        color: '#9CA3AF',
                        fontSize: '0.68rem',
                        padding: '3px 10px',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {qa}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div style={{
                padding: '0.65rem 0.75rem',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                gap: '0.5rem',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.2)',
              }}>
                {isListening && (
                  <div style={{
                    color: '#EF4444',
                    fontSize: '0.72rem',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    <span style={{ animation: 'george-pulse 1s infinite' }}>●</span>
                    Listening…
                  </div>
                )}
                {!isListening && (
                  <>
                    <input
                      ref={inputRef}
                      className="george-input"
                      value={input}
                      onChange={e => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder={`Ask George about ${tabHint(currentTab)}…`}
                      disabled={isLoading}
                      style={{
                        flex: 1,
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px',
                        color: '#E5E7EB',
                        fontSize: '0.82rem',
                        padding: '0.5rem 0.75rem',
                        transition: 'border-color 0.15s, box-shadow 0.15s',
                      }}
                    />
                    <button
                      className="george-send-btn"
                      onClick={() => { unlockAudio(); sendMessage(input) }}
                      disabled={isLoading || !input.trim()}
                      style={{
                        background: '#EAEAE0',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#000',
                        cursor: 'pointer',
                        padding: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        transition: 'background 0.15s, transform 0.1s',
                        flexShrink: 0,
                      }}
                    >
                      <Send size={14} />
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </>
  )
}

// ── Welcome Screen ────────────────────────────────────────────────────────────

function WelcomeScreen({ currentTab, onQuickAction }: { currentTab: string; onQuickAction: (q: string) => void }) {
  const actions = getQuickActions(currentTab)

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: '1rem',
      textAlign: 'center',
      animation: 'george-fade-in 0.3s ease-out',
    }}>
      <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>🤖</div>
      <div style={{ color: '#EAEAE0', fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>
        Hey Antonio, I'm George
      </div>
      <div style={{ color: '#6B7280', fontSize: '0.78rem', marginBottom: '1.25rem', lineHeight: 1.5 }}>
        Your MC assistant. Ask me about LAPs, projects, market data, or anything on your dashboard.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '100%' }}>
        {actions.map(action => (
          <button
            key={action}
            onClick={() => onQuickAction(action)}
            style={{
              background: 'rgba(245,158,11,0.08)',
              border: '1px solid rgba(245,158,11,0.2)',
              borderRadius: '10px',
              color: '#D1D5DB',
              fontSize: '0.78rem',
              padding: '0.5rem 0.75rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.15)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#EAEAE0'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.background = 'rgba(245,158,11,0.08)'
              ;(e.currentTarget as HTMLButtonElement).style.color = '#D1D5DB'
            }}
          >
            <ChevronDown size={12} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle', transform: 'rotate(-90deg)' }} />
            {action}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function tabLabel(tab: string): string {
  const labels: Record<string, string> = {
    dashboard: 'Dashboard',
    'lap-tracker': 'LAP Tracker',
    projects: 'Projects',
    market: 'Market',
    calendar: 'Calendar',
    system: 'System',
    health: 'Health',
  }
  return labels[tab] || tab
}

function tabHint(tab: string): string {
  const hints: Record<string, string> = {
    dashboard: 'your pipeline',
    'lap-tracker': 'your LAPs',
    projects: 'your projects',
    market: 'market data',
    calendar: 'your schedule',
    system: 'agents & config',
    health: 'KPIs',
  }
  return hints[tab] || 'anything'
}

function getQuickActions(tab: string): string[] {
  const actions: Record<string, string[]> = {
    dashboard: [
      'Show me my urgent LAPs',
      'What are my weekly KPI targets?',
      'How am I tracking this quarter?',
    ],
    'lap-tracker': [
      'Show me all active LAPs',
      'Which LAPs have no follow-up date?',
      'Show me urgent LAPs',
      'How many LAPs do I have?',
    ],
    projects: [
      'Show me active projects',
      'What projects are on hold?',
      'Give me a project status summary',
    ],
    market: [
      'What properties have sold recently in Camp Hill?',
      'Show me current listings near Camp Hill',
      "What's the market pulse?",
    ],
    calendar: [
      'What should I focus on this week?',
      'Log a BAP activity',
      'Log an MAP activity',
    ],
    health: [
      'How am I tracking on weekly KPIs?',
      "What's my BAP/MAP/LAP count this week?",
      'Show me my goals',
    ],
    system: [
      'What tools do you have access to?',
      'Show me recent activity',
    ],
  }
  return actions[tab] || [
    'Show me my urgent LAPs',
    'How am I tracking on KPIs?',
    'What should I focus on today?',
  ]
}

// Extend window for SpeechRecognition type
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    SpeechRecognition: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    webkitSpeechRecognition: any
  }
}
