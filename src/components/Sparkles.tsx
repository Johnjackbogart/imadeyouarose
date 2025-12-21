import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface SparklesProps {
  count?: number
  radius?: number
}

export default function Sparkles({ count = 100, radius = 3 }: SparklesProps) {
  const ref = useRef<THREE.Points>(null)
  const particlesRef = useRef<THREE.BufferGeometry>(null)

  /* eslint-disable react-hooks/purity -- Random values intentionally generated once on mount for particle initialization */
  const [positions, sizes, speeds] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    const speeds = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = radius * (0.5 + Math.random() * 0.5)

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) - 0.5
      positions[i * 3 + 2] = r * Math.cos(phi)

      sizes[i] = Math.random() * 0.03 + 0.01
      speeds[i] = Math.random() * 0.5 + 0.2
    }

    return [positions, sizes, speeds]
  }, [count, radius])
  /* eslint-enable react-hooks/purity */

  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.attributes.position.array
      const time = state.clock.elapsedTime

      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        const speed = speeds[i]

        // Gentle floating motion
        positions[i3 + 1] += Math.sin(time * speed + i) * 0.001

        // Slow spiral
        const angle = time * speed * 0.1
        const x = positions[i3]
        const z = positions[i3 + 2]
        const cos = Math.cos(angle * 0.01)
        const sin = Math.sin(angle * 0.01)
        positions[i3] = x * cos - z * sin
        positions[i3 + 2] = x * sin + z * cos
      }

      particlesRef.current.attributes.position.needsUpdate = true
    }

    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.05
    }
  })

  return (
    <points ref={ref}>
      <bufferGeometry ref={particlesRef}>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.04}
        color="#ffaacc"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
