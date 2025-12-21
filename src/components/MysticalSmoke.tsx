import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

// Custom smoke shader with noise-based distortion and soft edges
const SmokeShaderMaterial = shaderMaterial(
  {
    uTime: 0,
    uColor1: new THREE.Color('#b8b0c8'),
    uColor2: new THREE.Color('#e8e4f0'),
    uOpacity: 0.4,
  },
  // Vertex shader
  `
    varying vec2 vUv;
    varying float vNoise;
    uniform float uTime;

    // Simplex noise functions
    vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
    vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
    vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

    float snoise(vec3 v) {
      const vec2 C = vec2(1.0/6.0, 1.0/3.0);
      const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

      vec3 i  = floor(v + dot(v, C.yyy));
      vec3 x0 = v - i + dot(i, C.xxx);

      vec3 g = step(x0.yzx, x0.xyz);
      vec3 l = 1.0 - g;
      vec3 i1 = min(g.xyz, l.zxy);
      vec3 i2 = max(g.xyz, l.zxy);

      vec3 x1 = x0 - i1 + C.xxx;
      vec3 x2 = x0 - i2 + C.yyy;
      vec3 x3 = x0 - D.yyy;

      i = mod289(i);
      vec4 p = permute(permute(permute(
        i.z + vec4(0.0, i1.z, i2.z, 1.0))
        + i.y + vec4(0.0, i1.y, i2.y, 1.0))
        + i.x + vec4(0.0, i1.x, i2.x, 1.0));

      float n_ = 0.142857142857;
      vec3 ns = n_ * D.wyz - D.xzx;

      vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

      vec4 x_ = floor(j * ns.z);
      vec4 y_ = floor(j - 7.0 * x_);

      vec4 x = x_ *ns.x + ns.yyyy;
      vec4 y = y_ *ns.x + ns.yyyy;
      vec4 h = 1.0 - abs(x) - abs(y);

      vec4 b0 = vec4(x.xy, y.xy);
      vec4 b1 = vec4(x.zw, y.zw);

      vec4 s0 = floor(b0)*2.0 + 1.0;
      vec4 s1 = floor(b1)*2.0 + 1.0;
      vec4 sh = -step(h, vec4(0.0));

      vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
      vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

      vec3 p0 = vec3(a0.xy, h.x);
      vec3 p1 = vec3(a0.zw, h.y);
      vec3 p2 = vec3(a1.xy, h.z);
      vec3 p3 = vec3(a1.zw, h.w);

      vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
      p0 *= norm.x;
      p1 *= norm.y;
      p2 *= norm.z;
      p3 *= norm.w;

      vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
      m = m * m;
      return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
    }

    void main() {
      vUv = uv;

      vec3 pos = position;

      // Multi-octave noise for organic movement
      float noise1 = snoise(pos * 2.0 + uTime * 0.3);
      float noise2 = snoise(pos * 4.0 + uTime * 0.5) * 0.5;
      float noise3 = snoise(pos * 8.0 + uTime * 0.7) * 0.25;

      vNoise = noise1 + noise2 + noise3;

      // Displace vertices based on noise
      pos += normal * vNoise * 0.15;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  // Fragment shader
  `
    varying vec2 vUv;
    varying float vNoise;
    uniform float uTime;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform float uOpacity;

    void main() {
      // Soft radial gradient for each particle
      vec2 center = vUv - 0.5;
      float dist = length(center);
      float alpha = smoothstep(0.5, 0.0, dist);

      // Mix colors based on noise
      float colorMix = vNoise * 0.5 + 0.5;
      vec3 color = mix(uColor1, uColor2, colorMix);

      // Add subtle shimmer
      float shimmer = sin(uTime * 3.0 + vNoise * 10.0) * 0.1 + 0.9;

      gl_FragColor = vec4(color * shimmer, alpha * uOpacity);
    }
  `
)

extend({ SmokeShaderMaterial })

// Type for shader material ref
type SmokeShaderMaterialImpl = THREE.ShaderMaterial & {
  uniforms: {
    uTime: { value: number }
    uColor1: { value: THREE.Color }
    uColor2: { value: THREE.Color }
    uOpacity: { value: number }
  }
}

// Volumetric smoke puff component
function SmokePuff({
  position,
  scale,
  rotationSpeed,
  delay,
  lifetime,
  color1,
  color2,
  opacity,
}: {
  position: [number, number, number]
  scale: number
  rotationSpeed: number
  delay: number
  lifetime: number
  color1: string
  color2: string
  opacity: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<SmokeShaderMaterialImpl>(null)
  const baseY = position[1]

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return
    const time = state.clock.elapsedTime

    // Lifecycle
    const age = ((time - delay) % lifetime) / lifetime
    if (age < 0) return

    // Update shader time
    materialRef.current.uniforms.uTime.value = time

    // Rise and expand
    const rise = age * 4
    const expand = 1 + age * 2

    meshRef.current.position.y = baseY + rise
    meshRef.current.scale.setScalar(scale * expand * (1 - age * 0.3))

    // Rotate slowly
    meshRef.current.rotation.x = time * rotationSpeed * 0.3
    meshRef.current.rotation.y = time * rotationSpeed
    meshRef.current.rotation.z = time * rotationSpeed * 0.5

    // Fade based on lifecycle
    const fadeIn = Math.min(age * 5, 1)
    const fadeOut = Math.pow(1 - age, 1.5)
    materialRef.current.uniforms.uOpacity.value = opacity * fadeIn * fadeOut
  })

  const material = useMemo(() => {
    const mat = new SmokeShaderMaterial()
    mat.uniforms.uColor1.value = new THREE.Color(color1)
    mat.uniforms.uColor2.value = new THREE.Color(color2)
    mat.uniforms.uOpacity.value = opacity
    mat.transparent = true
    mat.depthWrite = false
    mat.blending = THREE.AdditiveBlending
    mat.side = THREE.DoubleSide
    return mat
  }, [color1, color2, opacity])

  return (
    <mesh ref={meshRef} position={position}>
      <icosahedronGeometry args={[1, 3]} />
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  )
}

// Simplex noise helper for smooth organic motion
function noise3D(x: number, y: number, z: number): number {
  // Simple but effective pseudo-noise using sin combinations
  const n1 = Math.sin(x * 1.2 + y * 0.9 + z * 1.1) * 0.5
  const n2 = Math.sin(x * 2.3 - y * 1.7 + z * 0.8) * 0.25
  const n3 = Math.sin(x * 0.7 + y * 2.1 - z * 1.9) * 0.25
  return n1 + n2 + n3
}

// Curl noise for fluid-like motion
function curlNoise(x: number, y: number, z: number, time: number): [number, number, number] {
  const eps = 0.01

  const dx = (noise3D(x, y + eps, z + time) - noise3D(x, y - eps, z + time)) / (2 * eps)
  const dy = (noise3D(x + eps, y, z + time) - noise3D(x - eps, y, z + time)) / (2 * eps)
  const dz = (noise3D(x, y, z + eps + time) - noise3D(x, y, z - eps + time)) / (2 * eps)

  // Curl = cross product of gradient
  return [
    dz - dy,
    dx - dz,
    dy - dx
  ]
}

// Organic flowing ribbon tendril
function FlowingRibbon({
  id,
  baseRadius,
  heightStart,
  heightEnd,
  spiralTurns,
  ribbonWidth,
  speed,
  color,
  phaseOffset,
}: {
  id: number
  baseRadius: number
  heightStart: number
  heightEnd: number
  spiralTurns: number
  ribbonWidth: number
  speed: number
  color: string
  phaseOffset: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  // Create ribbon geometry with proper UVs for flow animation
  const { geometry, segmentCount, widthSegments } = useMemo(() => {
    const segments = 120
    const wSegs = 6
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    for (let i = 0; i <= segments; i++) {
      const t = i / segments

      for (let w = 0; w <= wSegs; w++) {
        const wt = w / wSegs - 0.5 // -0.5 to 0.5

        // Base spiral path
        const y = heightStart + t * (heightEnd - heightStart)
        const angle = phaseOffset + t * Math.PI * 2 * spiralTurns
        const radius = baseRadius + Math.sin(t * Math.PI) * 0.3

        // Add organic variation to the path
        const wobble1 = Math.sin(t * 7 + phaseOffset) * 0.15
        const wobble2 = Math.cos(t * 11 + phaseOffset * 1.3) * 0.1
        const radiusVar = radius + wobble1 + wobble2

        // Width tapers at ends
        const widthTaper = Math.sin(t * Math.PI) * ribbonWidth
        const actualWidth = widthTaper * (0.5 + Math.sin(t * 13 + phaseOffset) * 0.3)

        // Create ribbon surface - perpendicular to path tangent
        const tangentAngle = angle + Math.PI / 2
        const offsetX = Math.cos(tangentAngle) * wt * actualWidth
        const offsetZ = Math.sin(tangentAngle) * wt * actualWidth
        const offsetY = wt * actualWidth * 0.3 // Slight vertical spread

        const x = Math.cos(angle) * radiusVar + offsetX
        const z = Math.sin(angle) * radiusVar + offsetZ

        positions.push(x, y + offsetY, z)
        uvs.push(t, wt + 0.5)
      }
    }

    // Create indices for triangle strip
    for (let i = 0; i < segments; i++) {
      for (let w = 0; w < wSegs; w++) {
        const a = i * (wSegs + 1) + w
        const b = a + 1
        const c = a + (wSegs + 1)
        const d = c + 1

        indices.push(a, b, c)
        indices.push(b, d, c)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    geo.computeVertexNormals()

    return { geometry: geo, segmentCount: segments, widthSegments: wSegs }
  }, [baseRadius, heightStart, heightEnd, spiralTurns, ribbonWidth, phaseOffset])

  // Store base positions for animation
  const basePositions = useMemo(() => {
    return new Float32Array(geometry.attributes.position.array)
  }, [geometry])

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return
    const time = state.clock.elapsedTime * speed

    const positions = meshRef.current.geometry.attributes.position
    const posArray = positions.array as Float32Array

    for (let i = 0; i <= segmentCount; i++) {
      const t = i / segmentCount
      const y = heightStart + t * (heightEnd - heightStart)

      for (let w = 0; w <= widthSegments; w++) {
        const idx = (i * (widthSegments + 1) + w) * 3

        const baseX = basePositions[idx]
        const baseY = basePositions[idx + 1]
        const baseZ = basePositions[idx + 2]

        // Apply curl noise for fluid motion
        const [curlX, curlY, curlZ] = curlNoise(
          baseX * 0.5,
          baseY * 0.3,
          baseZ * 0.5,
          time * 0.3
        )

        // Flow animation - wave traveling up the ribbon
        const flowPhase = t * 8 - time * 2
        const flowWave = Math.sin(flowPhase) * 0.08
        const flowWave2 = Math.sin(flowPhase * 1.7 + 1) * 0.04

        // Breathing/pulsing motion
        const breathe = Math.sin(time * 0.5 + t * 2 + id) * 0.05

        // Combine all motions
        const noiseScale = 0.15 * (1 - t * 0.5) // Less noise at top
        posArray[idx] = baseX + curlX * noiseScale + flowWave * Math.cos(y)
        posArray[idx + 1] = baseY + curlY * noiseScale * 0.5 + breathe
        posArray[idx + 2] = baseZ + curlZ * noiseScale + flowWave2 * Math.sin(y)
      }
    }

    positions.needsUpdate = true
    meshRef.current.geometry.computeVertexNormals()

    // Animate opacity with flow
    const opacityBase = 0.12
    const opacityPulse = Math.sin(time * 0.8 + phaseOffset) * 0.04
    materialRef.current.uniforms.uOpacity.value = opacityBase + opacityPulse
    materialRef.current.uniforms.uTime.value = time
  })

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: 0.12 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vFade;

        void main() {
          vUv = uv;
          // Fade at edges of ribbon and at top/bottom
          float edgeFade = 1.0 - abs(uv.y - 0.5) * 2.0;
          float endFade = sin(uv.x * 3.14159);
          vFade = edgeFade * endFade;

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        varying float vFade;

        void main() {
          // Flow pattern moving along ribbon
          float flow = sin(vUv.x * 20.0 - uTime * 3.0) * 0.5 + 0.5;
          float flow2 = sin(vUv.x * 35.0 - uTime * 4.5 + 1.0) * 0.3 + 0.7;

          // Wispy pattern across width
          float wisp = sin(vUv.y * 10.0 + vUv.x * 5.0 + uTime) * 0.2 + 0.8;

          // Combine for final alpha
          float alpha = vFade * flow * flow2 * wisp * uOpacity;

          // Add subtle color variation
          vec3 finalColor = uColor * (0.9 + flow * 0.2);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  }, [color])

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  )
}

// Tentacle-like animated tendril with tapering thickness
function TentacleTendril({
  startAngle,
  spiralAmount,
  heightStart,
  heightEnd,
  baseRadius,
  thickness,
  speed,
  color,
  phase,
  waveFrequency,
  waveAmplitude,
}: {
  startAngle: number
  spiralAmount: number
  heightStart: number
  heightEnd: number
  baseRadius: number
  thickness: number
  speed: number
  color: string
  phase: number
  waveFrequency: number
  waveAmplitude: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  // Create tapered tube geometry - thicker at base, thin at tip
  const geometry = useMemo(() => {
    const segments = 100
    const radialSegments = 8
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []

    for (let i = 0; i <= segments; i++) {
      const t = i / segments

      // Spiral path
      const angle = startAngle + t * spiralAmount
      const y = heightStart + t * (heightEnd - heightStart)

      // Organic wobble in the base path
      const wobbleR = Math.sin(t * 5 + phase) * 0.15 + Math.cos(t * 8 + phase * 1.3) * 0.08
      const r = baseRadius + wobbleR

      const centerX = Math.cos(angle) * r
      const centerZ = Math.sin(angle) * r

      // Taper: thick at base, thin at tip (tentacle-like)
      const taperRadius = thickness * (1 - t * 0.85) * (0.5 + Math.sin(t * Math.PI) * 0.5)

      // Calculate tangent for proper tube orientation
      const nextT = Math.min(1, t + 0.01)
      const nextAngle = startAngle + nextT * spiralAmount
      const nextY = heightStart + nextT * (heightEnd - heightStart)
      const nextR = baseRadius + Math.sin(nextT * 5 + phase) * 0.15
      const tangent = new THREE.Vector3(
        Math.cos(nextAngle) * nextR - centerX,
        nextY - y,
        Math.sin(nextAngle) * nextR - centerZ
      ).normalize()

      // Create perpendicular vectors for tube cross-section
      const up = new THREE.Vector3(0, 1, 0)
      const perp1 = new THREE.Vector3().crossVectors(tangent, up).normalize()
      if (perp1.length() < 0.1) perp1.set(1, 0, 0)
      const perp2 = new THREE.Vector3().crossVectors(tangent, perp1).normalize()

      // Create ring of vertices
      for (let j = 0; j <= radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2
        const cos = Math.cos(theta)
        const sin = Math.sin(theta)

        const x = centerX + (perp1.x * cos + perp2.x * sin) * taperRadius
        const yPos = y + (perp1.y * cos + perp2.y * sin) * taperRadius
        const z = centerZ + (perp1.z * cos + perp2.z * sin) * taperRadius

        positions.push(x, yPos, z)
        uvs.push(t, j / radialSegments)
      }
    }

    // Create indices
    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * (radialSegments + 1) + j
        const b = a + 1
        const c = a + (radialSegments + 1)
        const d = c + 1

        indices.push(a, b, c)
        indices.push(b, d, c)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    geo.setIndex(indices)
    geo.computeVertexNormals()

    return geo
  }, [startAngle, spiralAmount, heightStart, heightEnd, baseRadius, thickness, phase])

  const basePositions = useMemo(() => {
    return new Float32Array(geometry.attributes.position.array)
  }, [geometry])

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return
    const time = state.clock.elapsedTime * speed

    const positions = meshRef.current.geometry.attributes.position
    const posArray = positions.array as Float32Array
    const radialSegments = 8

    for (let i = 0; i <= 100; i++) {
      const t = i / 100

      // Tentacle wave motion - more pronounced at the tip
      const tipFactor = Math.pow(t, 1.5) // More motion at tip
      const wave1 = Math.sin(t * waveFrequency - time * 4 + phase) * waveAmplitude * tipFactor
      const wave2 = Math.cos(t * waveFrequency * 0.7 - time * 3 + phase * 1.5) * waveAmplitude * 0.6 * tipFactor
      const wave3 = Math.sin(t * waveFrequency * 1.3 - time * 5 + phase * 0.7) * waveAmplitude * 0.3 * tipFactor

      // Slithering side-to-side motion
      const slither = Math.sin(t * 3 - time * 2 + phase) * 0.12 * tipFactor

      // Breathing/pulsing
      const breathe = Math.sin(time * 1.5 + t * 2 + phase) * 0.03

      for (let j = 0; j <= radialSegments; j++) {
        const idx = (i * (radialSegments + 1) + j) * 3
        const baseX = basePositions[idx]
        const baseY = basePositions[idx + 1]
        const baseZ = basePositions[idx + 2]

        // Apply wave displacement
        const angle = Math.atan2(baseZ, baseX)
        posArray[idx] = baseX + wave1 * Math.cos(angle + time) + slither * Math.cos(angle)
        posArray[idx + 1] = baseY + wave2 * 0.5 + breathe
        posArray[idx + 2] = baseZ + wave3 * Math.sin(angle + time) + slither * Math.sin(angle)
      }
    }

    positions.needsUpdate = true
    meshRef.current.geometry.computeVertexNormals()

    // Update shader uniforms
    materialRef.current.uniforms.uTime.value = time
  })

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(color) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vFresnel;

        void main() {
          vUv = uv;

          vec3 viewDir = normalize(cameraPosition - (modelMatrix * vec4(position, 1.0)).xyz);
          vec3 worldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vFresnel = pow(1.0 - abs(dot(viewDir, worldNormal)), 2.0);

          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying float vFresnel;

        void main() {
          // Flowing energy pattern along tentacle
          float flow = sin(vUv.x * 30.0 - uTime * 5.0) * 0.5 + 0.5;
          float flow2 = sin(vUv.x * 50.0 - uTime * 7.0) * 0.3 + 0.7;

          // Pulse rings traveling up
          float pulse = sin(vUv.x * 15.0 - uTime * 4.0) * 0.5 + 0.5;
          pulse = pow(pulse, 3.0);

          // Fade at tip
          float tipFade = 1.0 - pow(vUv.x, 2.0);

          // Combine effects
          float alpha = (0.15 + flow * 0.1 + pulse * 0.15) * tipFade * (0.5 + vFresnel * 0.5);

          // Color with energy glow
          vec3 finalColor = uColor * (1.0 + pulse * 0.5 + flow2 * 0.2);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    })
  }, [color])

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <primitive object={material} ref={materialRef} attach="material" />
    </mesh>
  )
}

// Billboarded smoke sprite for more realistic volumetric look
function SmokeSprite({
  initialPosition,
  size,
  lifetime,
  delay,
  drift,
}: {
  initialPosition: [number, number, number]
  size: number
  lifetime: number
  delay: number
  drift: number
}) {
  const spriteRef = useRef<THREE.Sprite>(null)
  const materialRef = useRef<THREE.SpriteMaterial>(null)

  // Create gradient texture for soft smoke
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 128
    canvas.height = 128
    const ctx = canvas.getContext('2d')!

    // Radial gradient for soft smoke puff
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(220, 215, 235, 0.8)')
    gradient.addColorStop(0.3, 'rgba(200, 195, 220, 0.5)')
    gradient.addColorStop(0.6, 'rgba(180, 175, 200, 0.2)')
    gradient.addColorStop(1, 'rgba(160, 155, 180, 0)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 128, 128)

    const tex = new THREE.CanvasTexture(canvas)
    tex.needsUpdate = true
    return tex
  }, [])

  useFrame((state) => {
    if (!spriteRef.current || !materialRef.current) return
    const time = state.clock.elapsedTime

    // Calculate age in lifecycle
    const rawAge = (time - delay) / lifetime
    const age = ((rawAge % 1) + 1) % 1

    // Vertical rise with turbulence
    const turbulenceX = Math.sin(time * 1.5 + delay * 10) * drift
    const turbulenceZ = Math.cos(time * 1.3 + delay * 7) * drift
    const spiralAngle = time * 0.5 + delay * 3
    const spiralRadius = 0.1 + age * 0.3

    const rise = age * 5
    spriteRef.current.position.set(
      initialPosition[0] + turbulenceX + Math.cos(spiralAngle) * spiralRadius,
      initialPosition[1] + rise,
      initialPosition[2] + turbulenceZ + Math.sin(spiralAngle) * spiralRadius
    )

    // Scale grows then shrinks
    const scaleProgress = Math.sin(age * Math.PI)
    const currentScale = size * (0.5 + scaleProgress * 1.5)
    spriteRef.current.scale.setScalar(currentScale)

    // Fade in and out
    const fadeIn = Math.min(age * 4, 1)
    const fadeOut = Math.pow(1 - age, 2)
    materialRef.current.opacity = fadeIn * fadeOut * 0.35

    // Rotate sprite
    spriteRef.current.material.rotation = time * 0.3 + delay
  })

  return (
    <sprite ref={spriteRef} position={initialPosition}>
      <spriteMaterial
        ref={materialRef}
        map={texture}
        transparent
        opacity={0.3}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </sprite>
  )
}

// Main smoke component - positioned OUTSIDE the glass cube
// Cube is 4x6x4 at position [0, 0.8, 0], so extends ±2 on x/z
export default function MysticalSmoke() {
  // Generate smoke puffs - outside the cube (radius > 2.2)
  const smokePuffs = useMemo(() => {
    const puffs = []
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2
      const radius = 2.4 + Math.random() * 0.8 // Outside cube edges
      puffs.push({
        position: [
          Math.cos(angle) * radius,
          -2.0 + Math.random() * 0.5,
          Math.sin(angle) * radius,
        ] as [number, number, number],
        scale: 0.25 + Math.random() * 0.2,
        rotationSpeed: 0.15 + Math.random() * 0.2,
        delay: Math.random() * 10,
        lifetime: 8 + Math.random() * 5,
        color1: '#c0b8d0',
        color2: '#e8e0f8',
        opacity: 0.2 + Math.random() * 0.1,
      })
    }
    return puffs
  }, [])

  // Generate sprite smoke - wrapping around the exterior
  const smokeSprites = useMemo(() => {
    const sprites = []
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2
      const radius = 2.3 + Math.random() * 1.0 // Outside cube
      sprites.push({
        initialPosition: [
          Math.cos(angle) * radius,
          -2.2 + Math.random() * 0.6,
          Math.sin(angle) * radius,
        ] as [number, number, number],
        size: 0.4 + Math.random() * 0.5,
        lifetime: 7 + Math.random() * 5,
        delay: Math.random() * 12,
        drift: 0.15 + Math.random() * 0.2,
      })
    }
    return sprites
  }, [])

  // Generate flowing ribbon tendrils - organic spirals around the cube
  const ribbons = useMemo(() => {
    return [
      { id: 0, baseRadius: 2.5, heightStart: -2.2, heightEnd: 4.2, spiralTurns: 2.5, ribbonWidth: 0.4, speed: 0.8, color: '#d0c8e8', phaseOffset: 0 },
      { id: 1, baseRadius: 2.6, heightStart: -2.0, heightEnd: 4.0, spiralTurns: 2.0, ribbonWidth: 0.35, speed: 0.7, color: '#c8c0e0', phaseOffset: Math.PI * 0.5 },
      { id: 2, baseRadius: 2.4, heightStart: -2.1, heightEnd: 4.3, spiralTurns: 3.0, ribbonWidth: 0.3, speed: 0.9, color: '#dcd4f0', phaseOffset: Math.PI },
      { id: 3, baseRadius: 2.55, heightStart: -1.9, heightEnd: 3.9, spiralTurns: 2.2, ribbonWidth: 0.38, speed: 0.75, color: '#e0d8f8', phaseOffset: Math.PI * 1.5 },
    ]
  }, [])

  // Generate tentacle tendrils - dense, animated, organic
  const tentacles = useMemo(() => {
    const result = []
    // Main thick tentacles
    for (let i = 0; i < 8; i++) {
      const startAngle = (i / 8) * Math.PI * 2
      result.push({
        startAngle,
        spiralAmount: Math.PI * (1.5 + Math.random() * 1.5),
        heightStart: -2.3 + Math.random() * 0.3,
        heightEnd: 3.5 + Math.random() * 1.5,
        baseRadius: 2.4 + Math.random() * 0.3,
        thickness: 0.06 + Math.random() * 0.03,
        speed: 0.8 + Math.random() * 0.4,
        color: `hsl(${255 + Math.random() * 25}, ${35 + Math.random() * 20}%, ${75 + Math.random() * 15}%)`,
        phase: i * 0.8 + Math.random() * 0.5,
        waveFrequency: 8 + Math.random() * 4,
        waveAmplitude: 0.15 + Math.random() * 0.1,
      })
    }
    // Medium secondary tentacles
    for (let i = 0; i < 12; i++) {
      const startAngle = (i / 12) * Math.PI * 2 + 0.26
      result.push({
        startAngle,
        spiralAmount: Math.PI * (2 + Math.random() * 2),
        heightStart: -2.1 + Math.random() * 0.5,
        heightEnd: 2.8 + Math.random() * 1.8,
        baseRadius: 2.35 + Math.random() * 0.4,
        thickness: 0.04 + Math.random() * 0.02,
        speed: 1.0 + Math.random() * 0.5,
        color: `hsl(${260 + Math.random() * 20}, ${40 + Math.random() * 15}%, ${80 + Math.random() * 12}%)`,
        phase: i * 0.5 + Math.random() * 2,
        waveFrequency: 10 + Math.random() * 6,
        waveAmplitude: 0.2 + Math.random() * 0.12,
      })
    }
    // Thin wispy tentacles
    for (let i = 0; i < 16; i++) {
      const startAngle = (i / 16) * Math.PI * 2 + Math.random() * 0.4
      result.push({
        startAngle,
        spiralAmount: Math.PI * (2.5 + Math.random() * 2.5),
        heightStart: -2.0 + Math.random() * 0.6,
        heightEnd: 2.5 + Math.random() * 2.0,
        baseRadius: 2.3 + Math.random() * 0.5,
        thickness: 0.025 + Math.random() * 0.015,
        speed: 1.2 + Math.random() * 0.6,
        color: `hsl(${250 + Math.random() * 30}, ${30 + Math.random() * 25}%, ${85 + Math.random() * 10}%)`,
        phase: i * 0.4 + Math.random() * 3,
        waveFrequency: 12 + Math.random() * 8,
        waveAmplitude: 0.25 + Math.random() * 0.15,
      })
    }
    return result
  }, [])

  return (
    <group>
      {/* Volumetric smoke puffs with shader */}
      {smokePuffs.map((puff, i) => (
        <SmokePuff key={`puff-${i}`} {...puff} />
      ))}

      {/* Billboarded smoke sprites */}
      {smokeSprites.map((sprite, i) => (
        <SmokeSprite key={`sprite-${i}`} {...sprite} />
      ))}

      {/* Flowing ribbon tendrils */}
      {ribbons.map((ribbon) => (
        <FlowingRibbon key={`ribbon-${ribbon.id}`} {...ribbon} />
      ))}

      {/* Animated tentacle tendrils */}
      {tentacles.map((tentacle, i) => (
        <TentacleTendril key={`tentacle-${i}`} {...tentacle} />
      ))}
    </group>
  )
}
