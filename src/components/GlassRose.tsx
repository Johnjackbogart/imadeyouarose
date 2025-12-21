import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface LeafProps {
  position: [number, number, number]
  rotation: [number, number, number]
  scale?: number
}

interface PetalConfig {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
}

interface ThornConfig {
  position: [number, number, number]
  rotation: [number, number, number]
}

// Shared materials - reuse instead of creating per-mesh
const petalMaterial = new THREE.MeshPhysicalMaterial({
  color: '#ff1a4d',
  metalness: 0.1,
  roughness: 0.15,
  transmission: 0.6,
  thickness: 0.5,
  ior: 1.5,
  transparent: true,
  opacity: 0.85,
  side: THREE.DoubleSide,
})

const stemMaterial = new THREE.MeshPhysicalMaterial({
  color: '#00cc66',
  metalness: 0.1,
  roughness: 0.2,
  transmission: 0.5,
  thickness: 0.3,
  transparent: true,
  opacity: 0.9,
  side: THREE.DoubleSide,
})

const leafMaterial = new THREE.MeshPhysicalMaterial({
  color: '#00aa55',
  metalness: 0.1,
  roughness: 0.25,
  transmission: 0.4,
  thickness: 0.2,
  transparent: true,
  opacity: 0.85,
  side: THREE.DoubleSide,
})

// Pre-create petal geometry once
const petalShape = new THREE.Shape()
petalShape.moveTo(0, 0)
petalShape.bezierCurveTo(0.3, 0.2, 0.4, 0.6, 0.2, 1)
petalShape.bezierCurveTo(0, 1.2, -0.2, 1.2, -0.2, 1)
petalShape.bezierCurveTo(-0.4, 0.6, -0.3, 0.2, 0, 0)

const petalGeometry = new THREE.ExtrudeGeometry(petalShape, {
  depth: 0.02,
  bevelEnabled: true,
  bevelThickness: 0.01,
  bevelSize: 0.01,
  bevelSegments: 2,
  curveSegments: 16
})
petalGeometry.center()

// Pre-create leaf geometry
const leafShape = new THREE.Shape()
leafShape.moveTo(0, 0)
leafShape.bezierCurveTo(0.3, 0.3, 0.3, 0.7, 0, 1)
leafShape.bezierCurveTo(-0.3, 0.7, -0.3, 0.3, 0, 0)

const leafGeometry = new THREE.ExtrudeGeometry(leafShape, {
  depth: 0.01,
  bevelEnabled: true,
  bevelThickness: 0.005,
  bevelSize: 0.005,
  bevelSegments: 1,
  curveSegments: 12
})
leafGeometry.center()

function RoseBud() {
  const groupRef = useRef<THREE.Group>(null)

  const petals = useMemo(() => {
    const petalConfigs: PetalConfig[] = []
    const layers = [
      { count: 5, radius: 0.1, height: 0.3, scale: 0.4, tilt: 0.3 },
      { count: 6, radius: 0.2, height: 0.2, scale: 0.5, tilt: 0.5 },
      { count: 7, radius: 0.35, height: 0.1, scale: 0.6, tilt: 0.8 },
      { count: 8, radius: 0.5, height: 0, scale: 0.7, tilt: 1.1 },
      { count: 9, radius: 0.65, height: -0.1, scale: 0.75, tilt: 1.4 },
    ]

    layers.forEach((layer, layerIndex) => {
      for (let i = 0; i < layer.count; i++) {
        const angle = (i / layer.count) * Math.PI * 2 + layerIndex * 0.2
        petalConfigs.push({
          position: [
            Math.cos(angle) * layer.radius,
            layer.height,
            Math.sin(angle) * layer.radius
          ],
          rotation: [layer.tilt, angle + Math.PI, 0],
          scale: layer.scale,
        })
      }
    })
    return petalConfigs
  }, [])

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.1
    }
  })

  return (
    <group ref={groupRef} position={[0, 1.5, 0]}>
      {petals.map((petal, i) => (
        <mesh
          key={i}
          geometry={petalGeometry}
          material={petalMaterial}
          position={petal.position}
          rotation={petal.rotation}
          scale={petal.scale}
        />
      ))}
      {/* Center bud */}
      <mesh position={[0, 0.35, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshPhysicalMaterial
          color="#ff0040"
          metalness={0.1}
          roughness={0.1}
          transmission={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>
    </group>
  )
}

function Stem() {
  const curve = useMemo(() => {
    return new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -1.5, 0),
      new THREE.Vector3(0.05, -0.5, 0.02),
      new THREE.Vector3(-0.02, 0.5, -0.01),
      new THREE.Vector3(0, 1.2, 0),
    ])
  }, [])

  return (
    <mesh material={stemMaterial}>
      <tubeGeometry args={[curve, 32, 0.04, 8, false]} />
    </mesh>
  )
}

function Leaf({ position, rotation, scale = 1 }: LeafProps) {
  return (
    <mesh
      geometry={leafGeometry}
      material={leafMaterial}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  )
}

function Thorns() {
  const thornGeometry = useMemo(() => new THREE.ConeGeometry(0.015, 0.06, 6), [])

  const thorns = useMemo(() => {
    const positions: ThornConfig[] = []
    for (let i = 0; i < 5; i++) {
      const y = -1.2 + i * 0.5
      const angle = i * 1.5
      positions.push({
        position: [Math.cos(angle) * 0.05, y, Math.sin(angle) * 0.05],
        rotation: [0, angle, Math.PI / 4]
      })
    }
    return positions
  }, [])

  return (
    <>
      {thorns.map((thorn, i) => (
        <mesh
          key={i}
          geometry={thornGeometry}
          material={stemMaterial}
          position={thorn.position}
          rotation={thorn.rotation}
        />
      ))}
    </>
  )
}

export default function GlassRose() {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.05
    }
  })

  return (
    <group ref={groupRef}>
      <RoseBud />
      <Stem />
      <Thorns />
      <Leaf position={[-0.2, 0, 0.1]} rotation={[0.3, 0.5, -0.5]} scale={0.5} />
      <Leaf position={[0.15, -0.5, -0.1]} rotation={[-0.2, -0.3, 0.4]} scale={0.4} />
      <Leaf position={[-0.1, -1, 0.15]} rotation={[0.4, 0.8, -0.3]} scale={0.35} />
    </group>
  )
}
