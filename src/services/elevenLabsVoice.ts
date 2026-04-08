// ElevenLabs TTS Integration — Ivy voice (MClEFoImJXBTgLwdLI5n)

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || 'sk_d00114a02b45d2748ca27bdb6008c20b3341b1757a7509cc'
const IVY_VOICE_ID = 'MClEFoImJXBTgLwdLI5n'
const ELEVENLABS_URL = `https://api.elevenlabs.io/v1/text-to-speech/${IVY_VOICE_ID}/stream`

let currentAudio: HTMLAudioElement | null = null
let isMuted = false
let volume = 0.85

export function setMuted(muted: boolean) {
  isMuted = muted
  if (currentAudio) {
    currentAudio.muted = muted
  }
}

export function setVolume(vol: number) {
  volume = Math.max(0, Math.min(1, vol))
  if (currentAudio) {
    currentAudio.volume = volume
  }
}

export function getMuted() {
  return isMuted
}

export function getVolume() {
  return volume
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.src = ''
    currentAudio = null
  }
}

export async function speakText(text: string): Promise<void> {
  if (isMuted) return
  if (!text.trim()) return

  // Stop any current audio
  stopSpeaking()

  // Clean text: remove markdown, emojis-heavy blocks
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
      throw new Error(`ElevenLabs error: ${response.status}`)
    }

    const audioBlob = await response.blob()
    const audioUrl = URL.createObjectURL(audioBlob)

    const audio = new Audio(audioUrl)
    audio.volume = volume
    audio.muted = isMuted
    currentAudio = audio

    return new Promise((resolve, reject) => {
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl)
        currentAudio = null
        resolve()
      }
      audio.onerror = (e) => {
        URL.revokeObjectURL(audioUrl)
        currentAudio = null
        reject(e)
      }
      audio.play().catch(reject)
    })
  } catch (error) {
    console.error('TTS failed:', error)
    // Don't throw — voice failure is non-fatal
  }
}

export function isSpeaking(): boolean {
  return currentAudio !== null && !currentAudio.paused
}
