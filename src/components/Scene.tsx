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
      {/* Warm ambient for sunset */}
      <ambientLight intensity={0.3} color="#ffccaa" />

      {/* Sky hemisphere - warm sunset tones */}
      <hemisphereLight
        intensity={0.6}
        color="#ff7744"
        groundColor="#442244"
      />

      {/* Main sun directional light - coming from sun position */}
      <directionalLight
        position={[-20, 5, -25]}
        intensity={1.5}
        color="#ffaa55"
      />

      {/* Warm rim light */}
      <spotLight
        position={[-10, 8, -10]}
        angle={0.5}
        penumbra={1}
        intensity={1.2}
        color="#ff8844"
      />

      {/* Cool fill light from opposite side */}
      <spotLight
        position={[8, 4, 8]}
        angle={0.6}
        penumbra={1}
        intensity={0.6}
        color="#8866aa"
      />

      {/* Accent light on the rose */}
      <pointLight position={[0, 3, 0]} intensity={0.8} color="#ffbb77" />

      {/* Cool shadow fill */}
      <pointLight position={[3, -1, 3]} intensity={0.25} color="#6644aa" />
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

// Low poly mountain range encircling the scene
function LowPolyMountains() {
  const mountains = useMemo(() => {
    const rand = createSeededRandom(42);
    const result: {
      position: readonly [number, number, number];
      scale: readonly [number, number, number];
      rotation: number;
      color: string;
      peaks: number;
    }[] = [];

    // Create mountain range in a circle around the scene
    const mountainCount = 24;
    for (let i = 0; i < mountainCount; i++) {
      const angle = (i / mountainCount) * Math.PI * 2;
      const radius = 18 + rand() * 4;
      const height = 4 + rand() * 6;
      const width = 3 + rand() * 3;

      // Vary colors from deep purple to warm orange based on position relative to sun
      const sunAngle = Math.PI * 0.75; // Sun position angle
      const angleDiff = Math.abs(angle - sunAngle);
      const sunInfluence = Math.max(0, 1 - angleDiff / Math.PI);

      // Blend between shadow colors and sun-lit colors
      const hue = 260 - sunInfluence * 40; // Purple to orange
      const sat = 25 + sunInfluence * 20;
      const light = 20 + sunInfluence * 25;

      result.push({
        position: [Math.cos(angle) * radius, -2.5, Math.sin(angle) * radius] as const,
        scale: [width, height, width * 0.8] as const,
        rotation: angle + (rand() - 0.5) * 0.3,
        color: `hsl(${hue}, ${sat}%, ${light}%)`,
        peaks: 3 + Math.floor(rand() * 3),
      });
    }

    // Add some closer, smaller foothills
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2 + 0.2;
      const radius = 12 + rand() * 3;
      const height = 2 + rand() * 2.5;
      const width = 2 + rand() * 2;

      const sunAngle = Math.PI * 0.75;
      const angleDiff = Math.abs(angle - sunAngle);
      const sunInfluence = Math.max(0, 1 - angleDiff / Math.PI);

      const hue = 250 - sunInfluence * 30;
      const sat = 20 + sunInfluence * 15;
      const light = 25 + sunInfluence * 20;

      result.push({
        position: [Math.cos(angle) * radius, -2.5, Math.sin(angle) * radius] as const,
        scale: [width, height, width * 0.7] as const,
        rotation: angle + rand() * 0.5,
        color: `hsl(${hue}, ${sat}%, ${light}%)`,
        peaks: 2 + Math.floor(rand() * 2),
      });
    }

    return result;
  }, []);

  return (
    <group>
      {mountains.map((mountain, index) => (
        <group
          key={`mountain-${index}`}
          position={mountain.position}
          rotation={[0, mountain.rotation, 0]}
          scale={mountain.scale}
        >
          {/* Main peak */}
          <mesh position={[0, 0.5, 0]}>
            <coneGeometry args={[1, 1, 5 + mountain.peaks, 1]} />
            <meshStandardMaterial
              color={mountain.color}
              roughness={0.9}
              metalness={0.05}
              flatShading
            />
          </mesh>
          {/* Secondary peaks */}
          <mesh position={[-0.4, 0.35, 0.2]} scale={[0.6, 0.7, 0.6]}>
            <coneGeometry args={[1, 1, 4, 1]} />
            <meshStandardMaterial
              color={mountain.color}
              roughness={0.9}
              metalness={0.05}
              flatShading
            />
          </mesh>
          <mesh position={[0.35, 0.3, -0.15]} scale={[0.5, 0.6, 0.5]}>
            <coneGeometry args={[1, 1, 4, 1]} />
            <meshStandardMaterial
              color={mountain.color}
              roughness={0.9}
              metalness={0.05}
              flatShading
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// Low poly sunset sky made of colorful geometric shapes
function LowPolySunsetShapes() {
  const shapes = useMemo(() => {
    const rand = createSeededRandom(99);
    const result: {
      position: readonly [number, number, number];
      rotation: readonly [number, number, number];
      scale: number;
      color: string;
      geometry: 'tetra' | 'octa' | 'icosa' | 'dodeca' | 'box';
      opacity: number;
    }[] = [];

    // Color palette for sunset
    const colors = {
      yellow: ['#ffeb3b', '#ffc107', '#ff9800', '#ffe082', '#fff59d'],
      orange: ['#ff5722', '#ff7043', '#ff8a65', '#ffab91', '#e65100'],
      pink: ['#e91e63', '#f06292', '#ff80ab', '#ff4081', '#c2185b'],
      red: ['#f44336', '#ef5350', '#e53935', '#ff1744', '#d32f2f'],
      blue: ['#2196f3', '#64b5f6', '#1976d2', '#0d47a1', '#5c6bc0'],
      purple: ['#9c27b0', '#ba68c8', '#7b1fa2', '#6a1b9a', '#8e24aa'],
    };

    const allColors = [
      ...colors.yellow,
      ...colors.orange,
      ...colors.pink,
      ...colors.red,
      ...colors.blue,
      ...colors.purple,
    ];

    const geometries: ('tetra' | 'octa' | 'icosa' | 'dodeca' | 'box')[] =
      ['tetra', 'octa', 'icosa', 'dodeca', 'box'];

    // Upper sky - blues and purples (top dome)
    for (let i = 0; i < 25; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 30 + rand() * 20;
      const height = 20 + rand() * 25;
      const blueColors = [...colors.blue, ...colors.purple];

      result.push({
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius,
        ] as const,
        rotation: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI] as const,
        scale: 4 + rand() * 8,
        color: blueColors[Math.floor(rand() * blueColors.length)],
        geometry: geometries[Math.floor(rand() * geometries.length)],
        opacity: 0.7 + rand() * 0.3,
      });
    }

    // Mid sky - pinks and light blues
    for (let i = 0; i < 30; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 28 + rand() * 22;
      const height = 8 + rand() * 15;
      const midColors = [...colors.pink, ...colors.blue.slice(0, 2)];

      result.push({
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius,
        ] as const,
        rotation: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI] as const,
        scale: 3 + rand() * 7,
        color: midColors[Math.floor(rand() * midColors.length)],
        geometry: geometries[Math.floor(rand() * geometries.length)],
        opacity: 0.75 + rand() * 0.25,
      });
    }

    // Horizon level - yellows, oranges, reds (sunset band)
    for (let i = 0; i < 45; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 25 + rand() * 25;
      const height = -2 + rand() * 12;
      const warmColors = [...colors.yellow, ...colors.orange, ...colors.red];

      result.push({
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius,
        ] as const,
        rotation: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI] as const,
        scale: 3 + rand() * 6,
        color: warmColors[Math.floor(rand() * warmColors.length)],
        geometry: geometries[Math.floor(rand() * geometries.length)],
        opacity: 0.8 + rand() * 0.2,
      });
    }

    // Large background shapes for depth
    for (let i = 0; i < 15; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 45 + rand() * 15;
      const height = rand() * 30;

      result.push({
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius,
        ] as const,
        rotation: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI] as const,
        scale: 10 + rand() * 15,
        color: allColors[Math.floor(rand() * allColors.length)],
        geometry: geometries[Math.floor(rand() * geometries.length)],
        opacity: 0.4 + rand() * 0.3,
      });
    }

    // Sun direction cluster - extra warm shapes
    const sunAngle = Math.PI * 0.75;
    for (let i = 0; i < 20; i++) {
      const angleOffset = (rand() - 0.5) * 0.8;
      const angle = sunAngle + angleOffset;
      const radius = 20 + rand() * 20;
      const height = 2 + rand() * 10;
      const sunColors = [...colors.yellow, ...colors.orange];

      result.push({
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius,
        ] as const,
        rotation: [rand() * Math.PI, rand() * Math.PI, rand() * Math.PI] as const,
        scale: 2 + rand() * 5,
        color: sunColors[Math.floor(rand() * sunColors.length)],
        geometry: geometries[Math.floor(rand() * geometries.length)],
        opacity: 0.85 + rand() * 0.15,
      });
    }

    return result;
  }, []);

  const getGeometry = (type: string, key: number) => {
    switch (type) {
      case 'tetra':
        return <tetrahedronGeometry key={key} args={[1, 0]} />;
      case 'octa':
        return <octahedronGeometry key={key} args={[1, 0]} />;
      case 'icosa':
        return <icosahedronGeometry key={key} args={[1, 0]} />;
      case 'dodeca':
        return <dodecahedronGeometry key={key} args={[1, 0]} />;
      case 'box':
        return <boxGeometry key={key} args={[1, 1, 1]} />;
      default:
        return <octahedronGeometry key={key} args={[1, 0]} />;
    }
  };

  return (
    <group>
      {shapes.map((shape, index) => (
        <mesh
          key={`sunset-shape-${index}`}
          position={shape.position}
          rotation={shape.rotation}
          scale={shape.scale}
        >
          {getGeometry(shape.geometry, index)}
          <meshBasicMaterial
            color={shape.color}
            transparent
            opacity={shape.opacity}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// Low poly sun with glow
function LowPolySun() {
  const sunPosition: [number, number, number] = [-25, 4, -30];

  // Create sun rays geometry
  const raysGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const rayCount = 12;

    const centerColor = new THREE.Color("#fff5e6");
    const edgeColor = new THREE.Color("#ff8c42");

    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2;
      const innerRadius = 2.5;
      const outerRadius = 5 + Math.sin(i * 3) * 1.5;

      // Triangle ray
      positions.push(0, 0, 0);
      positions.push(
        Math.cos(angle - 0.1) * innerRadius,
        Math.sin(angle - 0.1) * innerRadius,
        0
      );
      positions.push(
        Math.cos(angle) * outerRadius,
        Math.sin(angle) * outerRadius,
        0
      );

      positions.push(0, 0, 0);
      positions.push(
        Math.cos(angle) * outerRadius,
        Math.sin(angle) * outerRadius,
        0
      );
      positions.push(
        Math.cos(angle + 0.1) * innerRadius,
        Math.sin(angle + 0.1) * innerRadius,
        0
      );

      // Colors for each vertex
      for (let j = 0; j < 2; j++) {
        colors.push(centerColor.r, centerColor.g, centerColor.b);
        colors.push(edgeColor.r, edgeColor.g, edgeColor.b);
        colors.push(edgeColor.r * 0.5, edgeColor.g * 0.5, edgeColor.b * 0.5);
      }
    }

    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

    return geo;
  }, []);

  return (
    <group position={sunPosition}>
      {/* Sun glow (outer) */}
      <mesh>
        <circleGeometry args={[4, 16]} />
        <meshBasicMaterial
          color="#ffb347"
          transparent
          opacity={0.3}
        />
      </mesh>

      {/* Sun rays */}
      <mesh geometry={raysGeometry} rotation={[0, 0, Math.PI / 12]}>
        <meshBasicMaterial
          vertexColors
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Main sun disc */}
      <mesh position={[0, 0, 0.1]}>
        <circleGeometry args={[2.2, 8]} />
        <meshBasicMaterial color="#ffdd77" />
      </mesh>

      {/* Inner bright core */}
      <mesh position={[0, 0.3, 0.2]}>
        <circleGeometry args={[1.4, 6]} />
        <meshBasicMaterial color="#fff8e7" />
      </mesh>

      {/* Sun point light for scene illumination */}
      <pointLight
        position={[0, 0, 5]}
        intensity={2}
        color="#ffaa55"
        distance={60}
      />
    </group>
  );
}

