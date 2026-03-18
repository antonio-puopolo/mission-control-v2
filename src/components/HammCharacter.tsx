import { useConversation } from '@11labs/react'
import { useState, useCallback, useEffect, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

const AGENT_ID = 'agent_9501kk0dwrjheyy8qwbkxwznm8jr'
const MODEL_PATH = '/models/character/character.glb'

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

  const mountRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const mixerRef = useRef<THREE.AnimationMixer | null>(null)
  const clockRef = useRef(new THREE.Clock())
  const jawBoneRef = useRef<THREE.Bone | null>(null)
  const morphMeshRef = useRef<THREE.SkinnedMesh | null>(null)
  const rafRef = useRef<number | null>(null)
  const stateRef = useRef<State>('idle')

  const conversation = useConversation({
    onConnect: () => { setState('listening'); setError(null) },
    onDisconnect: () => { setState('idle') },
    onError: (err: unknown) => {
      setError(typeof err === 'string' ? err : 'Connection failed')
      setState('idle')
    },
  })

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (conversation.status === 'connected') {
      setState(conversation.isSpeaking ? 'speaking' : 'listening')
    } else if (conversation.status === 'connecting') {
      setState('connecting')
    }
  }, [conversation.status, conversation.isSpeaking])

  // Three.js scene setup
  useEffect(() => {
    if (!mountRef.current) return
    const mount = mountRef.current
    const W = mount.clientWidth || 400
    const H = mount.clientHeight || 560

    // Scene
    const scene = new THREE.Scene()
    sceneRef.current = scene

    // Camera — framed on upper body
    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100)
    camera.position.set(0, 1.4, 2.8)
    camera.lookAt(0, 1.1, 0)
    cameraRef.current = camera

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    rendererRef.current = renderer
    mount.appendChild(renderer.domElement)

    // Lighting
    const ambient = new THREE.AmbientLight(0x404060, 0.6)
    scene.add(ambient)

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.8)
    keyLight.position.set(1, 3, 2)
    keyLight.castShadow = true
    scene.add(keyLight)

    const fillLight = new THREE.DirectionalLight(0x00d4ff, 0.4)
    fillLight.position.set(-2, 1, 1)
    scene.add(fillLight)

    const rimLight = new THREE.DirectionalLight(0x0044aa, 0.6)
    rimLight.position.set(0, 2, -3)
    scene.add(rimLight)

    // Subtle orbit (no pan, limited range)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.target.set(0, 1.1, 0)
    controls.enablePan = false
    controls.enableZoom = false
    controls.minPolarAngle = Math.PI * 0.3
    controls.maxPolarAngle = Math.PI * 0.6
    controls.minAzimuthAngle = -0.4
    controls.maxAzimuthAngle = 0.4
    controls.dampingFactor = 0.08
    controls.enableDamping = true

    // Load character
    const loader = new GLTFLoader()
    loader.load(
      MODEL_PATH,
      (gltf) => {
        const model = gltf.scene
        scene.add(model)

        // Centre + scale
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const centre = box.getCenter(new THREE.Vector3())
        const scale = 1.8 / size.y
        model.scale.setScalar(scale)
        model.position.sub(centre.multiplyScalar(scale))
        model.position.y += size.y * scale * 0.05

        // Find jaw bone for lip sync
        model.traverse((obj) => {
          if (obj instanceof THREE.Bone) {
            const name = obj.name.toLowerCase()
            if (name.includes('jaw') || name.includes('mouth') || name.includes('lowerjaw')) {
              jawBoneRef.current = obj
            }
          }
          if (obj instanceof THREE.SkinnedMesh && obj.morphTargetDictionary) {
            const keys = Object.keys(obj.morphTargetDictionary)
            const mouthKey = keys.find(k =>
              k.toLowerCase().includes('open') ||
              k.toLowerCase().includes('mouth') ||
              k.toLowerCase().includes('_a') ||
              k.toLowerCase().includes('jawopen')
            )
            if (mouthKey) morphMeshRef.current = obj
          }
        })

        // Animation mixer
        if (gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(model)
          mixerRef.current = mixer
          // Find idle animation
          const idle = gltf.animations.find(a =>
            a.name.toLowerCase().includes('idle') ||
            a.name.toLowerCase().includes('standing')
          ) || gltf.animations[0]
          const action = mixer.clipAction(idle)
          action.play()
        }

        setModelReady(true)
      },
      undefined,
      (err) => {
        console.error('Model load error:', err)
        setError('Could not load character')
      }
    )

    // Render loop
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate)
      const delta = clockRef.current.getDelta()
      mixerRef.current?.update(delta)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    // Resize
    const onResize = () => {
      const W2 = mount.clientWidth
      const H2 = mount.clientHeight
      camera.aspect = W2 / H2
      camera.updateProjectionMatrix()
      renderer.setSize(W2, H2)
    }
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  // Lip sync loop
  useEffect(() => {
    const lipSync = () => {
      if (conversation.status === 'connected' && conversation.isSpeaking) {
        try {
          const freqData = conversation.getOutputByteFrequencyData()
          let mouthValue = 0

          if (freqData && freqData.length > 0) {
            const voice = freqData.slice(0, Math.floor(freqData.length * 0.35))
            const avg = voice.reduce((a: number, b: number) => a + b, 0) / voice.length
            mouthValue = Math.min(avg / 85, 1)

            const bars = 12
            const chunk = Math.floor(freqData.length / bars)
            setWaveAmplitudes(Array.from({ length: bars }, (_, i) => {
              const c = freqData.slice(i * chunk, (i + 1) * chunk)
              return Math.min(c.reduce((a: number, b: number) => a + b, 0) / c.length / 128, 1)
            }))
          } else {
            mouthValue = Math.abs(Math.sin(Date.now() / 100)) * 0.6
            setWaveAmplitudes(Array(12).fill(0).map(() => Math.random() * 0.5))
          }

          // Apply to morph targets
          if (morphMeshRef.current?.morphTargetDictionary) {
            const dict = morphMeshRef.current.morphTargetDictionary
            const keys = Object.keys(dict)
            const mouthKey = keys.find(k =>
              k.toLowerCase().includes('open') ||
              k.toLowerCase().includes('mouth') ||
              k.toLowerCase().includes('_a') ||
              k.toLowerCase().includes('jawopen')
            )
            if (mouthKey && morphMeshRef.current.morphTargetInfluences) {
              morphMeshRef.current.morphTargetInfluences[dict[mouthKey]] = mouthValue
            }
          }

          // Apply to jaw bone
          if (jawBoneRef.current) {
            jawBoneRef.current.rotation.x = mouthValue * 0.25
          }
        } catch { /* ignore */ }
      } else {
        setWaveAmplitudes(Array(12).fill(0))
        if (jawBoneRef.current) jawBoneRef.current.rotation.x = 0
        if (morphMeshRef.current?.morphTargetDictionary) {
          const dict = morphMeshRef.current.morphTargetDictionary
          const keys = Object.keys(dict)
          const k = keys.find(k => k.toLowerCase().includes('open') || k.toLowerCase().includes('mouth'))
          if (k && morphMeshRef.current.morphTargetInfluences) {
            morphMeshRef.current.morphTargetInfluences[dict[k]] = 0
          }
        }
      }
    }

    const id = setInterval(lipSync, 50) // ~20fps for lip sync
    return () => clearInterval(id)
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
      <div className="hamm-header">
        <span className="hamm-pig">🐷</span>
        <span className="hamm-name">Hamm</span>
      </div>

      <div className="hamm-stage">
        <div className="hamm-rings">
          <div className="hamm-ring" />
          <div className="hamm-ring" />
          <div className="hamm-ring" />
        </div>

        {!modelReady && (
          <div className="hamm-loading">
            <div className="hamm-loading-spinner" />
            <span>Loading character...</span>
          </div>
        )}

        <div
          ref={mountRef}
          className="hamm-canvas"
          style={{ opacity: modelReady ? 1 : 0 }}
        />
      </div>

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

      <div className="hamm-status">
        <div className="hamm-status-dot" />
        {STATUS_TEXT[state]}
      </div>

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
