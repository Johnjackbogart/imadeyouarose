import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Dark luxurious base material
const baseMaterial = new THREE.MeshStandardMaterial({
  color: "#0d0d1a",
  metalness: 0.95,
  roughness: 0.08,
});

function AnimatedGoldRing({
  radius,
  tubeRadius,
  y,
  speed,
  direction = 1,
  segments = 64,
}: {
  radius: number;
  tubeRadius: number;
  y: number;
  speed: number;
  direction?: number;
  segments?: number;
}) {
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * speed * direction;
      // Subtle pulsing glow effect
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2 + y) * 0.02;
      ringRef.current.scale.set(scale, scale, 1);
    }
  });

  return (
    <mesh ref={ringRef} position={[0, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, tubeRadius, 16, segments]} />
      <meshStandardMaterial
        color="#ffd700"
        metalness={1}
        roughness={0.12}
        emissive="#daa520"
        emissiveIntensity={0.15}
      />
    </mesh>
  );
}

function OrnateGoldBand({
  radius,
  y,
  count,
  speed,
}: {
  radius: number;
  y: number;
  count: number;
  speed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const ornaments = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        rotY: angle,
      };
    });
  }, [count, radius]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * speed;
    }
  });

  return (
    <group ref={groupRef} position={[0, y, 0]}>
      {ornaments.map((pos, i) => (
        <mesh
          key={i}
          position={[pos.x, 0, pos.z]}
          rotation={[0, pos.rotY + Math.PI / 2, 0]}
        >
          <torusKnotGeometry args={[0.04, 0.015, 32, 8, 2, 3]} />
          <meshStandardMaterial
            color="#ffd700"
            metalness={1}
            roughness={0.1}
            emissive="#daa520"
            emissiveIntensity={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

function IvoryEngraving({
  radius,
  y,
  count,
  scale = 1,
}: {
  radius: number;
  y: number;
  count: number;
  scale?: number;
}) {
  const engravings = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (i / count) * Math.PI * 2;
      return {
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        rotY: angle,
      };
    });
  }, [count, radius]);

  return (
    <group position={[0, y, 0]}>
      {engravings.map((pos, i) => (
        <group
          key={i}
          position={[pos.x, 0, pos.z]}
          rotation={[0, pos.rotY + Math.PI / 2, 0]}
          scale={scale}
        >
          {/* Fleur-de-lis style engraving */}
          <mesh position={[0, 0, 0.01]}>
            <circleGeometry args={[0.06, 16]} />
            <meshStandardMaterial
              color="#fffff0"
              metalness={0.15}
              roughness={0.35}
              emissive="#f5f5dc"
              emissiveIntensity={0.08}
            />
          </mesh>
          {/* Inner detail */}
          <mesh position={[0, 0, 0.015]}>
            <ringGeometry args={[0.025, 0.04, 16]} />
            <meshStandardMaterial
              color="#ffd700"
              metalness={1}
              roughness={0.15}
            />
          </mesh>
          {/* Top flourish */}
          <mesh position={[0, 0.05, 0.01]} rotation={[0, 0, 0]}>
            <coneGeometry args={[0.025, 0.06, 8]} />
            <meshStandardMaterial
              color="#fffff0"
              metalness={0.15}
              roughness={0.35}
            />
          </mesh>
          {/* Side flourishes */}
          <mesh position={[-0.035, 0.02, 0.01]} rotation={[0, 0, Math.PI / 4]}>
            <coneGeometry args={[0.018, 0.045, 6]} />
            <meshStandardMaterial
              color="#fffff0"
              metalness={0.15}
              roughness={0.35}
            />
          </mesh>
          <mesh position={[0.035, 0.02, 0.01]} rotation={[0, 0, -Math.PI / 4]}>
            <coneGeometry args={[0.018, 0.045, 6]} />
            <meshStandardMaterial
              color="#fffff0"
              metalness={0.15}
              roughness={0.35}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function FloatingGoldOrbs({ y }: { y: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const orbs = useMemo(() => {
    return Array.from({ length: 8 }, (_, i) => {
      const angle = (i / 8) * Math.PI * 2;
      return {
        angle,
        radius: 2.1,
        phase: i * 0.5,
      };
    });
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.3;
    }
  });

  return (
    <group ref={groupRef} position={[0, y, 0]}>
      {orbs.map((orb, i) => (
        <mesh
          key={i}
          position={[
            Math.cos(orb.angle) * orb.radius,
            0,
            Math.sin(orb.angle) * orb.radius,
          ]}
        >
          <sphereGeometry args={[0.035, 16, 16]} />
          <meshStandardMaterial
            color="#ffd700"
            metalness={1}
            roughness={0.1}
            emissive="#daa520"
            emissiveIntensity={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function RoseBase() {
  const baseGroupRef = useRef<THREE.Group>(null);

  return (
    <group ref={baseGroupRef} position={[0, -1.5, 0]}>
      {/* Bottom tier - widest */}
      <mesh position={[0, -0.35, 0]}>
        <cylinderGeometry args={[2.2, 2.4, 0.2, 64]} />
        <primitive object={baseMaterial} attach="material" />
      </mesh>

      {/* Bottom gold ring - largest, slow rotation */}
      <AnimatedGoldRing radius={2.42} tubeRadius={0.06} y={-0.23} speed={0.15} direction={1} />

      {/* Ivory engravings on bottom tier */}
      <IvoryEngraving radius={2.3} y={-0.35} count={12} scale={1.2} />

      {/* Ornate gold band rotating around bottom */}
      <OrnateGoldBand radius={2.35} y={-0.45} count={8} speed={0.2} />

      {/* Middle tier */}
      <mesh position={[0, -0.1, 0]}>
        <cylinderGeometry args={[1.9, 2.1, 0.25, 64]} />
        <primitive object={baseMaterial} attach="material" />
      </mesh>

      {/* Middle gold rings - counter rotating */}
      <AnimatedGoldRing radius={2.12} tubeRadius={0.05} y={0.03} speed={0.25} direction={-1} />
      <AnimatedGoldRing radius={1.88} tubeRadius={0.04} y={0.03} speed={0.35} direction={1} />

      {/* Ivory engravings on middle tier */}
      <IvoryEngraving radius={2.0} y={-0.1} count={10} scale={1} />

      {/* Upper tier */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[1.7, 1.85, 0.15, 64]} />
        <primitive object={baseMaterial} attach="material" />
      </mesh>

      {/* Upper gold ring trio */}
      <AnimatedGoldRing radius={1.87} tubeRadius={0.045} y={0.18} speed={0.4} direction={1} />
      <AnimatedGoldRing radius={1.72} tubeRadius={0.035} y={0.18} speed={0.5} direction={-1} />
      <AnimatedGoldRing radius={1.58} tubeRadius={0.025} y={0.18} speed={0.6} direction={1} />

      {/* Ornate gold band on upper tier */}
      <OrnateGoldBand radius={1.78} y={0.1} count={6} speed={-0.3} />

      {/* Top platform with beveled edge */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[1.55, 1.65, 0.08, 64]} />
        <primitive object={baseMaterial} attach="material" />
      </mesh>

      {/* Top crown gold ring */}
      <AnimatedGoldRing radius={1.57} tubeRadius={0.05} y={0.27} speed={0.2} direction={-1} />

      {/* Floating gold orbs around the base */}
      <FloatingGoldOrbs y={-0.3} />

      {/* Inner platform for rose with gold inlay */}
      <mesh position={[0, 0.28, 0]}>
        <cylinderGeometry args={[1.45, 1.5, 0.06, 64]} />
        <meshStandardMaterial
          color="#1a1a2e"
          metalness={0.85}
          roughness={0.12}
          emissive="#0a0a15"
          emissiveIntensity={0.1}
        />
      </mesh>

      {/* Decorative gold center ring */}
      <mesh position={[0, 0.32, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.2, 0.02, 12, 48]} />
        <meshStandardMaterial
          color="#ffd700"
          metalness={1}
          roughness={0.1}
          emissive="#b8860b"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Inner decorative ivory ring pattern */}
      <IvoryEngraving radius={1.35} y={0.28} count={8} scale={0.8} />

      {/* Central gold filigree details */}
      {Array.from({ length: 16 }).map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const innerRadius = 0.8;
        return (
          <mesh
            key={`filigree-${i}`}
            position={[
              Math.cos(angle) * innerRadius,
              0.3,
              Math.sin(angle) * innerRadius,
            ]}
            rotation={[Math.PI / 2, 0, angle]}
          >
            <torusGeometry args={[0.08, 0.008, 8, 16]} />
            <meshStandardMaterial
              color="#ffd700"
              metalness={1}
              roughness={0.15}
              emissive="#daa520"
              emissiveIntensity={0.15}
            />
          </mesh>
        );
      })}
    </group>
  );
}