// Sunset-colored clouds
function SunsetClouds() {
  const clouds = useMemo(() => {
    const rand = createSeededRandom(77);
    const result: {
      position: readonly [number, number, number];
      scale: number;
      color: string;
    }[] = [];

    for (let i = 0; i < 15; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 20 + rand() * 20;
      const height = 8 + rand() * 12;

      // Warmer colors near the sun
      const sunAngle = Math.PI * 0.75 + Math.PI; // Opposite of sun direction in sky
      const angleDiff = Math.abs(angle - sunAngle);
      const warmth = Math.max(0, 1 - angleDiff / Math.PI);

      const hue = 350 + warmth * 40; // Pink to orange
      const sat = 60 + warmth * 30;
      const light = 70 + warmth * 20;

      result.push({
        position: [Math.cos(angle) * radius, height, Math.sin(angle) * radius] as const,
        scale: 2 + rand() * 4,
        color: `hsl(${hue % 360}, ${sat}%, ${light}%)`,
      });
    }

    return result;
  }, []);

  return (
    <group>
      {clouds.map((cloud, index) => (
        <group key={`cloud-${index}`} position={cloud.position}>
          {/* Cloud puffs - low poly style */}
          <mesh scale={cloud.scale}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={cloud.color}
              roughness={1}
              metalness={0}
              flatShading
              transparent
              opacity={0.85}
            />
          </mesh>
          <mesh position={[1.2, -0.2, 0.3]} scale={cloud.scale * 0.7}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={cloud.color}
              roughness={1}
              metalness={0}
              flatShading
              transparent
              opacity={0.85}
            />
          </mesh>
          <mesh position={[-0.9, 0.1, -0.2]} scale={cloud.scale * 0.6}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={cloud.color}
              roughness={1}
              metalness={0}
              flatShading
              transparent
              opacity={0.85}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

export default function Scene() {
  return (
    <>
      {/* Light blue sky background */}
      <color attach="background" args={["#87CEEB"]} />

      {/* Low poly sunset shapes encasing the scene */}
      <LowPolySunsetShapes />
      <fog attach="fog" args={["#ff6b4a", 20, 55]} />

      <Lights />

      {/* Sun setting over mountains */}
      <LowPolySun />

      {/* Sunset clouds */}
      <SunsetClouds />

      {/* Mountain range */}
      <LowPolyMountains />

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
