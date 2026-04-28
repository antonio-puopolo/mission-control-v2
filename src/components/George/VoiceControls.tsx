import { Mic, MicOff, Volume2, VolumeX, Square } from 'lucide-react'

interface VoiceControlsProps {
  isListening: boolean
  isMuted: boolean
  isSpeaking: boolean
  volume: number
  onMicToggle: () => void
  onMuteToggle: () => void
  onVolumeChange: (vol: number) => void
  onStopSpeaking: () => void
  voiceSupported: boolean
}

export function VoiceControls({
  isListening,
  isMuted,
  isSpeaking,
  volume,
  onMicToggle,
  onMuteToggle,
  onVolumeChange,
  onStopSpeaking,
  voiceSupported,
}: VoiceControlsProps) {
  const btnBase: React.CSSProperties = {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '8px',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s, transform 0.1s',
    color: '#9CA3AF',
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    }}>
      {/* Mic button */}
      {voiceSupported && (
        <button
          onClick={onMicToggle}
          title={isListening ? 'Stop listening' : 'Start voice input'}
          style={{
            ...btnBase,
            color: isListening ? '#EF4444' : '#9CA3AF',
            background: isListening ? 'rgba(239,68,68,0.12)' : 'transparent',
            animation: isListening ? 'george-pulse 1.5s ease-in-out infinite' : 'none',
          }}
        >
          {isListening ? <MicOff size={16} /> : <Mic size={16} />}
        </button>
      )}

      {/* Stop speaking */}
      {isSpeaking && (
        <button
          onClick={onStopSpeaking}
          title="Stop speaking"
          style={{
            ...btnBase,
            color: '#EAEAE0',
            background: 'rgba(245,158,11,0.12)',
          }}
        >
          <Square size={14} fill="#EAEAE0" />
        </button>
      )}

      {/* Mute toggle */}
      <button
        onClick={onMuteToggle}
        title={isMuted ? 'Unmute voice' : 'Mute voice'}
        style={{
          ...btnBase,
          color: isMuted ? '#EF4444' : '#9CA3AF',
        }}
      >
        {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
      </button>

      {/* Volume slider */}
      {!isMuted && (
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={e => onVolumeChange(parseFloat(e.target.value))}
          title={`Volume: ${Math.round(volume * 100)}%`}
          style={{
            width: '50px',
            height: '3px',
            accentColor: '#EAEAE0',
            cursor: 'pointer',
          }}
        />
      )}
    </div>
  )
}
