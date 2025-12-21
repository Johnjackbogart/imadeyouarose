import { Suspense, useMemo } from "react";
import {
  Environment,
  Float,
  OrbitControls,
  Stars,
  MeshTransmissionMaterial,
  RoundedBox,
} from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import GlassRose from "./GlassRose";
import Sparkles from "./Sparkles";
import MysticalSmoke from "./MysticalSmoke";

function Lights() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight
        intensity={0.55}
        color="#cfead4"
        groundColor="#2a3d2b"
      />
      <directionalLight
        position={[6, 7, 4]}
        intensity={1.1}
        color="#fff2d6"
      />
      <spotLight
        position={[5, 5, 5]}
        angle={0.3}
        penumbra={1}
        intensity={1.6}
        color="#fff5ef"
      />
      <spotLight
        position={[-5, 3, -5]}
        angle={0.4}
        penumbra={1}
        intensity={1.1}
        color="#f2e5dc"
      />
      <pointLight position={[0, 3, 0]} intensity={0.6} color="#ffd7c2" />
      <pointLight position={[0, -2, 2]} intensity={0.35} color="#dbe5ff" />
    </>
  );
}

function GlassCube() {
  return (
    <RoundedBox
      args={[4, 6, 4]}
      radius={0.3}
      smoothness={4}
      position={[0, 0.8, 0]}
      renderOrder={100}
    >
      <MeshTransmissionMaterial
        samples={4}
        resolution={256}
        transmission={1}
        roughness={0}
        thickness={0.2}
        ior={1.5}
        chromaticAberration={0.02}
        envMapIntensity={0.05}
        anisotropy={0}
        distortion={0}
        distortionScale={0}
        temporalDistortion={0}
        attenuationDistance={10}
        attenuationColor="#ffffff"
        color="#ffffff"
        transmissionSampler
      />
    </RoundedBox>
  );
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function LowPolyMeadow() {
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(34, 34, 14, 14);
    plane.rotateX(-Math.PI / 2);

    const positions = plane.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];
    const color = new THREE.Color();

    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      const innerRadius = 2.8;
      const falloff = THREE.MathUtils.clamp((dist - innerRadius) / 9, 0, 1);
      const wave = Math.sin(x * 0.3) * 0.22 + Math.cos(z * 0.28) * 0.2;
      const ridge = Math.sin((x + z) * 0.2) * 0.26;
      const jitterSeed = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
      const jitter = (jitterSeed - Math.floor(jitterSeed) - 0.5) * 0.12;
      const height = (wave + ridge + jitter) * (0.35 + falloff * 0.75);

      positions.setY(i, height);

      const lightness = THREE.MathUtils.clamp(
        0.27 + height * 0.35 + falloff * 0.1,
        0.2,
        0.48
      );
      const hue = 0.33 + height * 0.015;
      color.setHSL(hue, 0.55, lightness);
      colors.push(color.r, color.g, color.b);
    }

    plane.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    plane.computeVertexNormals();
    return plane;
  }, []);

  return (
    <mesh geometry={geometry} position={[0, -2.45, 0]} receiveShadow>
      <meshStandardMaterial
        vertexColors
        roughness={0.95}
        metalness={0.02}
        flatShading
      />
    </mesh>
  );
}

