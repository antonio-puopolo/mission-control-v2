// GeorgeOrb stub — minimal orb component
export type OrbStatus = string

interface GeorgeOrbProps {
  state?: string
  status?: OrbStatus
  size?: number
  audioData?: Uint8Array | null
  onClick?: () => void
}

export function GeorgeOrb({ size = 200 }: GeorgeOrbProps) {
  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: '50%',
      background: 'radial-gradient(circle at 35% 35%, #F59E0B, #D97706)',
      boxShadow: '0 0 40px rgba(245,158,11,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size * 0.3,
    }}>
      🤖
    </div>
  )
}
