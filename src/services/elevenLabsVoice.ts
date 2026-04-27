// ElevenLabs TTS Integration — Ivy voice (MClEFoImJXBTgLwdLI5n)
// Uses Web Audio API (AudioContext) to bypass browser autoplay restrictions

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || 'sk_d00114a02b45d2748ca27bdb6008c20b3341b1757a7509cc'
const IVY_VOICE_ID = 'MClEFoImJXBTgLwdLI5n'
const ELEVENLABS_URL = `https://api.elevenlabs.io/v1/text-to-speech/${IVY_VOICE_ID}`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let audioCtx: AudioContext | null = null
let currentSource: AudioBufferSourceNode | null = null
let currentGain: GainNode | null = null
let isMuted = false
let volume = 0.85

// Call this on any user gesture (FAB click, Send button) to unlock the AudioContext.
// Must run during a user interaction — otherwise Chrome blocks audio playback.
export function unlockAudio() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const AC = window.AudioContext || (window as any).webkitAudioContext
  if (!AC) return
  if (!audioCtx) {
    audioCtx = new AC()
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume()
  }
}

export function setMuted(muted: boolean) {
  isMuted = muted
  if (currentGain) {
    currentGain.gain.value = muted ? 0 : volume
  }
}

export function setVolume(vol: number) {
  volume = Math.max(0, Math.min(1, vol))
  if (currentGain && !isMuted) {
    currentGain.gain.value = volume
  }
}

export function getMuted() {
  return isMuted
}

export function getVolume() {
  return volume
}

export function stopSpeaking() {
  if (currentSource) {
    try {
      currentSource.stop()
    } catch {
      // already stopped
    }
    currentSource = null
    currentGain = null
  }
}

export async function speakText(text: string): Promise<void> {
  if (isMuted) return
  if (!text.trim()) return

  // Stop any current audio
  stopSpeaking()

  // Clean text: remove markdown
  const cleanText = text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`(.*?)`/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()

  try {
    const response = await fetch(ELEVENLABS_URL, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.8,
          style: 0.2,
          use_speaker_boost: true,
        },
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error('ElevenLabs TTS error:', err)
      return
    }

    // Use AudioContext for playback — bypasses browser autoplay restrictions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AC = window.AudioContext || (window as any).webkitAudioContext
    if (!AC) {
      console.warn('Web Audio API not supported')
      return
    }
    if (!audioCtx) {
      audioCtx = new AC()
    }
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume()
    }

    const arrayBuffer = await response.arrayBuffer()
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

    const source = audioCtx.createBufferSource()
    source.buffer = audioBuffer

    const gainNode = audioCtx.createGain()
    gainNode.gain.value = isMuted ? 0 : volume

    source.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    currentSource = source
    currentGain = gainNode

    await new Promise<void>((resolve) => {
      source.onended = () => {
        currentSource = null
        currentGain = null
        resolve()
      }
      source.start(0)
    })
  } catch (error) {
    console.error('TTS failed:', error)
    // Don't throw — voice failure is non-fatal
  }
}

export function isSpeaking(): boolean {
  return currentSource !== null
}