function LowPolyHills() {
  const hills = useMemo(
    () => [
      { position: [-8, -2.2, -7] as const, scale: [2.1, 1.4, 2.1] as const, color: "#6ea56d" },
      { position: [7.5, -2.25, -6.5] as const, scale: [1.8, 1.2, 1.8] as const, color: "#74b171" },
      { position: [-8.5, -2.3, 5.5] as const, scale: [2.3, 1.5, 2.3] as const, color: "#6aa466" },
      { position: [6.5, -2.15, 7.2] as const, scale: [1.7, 1.1, 1.7] as const, color: "#7bb977" },
      { position: [0, -2.4, -11] as const, scale: [3.2, 1.8, 3.2] as const, color: "#689a66" },
    ],
    []
  );

  return (
    <group>
      {hills.map((hill, index) => (
        <mesh
          key={`hill-${index}`}
          position={hill.position}
          scale={hill.scale}
        >
          <coneGeometry args={[1, 1, 6, 1]} />
          <meshStandardMaterial
            color={hill.color}
            roughness={0.9}
            metalness={0.05}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

function LowPolyTrees() {
  const trees = useMemo(() => {
    const rand = createSeededRandom(18);
    const canopyColor = new THREE.Color();

    return Array.from({ length: 11 }, (_, index) => {
      const angle = rand() * Math.PI * 2;
      const radius = 5.2 + rand() * 6.4;
      const trunkHeight = 0.35 + rand() * 0.35;
      const canopyHeight = 0.9 + rand() * 0.7;
      const canopyRadius = 0.45 + rand() * 0.28;
      canopyColor.setHSL(0.33 + rand() * 0.02, 0.5, 0.28 + rand() * 0.08);

      return {
        key: `tree-${index}`,
        position: [Math.cos(angle) * radius, -2.2, Math.sin(angle) * radius] as const,
        trunkHeight,
        canopyHeight,
        canopyRadius,
        rotation: (rand() - 0.5) * 0.2,
        canopyColor: `#${canopyColor.getHexString()}`,
      };
    });
  }, []);

  return (
    <group>
      {trees.map((tree) => (
        <group key={tree.key} position={tree.position} rotation={[0, tree.rotation, 0]}>
          <mesh position={[0, tree.trunkHeight / 2, 0]}>
            <cylinderGeometry args={[0.12, 0.16, tree.trunkHeight, 6]} />
            <meshStandardMaterial
              color="#7a5533"
              roughness={0.95}
              metalness={0.05}
              flatShading
            />
          </mesh>
          <mesh position={[0, tree.trunkHeight + tree.canopyHeight * 0.5, 0]}>
            <coneGeometry args={[tree.canopyRadius, tree.canopyHeight, 6, 1]} />
            <meshStandardMaterial
              color={tree.canopyColor}
              roughness={0.9}
              metalness={0.04}
              flatShading
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function LowPolyRocks() {
  const rocks = useMemo(() => {
    const rand = createSeededRandom(42);
    const colors = ["#8a8f8a", "#9aa09b", "#7c807d", "#7f8b85"];

    return Array.from({ length: 9 }, (_, index) => {
      const angle = rand() * Math.PI * 2;
      const radius = 3.2 + rand() * 4.6;
      const scale = 0.35 + rand() * 0.35;
      return {
        key: `rock-${index}`,
        position: [Math.cos(angle) * radius, -2.35, Math.sin(angle) * radius] as const,
        rotation: [rand() * 0.6, rand() * Math.PI * 2, rand() * 0.6] as const,
        scale,
        color: colors[index % colors.length],
      };
    });
  }, []);

  return (
    <group>
      {rocks.map((rock) => (
        <mesh
          key={rock.key}
          position={rock.position}
          rotation={rock.rotation}
          scale={rock.scale}
        >
          <dodecahedronGeometry args={[0.6, 0]} />
          <meshStandardMaterial
            color={rock.color}
            roughness={0.85}
            metalness={0.08}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

function AnimatedGoldRing({
  radius,
  tubeRadius,
  y,
  speed,
  direction = 1,
  segments = 64
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
  speed
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
  scale = 1
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

function Base() {
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

export default function Scene() {
  return (
    <>
      <color attach="background" args={["#c7e6cf"]} />
      <fog attach="fog" args={["#b9ddc4", 8, 20]} />

      <Lights />

      <Stars
        radius={35}
        depth={25}
        count={180}
        factor={2}
        saturation={0.1}
        fade
        speed={0.05}
      />

      <Suspense fallback={null}>
        <Environment environmentIntensity={0.2} preset="studio" />

        <LowPolyMeadow />
        <LowPolyHills />
        <LowPolyTrees />
        <LowPolyRocks />

        <Float
          speed={1}
          rotationIntensity={0.2}
          floatIntensity={0.3}
          floatingRange={[-0.05, 0.05]}
        >
          <GlassRose />
        </Float>

        <GlassCube />
        <Base />
        <Sparkles count={80} radius={2.5} />
        <MysticalSmoke />
      </Suspense>

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={3}
        maxDistance={8}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2}
        autoRotate
        autoRotateSpeed={0.5}
      />

      <EffectComposer
        multisampling={0}
        enableNormalPass={false}
        depthBuffer={false}
        stencilBuffer={false}
        renderPriority={-1}
      >
        <Bloom
          intensity={0.35}
          luminanceThreshold={0.35}
          luminanceSmoothing={0.8}
          mipmapBlur
        />
      </EffectComposer>
    </>
  );
}
