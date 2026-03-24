import { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type OrbStatus = 'idle' | 'listening' | 'speaking';

interface GeorgeOrbProps {
  status: OrbStatus;
  onClick: () => void;
  size?: number;
  audioData?: Uint8Array | null;
}

interface OrbSceneProps {
  status: OrbStatus;
  orbR: number;
  audioData?: Uint8Array | null;
}

const SURFACE_COUNT  = 50;
const INNER_COUNT    = 100;
const TOTAL          = SURFACE_COUNT + INNER_COUNT;
const MAX_LINE_SEGS  = 1400;

/** Even distribution across a sphere surface via Fibonacci lattice */
function fibonacciSphere(count: number, radius: number): THREE.Vector3[] {
  const result: THREE.Vector3[] = [];
  const golden = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < count; i++) {
    const theta = Math.acos(1 - (2 * (i + 0.5)) / count);
    const phi   = 2 * Math.PI * i / golden;
    result.push(new THREE.Vector3(
      radius * Math.sin(theta) * Math.cos(phi),
      radius * Math.sin(theta) * Math.sin(phi),
      radius * Math.cos(theta),
    ));
  }
  return result;
}

// ─── OrbScene ────────────────────────────────────────────────────────────────
function OrbScene({ status, orbR, audioData }: OrbSceneProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Keep status in a ref so useFrame always reads the latest value
  const statusRef = useRef<OrbStatus>(status);
  useEffect(() => { statusRef.current = status; }, [status]);

  // Keep audioData in a ref so useFrame reads it without triggering re-renders
  const audioRef = useRef<Uint8Array | null>(null);
  useEffect(() => { audioRef.current = audioData ?? null; }, [audioData]);

  // Accumulated animation state (never triggers re-renders)
  const timeRef     = useRef(0);
  const rotSpeedRef = useRef(0.003);
  const scaleRef    = useRef(1.0);
  const glowRef     = useRef(0.4);

  // ── Spawn positions (stable per orbR) ─────────────────────────────────────
  const spawnPositions = useMemo<THREE.Vector3[]>(() => {
    const surface = fibonacciSphere(SURFACE_COUNT, orbR);

    const inner: THREE.Vector3[] = [];
    for (let i = 0; i < INNER_COUNT; i++) {
      const r     = orbR * (0.3 + Math.random() * 0.6);
      const theta = Math.acos(2 * Math.random() - 1);
      const phi   = Math.random() * Math.PI * 2;
      inner.push(new THREE.Vector3(
        r * Math.sin(theta) * Math.cos(phi),
        r * Math.sin(theta) * Math.sin(phi),
        r * Math.cos(theta),
      ));
    }
    return [...surface, ...inner];
  }, [orbR]);

  // Mutable current positions — drifted each frame, bounced off sphere boundary
  const positions = useMemo<THREE.Vector3[]>(
    () => spawnPositions.map(p => p.clone()),
    [spawnPositions],
  );

  // Per-particle velocity vectors
  const velocities = useMemo<THREE.Vector3[]>(() =>
    Array.from({ length: TOTAL }, () => new THREE.Vector3(
      (Math.random() - 0.5) * 0.008,
      (Math.random() - 0.5) * 0.008,
      (Math.random() - 0.5) * 0.008,
    )), []);

  // ── Particle geometry — positions updated every frame ─────────────────────
  const particleGeo = useMemo<THREE.BufferGeometry>(() => {
    const geo    = new THREE.BufferGeometry();
    const posArr = new Float32Array(TOTAL * 3);
    const colArr = new Float32Array(TOTAL * 3);

    for (let i = 0; i < TOTAL; i++) {
      posArr[i * 3]     = spawnPositions[i].x;
      posArr[i * 3 + 1] = spawnPositions[i].y;
      posArr[i * 3 + 2] = spawnPositions[i].z;

      if (i < SURFACE_COUNT) {
        // #FCD34D — bright gold
        colArr[i * 3] = 0.988; colArr[i * 3 + 1] = 0.827; colArr[i * 3 + 2] = 0.302;
      } else {
        // #F59E0B — amber
        colArr[i * 3] = 0.961; colArr[i * 3 + 1] = 0.620; colArr[i * 3 + 2] = 0.043;
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colArr, 3));
    return geo;
  }, [spawnPositions]);

  const particleMat = useMemo<THREE.PointsMaterial>(() => new THREE.PointsMaterial({
    size:            orbR * 0.038,
    vertexColors:    true,
    transparent:     true,
    opacity:         0.8,
    sizeAttenuation: true,
    depthWrite:      false,
  }), [orbR]);

  // ── Line geometry — fully rebuilt every frame from current positions ───────
  const lineGeo = useMemo<THREE.BufferGeometry>(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(MAX_LINE_SEGS * 2 * 3), 3),
    );
    geo.setDrawRange(0, 0);
    return geo;
  }, []);

  const lineMat = useMemo<THREE.LineBasicMaterial>(() => new THREE.LineBasicMaterial({
    color:       new THREE.Color('#FCD34D'),
    transparent: true,
    opacity:     0.12,
    depthWrite:  false,
  }), []);

  // ── Soft radial glow — canvas sprite (gradual falloff, no hard edge) ───────
  const glowTexture = useMemo(() => {
    const size   = 256
    const canvas = document.createElement("canvas")
    canvas.width = size; canvas.height = size
    const ctx  = canvas.getContext("2d")!
    const grad = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2)
    grad.addColorStop(0,    "rgba(251,191,36, 0.12)")
    grad.addColorStop(0.4,  "rgba(251,191,36, 0.05)")
    grad.addColorStop(0.75, "rgba(251,191,36, 0.015)")
    grad.addColorStop(1,    "rgba(251,191,36, 0)")
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    return new THREE.CanvasTexture(canvas)
  }, [])

  const glowSpriteMat = useMemo(() => new THREE.SpriteMaterial({
    map:        glowTexture,
    transparent: true,
    depthWrite:  false,
    opacity:     1.0,
  }), [glowTexture])

  // Core hidden — to restore: set opacity back to 0.22 and uncomment mesh in JSX below
  const coreMat = useMemo<THREE.MeshBasicMaterial>(() => new THREE.MeshBasicMaterial({
    color:       new THREE.Color('#FCD34D'),
    transparent: true,
    opacity:     0,
    depthWrite:  false,
  }), []);

  // ── Static sphere geometries ───────────────────────────────────────────────
  const coreGeo = useMemo(() => new THREE.SphereGeometry(orbR * 0.15, 8, 8), [orbR]);

  const maxDist2 = (orbR * 0.35) * (orbR * 0.35);

  // ── Frame loop ─────────────────────────────────────────────────────────────
  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const st = statusRef.current;
    const dt = Math.min(delta, 0.05);
    timeRef.current += dt;
    const t = timeRef.current;

    // Compute audio energy from latest frequency data
    const audio = audioRef.current;
    let bassEnergy = 0, midEnergy = 0, amplitude = 0;
    if (audio && audio.length > 0) {
      for (let i = 0; i < 5 && i < audio.length; i++) bassEnergy += audio[i] / 255;
      bassEnergy /= 5;
      for (let i = 5; i < 21 && i < audio.length; i++) midEnergy += audio[i] / 255;
      midEnergy /= 16;
      let sum = 0;
      for (let i = 0; i < audio.length; i++) sum += audio[i];
      amplitude = sum / audio.length / 255;
    }
    const audioActive = amplitude > 0.01;

    // Y rotation — lerp toward state-specific speed (slow, meditative)
    const targetRot = st === 'idle' ? 0.0006 : st === 'listening' ? 0.001 : 0.0018;
    rotSpeedRef.current += (targetRot - rotSpeedRef.current) * 0.04;
    groupRef.current.rotation.y += rotSpeedRef.current;

    // Scale pulse — audio overrides sin-wave when active
    const targetScale = audioActive
      ? 1.0 + bassEnergy * 0.14
      : st === 'speaking' ? 1.0 + 0.06 * Math.abs(Math.sin(t * 5)) : 1.0;
    scaleRef.current  += (targetScale - scaleRef.current) * 0.12;
    groupRef.current.scale.setScalar(scaleRef.current);

    // Drift multiplier — boost by mid frequencies when audio is active
    const driftBase = st === 'idle' ? 0.8 : st === 'listening' ? 1.6 : 3.2;
    const driftMult = driftBase + (audioActive ? midEnergy * 4.0 : 0);

    // Update particle positions and write into the BufferAttribute
    const posAttr = particleGeo.attributes.position as THREE.BufferAttribute;
    const posArr  = posAttr.array as Float32Array;

    for (let i = 0; i < TOTAL; i++) {
      const vel = velocities[i];
      const pos = positions[i];

      pos.x += vel.x * driftMult;
      pos.y += vel.y * driftMult;
      pos.z += vel.z * driftMult;

      // Elastic boundary reflection — keeps particles inside orb, no clustering
      const dist = Math.sqrt(pos.x*pos.x + pos.y*pos.y + pos.z*pos.z);
      const boundary = orbR * 0.92;
      if (dist > boundary) {
        const nx = pos.x/dist, ny = pos.y/dist, nz = pos.z/dist;
        const dot = vel.x*nx + vel.y*ny + vel.z*nz;
        vel.x -= 2*dot*nx; vel.y -= 2*dot*ny; vel.z -= 2*dot*nz;
        pos.x = nx*boundary; pos.y = ny*boundary; pos.z = nz*boundary;
      }

      // Organic random-walk — larger nudges = more fluid, unpredictable motion
      vel.x += (Math.random() - 0.5) * 0.003;
      vel.y += (Math.random() - 0.5) * 0.003;
      vel.z += (Math.random() - 0.5) * 0.003;

      // Speed cap + gentle damping
      const spd = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);
      if (spd > 0.04) {
        const inv = 0.04 / spd;
        vel.x *= inv; vel.y *= inv; vel.z *= inv;
      }
      vel.x *= 0.98; vel.y *= 0.98; vel.z *= 0.98;

      posArr[i * 3]     = pos.x;
      posArr[i * 3 + 1] = pos.y;
      posArr[i * 3 + 2] = pos.z;
    }
    posAttr.needsUpdate = true;

    // Particle opacity — global twinkle
    const twinkle   = 0.85 + 0.15 * Math.sin(t * 1.8);
    const baseAlpha = st === 'idle' ? 0.55 : st === 'listening' ? 0.72 : 0.92;
    particleMat.opacity = baseAlpha * twinkle;

    // Line opacity — flash on listening/speaking, boost with audio amplitude
    const lineFlash = st === 'idle' ? 0 :
      st === 'listening' ? 0.08 * Math.abs(Math.sin(t * 3.2)) :
      0.28 * Math.abs(Math.sin(t * 7.5));
    const lineBase  = st === 'idle' ? 0.065 : st === 'listening' ? 0.14 : 0.28;
    const lineAlpha = lineBase + lineFlash;
    lineMat.opacity = audioActive ? lineAlpha * (1 + amplitude * 1.2) : lineAlpha;

    // Rebuild line segments from updated particle positions
    const linePosArr = (lineGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
    let lineCount    = 0;

    outer: for (let i = 0; i < TOTAL; i++) {
      for (let j = i + 1; j < TOTAL; j++) {
        const dx = posArr[i * 3]     - posArr[j * 3];
        const dy = posArr[i * 3 + 1] - posArr[j * 3 + 1];
        const dz = posArr[i * 3 + 2] - posArr[j * 3 + 2];
        if (dx * dx + dy * dy + dz * dz < maxDist2) {
          const b = lineCount * 6;
          linePosArr[b]     = posArr[i * 3];     linePosArr[b + 1] = posArr[i * 3 + 1]; linePosArr[b + 2] = posArr[i * 3 + 2];
          linePosArr[b + 3] = posArr[j * 3];     linePosArr[b + 4] = posArr[j * 3 + 1]; linePosArr[b + 5] = posArr[j * 3 + 2];
          if (++lineCount >= MAX_LINE_SEGS) break outer;
        }
      }
    }

    (lineGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    lineGeo.setDrawRange(0, lineCount * 2);

    // Glow pulse — drives sprite opacity and core; audio boosts it
    let glowTarget = st === 'idle'      ? 0.32 + 0.10 * Math.sin(t * 0.72)       :
                     st === 'listening' ? 0.55 + 0.08 * Math.sin(t * 2.5)        :
                                         0.75 + 0.10 * Math.abs(Math.sin(t * 6));
    if (audioActive) glowTarget += amplitude * 0.25;
    glowRef.current  += (glowTarget - glowRef.current) * 0.05;
    const g = glowRef.current;

    glowSpriteMat.opacity = 0.42 + 0.28 * (g / 0.75);
    // coreMat.opacity = 0.15 + 0.15 * (g / 0.75); // restore this line too when bringing core back
  });

  return (
    <group ref={groupRef}>
      {/* Soft radial glow — sprite always faces camera, canvas handles falloff */}
      <sprite material={glowSpriteMat} scale={[orbR * 3.2, orbR * 3.2, 1]} />
      {/* Inner core — hidden (restore: set coreMat opacity to 0.22) */}
      <mesh geometry={coreGeo} material={coreMat} />
      {/* Particle cloud */}
      <points       geometry={particleGeo} material={particleMat} />
      {/* Neural connection lines */}
      <lineSegments geometry={lineGeo}     material={lineMat} />
    </group>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────
export function GeorgeOrb({ status, onClick, size = 200, audioData }: GeorgeOrbProps) {
  const orbR = size * 0.38;
  // Canvas is larger than the clickable area so glow + scale pulse never clips
  const canvasSize = size * 1.8;
  const offset = (canvasSize - size) / 2;

  return (
    <div
      style={{ width: size, height: size, cursor: 'pointer', position: 'relative' }}
      onClick={onClick}
      role="button"
      aria-label="George — voice assistant"
      tabIndex={0}
      onKeyDown={(e: React.KeyboardEvent) => e.key === 'Enter' && onClick()}
    >
      <Canvas
        camera={{ position: [0, 0, orbR * 2.8] as [number, number, number], fov: 50 }}
        gl={{ alpha: true }}
        dpr={[1, 2]}
        style={{
          background: 'transparent',
          position: 'absolute',
          top: -offset,
          left: -offset,
          width: canvasSize,
          height: canvasSize,
          pointerEvents: 'none',
        }}
      >
        <OrbScene status={status} orbR={orbR} audioData={audioData} />
      </Canvas>
    </div>
  );
}
