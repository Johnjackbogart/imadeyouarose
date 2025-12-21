import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  Float,
  OrbitControls,
  Stars,
  MeshTransmissionMaterial,
  RoundedBox,
} from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import GlassRose from "./GlassRose";
import IridescentRose from "./IridescentRose";
import RealisticRose from "./RealisticRose";
import SpiralRose from "./SpiralRose";
import Sparkles from "./Sparkles";
import MysticalSmoke from "./MysticalSmoke";

type RoseType = "glass" | "realistic" | "spiral" | "iridescent";

type SceneProps = {
  isMobile?: boolean;
  roseType?: RoseType;
};

function Lights() {
  return (
    <>
      {/* Warm ambient for sunset - increased */}
      <ambientLight intensity={0.6} color="#ffccaa" />

      {/* Sky hemisphere - warm sunset tones - increased */}
      <hemisphereLight
        intensity={1.0}
        color="#ff7744"
        groundColor="#442244"
      />

      {/* Main sun directional light - coming from sun position */}
      <directionalLight
        position={[-20, 5, -25]}
        intensity={2.0}
        color="#ffaa55"
      />

      {/* Warm rim light */}
      <spotLight
        position={[-10, 8, -10]}
        angle={0.5}
        penumbra={1}
        intensity={1.8}
        color="#ff8844"
      />

      {/* Cool fill light from opposite side */}
      <spotLight
        position={[8, 4, 8]}
        angle={0.6}
        penumbra={1}
        intensity={1.0}
        color="#8866aa"
      />

      {/* Accent light on the rose - increased */}
      <pointLight position={[0, 3, 0]} intensity={1.5} color="#ffbb77" />

      {/* Cool shadow fill */}
      <pointLight position={[3, -1, 3]} intensity={0.5} color="#6644aa" />

      {/* Additional fill light for overall brightness */}
      <pointLight position={[0, 5, 5]} intensity={0.8} color="#ffffff" />
    </>
  );
}

function GlassCube({ isMobile = false }: { isMobile?: boolean }) {
  return (
    <RoundedBox
      args={[4, 6, 4]}
      radius={0.3}
      smoothness={4}
      position={[0, 0.8, 0]}
      renderOrder={100}
    >
      <MeshTransmissionMaterial
        samples={isMobile ? 1 : 4}
        resolution={isMobile ? 256 : 256}
        transmission={1}
        roughness={isMobile ? 0.08 : 0}
        thickness={isMobile ? 0.12 : 0.2}
        ior={isMobile ? 1.35 : 1.5}
        chromaticAberration={isMobile ? 0 : 0.02}
        envMapIntensity={isMobile ? 0.02 : 0.05}
        anisotropy={0}
        distortion={0}
        distortionScale={0}
        temporalDistortion={0}
        attenuationDistance={10}
        attenuationColor="#ffffff"
        color="#ffffff"
        transmissionSampler={!isMobile}
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

function LowPolyMeadow({ isMobile = false }: { isMobile?: boolean }) {
  const geometry = useMemo(() => {
    const segments = isMobile ? 24 : 40;
    const plane = new THREE.PlaneGeometry(34, 34, segments, segments);
    plane.rotateX(-Math.PI / 2);

    const positions = plane.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];
    const color = new THREE.Color();

    for (let i = 0; i < positions.count; i += 1) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const dist = Math.sqrt(x * x + z * z);
      const innerRadius = 2.8;
      const falloff = THREE.MathUtils.clamp((dist - innerRadius) / 10, 0, 1);

      // Gentle broad undulations (reduced from before)
      const broadWave = Math.sin(x * 0.12) * Math.cos(z * 0.1) * 0.3;

      // More detailed small-scale bumps
      const bump1 = Math.sin(x * 0.8 + z * 0.6) * 0.15;
      const bump2 = Math.cos(x * 1.2 - z * 0.9) * 0.12;
      const bump3 = Math.sin(x * 1.5 + z * 1.3) * 0.1;

      // Fine texture noise
      const jitterSeed = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
      const jitter = (jitterSeed - Math.floor(jitterSeed) - 0.5) * 0.15;

      // Secondary noise layer
      const noise2Seed = Math.sin(x * 7.233 + z * 19.898) * 23421.631;
      const noise2 = (noise2Seed - Math.floor(noise2Seed) - 0.5) * 0.1;

      // Combine with falloff from center
      const broadHeight = broadWave * falloff;
      const detailHeight = (bump1 + bump2 + bump3 + jitter + noise2) * (0.4 + falloff * 0.6);
      const height = broadHeight + detailHeight;

      positions.setY(i, height);

      // Vary color based on height
      const lightness = THREE.MathUtils.clamp(
        0.26 + height * 0.15 + falloff * 0.06,
        0.2,
        0.42
      );
      const hue = 0.32 + height * 0.025;
      const saturation = 0.52 + falloff * 0.1;
      color.setHSL(hue, saturation, lightness);
      colors.push(color.r, color.g, color.b);
    }

    plane.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    plane.computeVertexNormals();
    return plane;
  }, [isMobile]);

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

// Helper to calculate meadow height at any position
function getMeadowHeight(x: number, z: number): number {
  const dist = Math.sqrt(x * x + z * z);
  const innerRadius = 2.8;
  const falloff = Math.max(0, Math.min(1, (dist - innerRadius) / 10));

  const broadWave = Math.sin(x * 0.12) * Math.cos(z * 0.1) * 0.3;
  const bump1 = Math.sin(x * 0.8 + z * 0.6) * 0.15;
  const bump2 = Math.cos(x * 1.2 - z * 0.9) * 0.12;
  const bump3 = Math.sin(x * 1.5 + z * 1.3) * 0.1;
  const jitterSeed = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453;
  const jitter = (jitterSeed - Math.floor(jitterSeed) - 0.5) * 0.15;

  const broadHeight = broadWave * falloff;
  const detailHeight = (bump1 + bump2 + bump3 + jitter) * (0.4 + falloff * 0.6);
  return broadHeight + detailHeight;
}

// Grass tufts scattered across the meadow
function GrassTufts({ isMobile = false }: { isMobile?: boolean }) {
  const grassData = useMemo(() => {
    const rand = createSeededRandom(789);
    const tufts: {
      position: [number, number, number];
      rotation: number;
      scale: number;
      color: string;
    }[] = [];

    const colors = ["#4a7c3f", "#3d6b35", "#5a8c4a", "#4d7842", "#3a6630"];
    const tuftCount = isMobile ? 90 : 200;

    for (let i = 0; i < tuftCount; i++) {
      const angle = rand() * Math.PI * 2;
      const radius = 3 + rand() * 13;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;

      const groundHeight = getMeadowHeight(x, z);

      tufts.push({
        position: [x, -2.45 + groundHeight, z],
        rotation: rand() * Math.PI * 2,
        scale: 0.08 + rand() * 0.12,
        color: colors[Math.floor(rand() * colors.length)],
      });
    }

    return tufts;
  }, [isMobile]);

  return (
    <group>
      {grassData.map((tuft, i) => (
        <group key={`grass-${i}`} position={tuft.position} rotation={[0, tuft.rotation, 0]}>
          {/* Multiple grass blades per tuft */}
          {[-0.03, 0, 0.03].map((offset, j) => (
            <mesh
              key={j}
              position={[offset, tuft.scale * 0.5, 0]}
              rotation={[0.1 + j * 0.05, 0, (j - 1) * 0.15]}
            >
              <coneGeometry args={[tuft.scale * 0.15, tuft.scale, 4]} />
              <meshStandardMaterial
                color={tuft.color}
                roughness={0.9}
                metalness={0.02}
                flatShading
              />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// Low poly bush cluster around the rose base
function RoseBaseBush({ isMobile = false }: { isMobile?: boolean }) {
  const bushClusters = useMemo(() => {
    const rand = createSeededRandom(555);
    const clusters: {
      position: [number, number, number];
      scale: number;
      color: string;
    }[] = [];

    const colors = ["#3d6b35", "#4a7c3f", "#2d5a28", "#3a6630", "#4d7842"];
    const ringCount = isMobile ? 12 : 18;
    const innerCount = isMobile ? 6 : 10;

    // Create a ring of bushes around the base
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2 + rand() * 0.3;
      const radius = 2.2 + rand() * 0.5;
      clusters.push({
        position: [
          Math.cos(angle) * radius,
          -2.3 + rand() * 0.1,
          Math.sin(angle) * radius,
        ],
        scale: 0.3 + rand() * 0.25,
        color: colors[Math.floor(rand() * colors.length)],
      });
    }

    // Add some smaller inner bushes
    for (let i = 0; i < innerCount; i++) {
      const angle = (i / innerCount) * Math.PI * 2 + rand() * 0.5;
      const radius = 2.6 + rand() * 0.4;
      clusters.push({
        position: [
          Math.cos(angle) * radius,
          -2.35 + rand() * 0.1,
          Math.sin(angle) * radius,
        ],
        scale: 0.2 + rand() * 0.15,
        color: colors[Math.floor(rand() * colors.length)],
      });
    }

    return clusters;
  }, [isMobile]);

  return (
    <group>
      {bushClusters.map((bush, i) => (
        <group key={`bush-${i}`} position={bush.position}>
          {/* Main bush sphere */}
          <mesh scale={bush.scale}>
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={bush.color}
              roughness={0.9}
              metalness={0.02}
              flatShading
            />
          </mesh>
          {/* Secondary smaller puff */}
          <mesh
            position={[bush.scale * 0.4, bush.scale * 0.2, bush.scale * 0.3]}
            scale={bush.scale * 0.6}
          >
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={bush.color}
              roughness={0.9}
              metalness={0.02}
              flatShading
            />
          </mesh>
          {/* Third puff for fullness */}
          <mesh
            position={[-bush.scale * 0.3, bush.scale * 0.1, -bush.scale * 0.2]}
            scale={bush.scale * 0.5}
          >
            <dodecahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={bush.color}
              roughness={0.9}
              metalness={0.02}
              flatShading
            />
          </mesh>
        </group>
      ))}
    </group>
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

// Initials stamped on the mountain
function MountainInitials() {
  const groupRef = useRef<THREE.Group>(null);
  const [shapes, setShapes] = useState<THREE.Shape[]>([]);

  useEffect(() => {
    const loader = new SVGLoader();
    loader.load('/new1.svg', (data) => {
      const loadedShapes: THREE.Shape[] = [];
      data.paths.forEach((path) => {
        const pathShapes = SVGLoader.createShapes(path);
        loadedShapes.push(...pathShapes);
      });
      setShapes(loadedShapes);
    });
  }, []);

  const geometry = useMemo(() => {
    if (shapes.length === 0) return null;

    const group = new THREE.Group();

    shapes.forEach((shape) => {
      const geo = new THREE.ExtrudeGeometry(shape, {
        depth: 8,
        bevelEnabled: true,
        bevelThickness: 1,
        bevelSize: 1,
        bevelSegments: 2,
      });
      group.add(new THREE.Mesh(geo));
    });

    // Merge all geometries
    const mergedGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];

    group.children.forEach((child) => {
      const mesh = child as THREE.Mesh;
      const geo = mesh.geometry;
      const pos = geo.attributes.position;
      const norm = geo.attributes.normal;

      for (let i = 0; i < pos.count; i++) {
        positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        normals.push(norm.getX(i), norm.getY(i), norm.getZ(i));
      }
    });

    mergedGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    mergedGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));

    // Center and scale the geometry
    mergedGeo.computeBoundingBox();
    const box = mergedGeo.boundingBox!;
    const centerX = (box.min.x + box.max.x) / 2;
    const centerY = (box.min.y + box.max.y) / 2;
    mergedGeo.translate(-centerX, -centerY, 0);

    return mergedGeo;
  }, [shapes]);

  if (!geometry) return null;

  // Position on a mountain in the back - visible from the default camera angle
  // Mountains are at radius ~18-22, we'll place this on one facing the camera
  const mountainAngle = Math.PI * 1.15; // Back-left area
  const mountainRadius = 19;
  const mountainHeight = 4;

  return (
    <group
      ref={groupRef}
      position={[
        Math.cos(mountainAngle) * mountainRadius,
        mountainHeight,
        Math.sin(mountainAngle) * mountainRadius,
      ]}
      rotation={[0, -mountainAngle + Math.PI, 0]} // Face toward center
      scale={0.012} // Scale down the SVG
    >
      <mesh geometry={geometry}>
        <meshStandardMaterial
          color="#1a1a2e"
          roughness={0.8}
          metalness={0.1}
          side={THREE.DoubleSide}
        />
      </mesh>
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
      blue: [
        '#87CEEB', // light sky blue
        '#64b5f6', // light blue
        '#42a5f5', // medium blue
        '#2196f3', // blue
        '#1e88e5', // darker blue
        '#1976d2', // deep blue
        '#1565c0', // navy blue
        '#0d47a1', // dark navy
        '#5c6bc0', // indigo blue
        '#3f51b5', // indigo
      ],
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

// Low poly log cabin
function LowPolyCabin() {
  const woodColor = "#8B4513";
  const roofColor = "#5D4037";
  const doorColor = "#4a3728";

  // Cabin position
  const cabinX = 6;
  const cabinZ = 4;
  const groundY = -2.45 + getMeadowHeight(cabinX, cabinZ);

  // Triangular prism roof geometry
  const roofGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const w = 1.0; // half width
    const d = 0.8; // half depth
    const h = 0.6; // height of peak

    // Vertices for triangular prism roof
    const positions = new Float32Array([
      // Front triangle
      -w, 0, d,
      w, 0, d,
      0, h, d,
      // Back triangle
      w, 0, -d,
      -w, 0, -d,
      0, h, -d,
      // Left slope
      -w, 0, d,
      0, h, d,
      0, h, -d,
      -w, 0, d,
      0, h, -d,
      -w, 0, -d,
      // Right slope
      w, 0, d,
      0, h, -d,
      0, h, d,
      w, 0, d,
      w, 0, -d,
      0, h, -d,
    ]);

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    return geo;
  }, []);

  return (
    <group position={[cabinX, groundY, cabinZ]} rotation={[0, Math.atan2(-cabinX, -cabinZ), 0]}>
      {/* Main cabin body */}
      <mesh position={[0, 0.6, 0]}>
        <boxGeometry args={[1.8, 1.2, 1.4]} />
        <meshStandardMaterial
          color={woodColor}
          roughness={0.95}
          metalness={0.02}
          flatShading
        />
      </mesh>

      {/* Log texture lines on walls */}
      {[0.2, 0.5, 0.8].map((y, i) => (
        <mesh key={`log-front-${i}`} position={[0, y + 0.1, 0.71]}>
          <boxGeometry args={[1.75, 0.08, 0.02]} />
          <meshStandardMaterial color="#6d3a1a" roughness={1} flatShading />
        </mesh>
      ))}
      {[0.2, 0.5, 0.8].map((y, i) => (
        <mesh key={`log-back-${i}`} position={[0, y + 0.1, -0.71]}>
          <boxGeometry args={[1.75, 0.08, 0.02]} />
          <meshStandardMaterial color="#6d3a1a" roughness={1} flatShading />
        </mesh>
      ))}

      {/* Roof - triangular prism aligned with walls */}
      <mesh geometry={roofGeometry} position={[0, 1.2, 0]}>
        <meshStandardMaterial
          color={roofColor}
          roughness={0.9}
          metalness={0.05}
          flatShading
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Door */}
      <mesh position={[0, 0.4, 0.71]}>
        <boxGeometry args={[0.4, 0.7, 0.05]} />
        <meshStandardMaterial
          color={doorColor}
          roughness={0.9}
          metalness={0.02}
          flatShading
        />
      </mesh>

      {/* Door handle */}
      <mesh position={[0.12, 0.4, 0.75]}>
        <sphereGeometry args={[0.04, 4, 4]} />
        <meshStandardMaterial
          color="#c9a227"
          roughness={0.3}
          metalness={0.8}
          flatShading
        />
      </mesh>

      {/* Window */}
      <mesh position={[0.55, 0.7, 0.71]}>
        <boxGeometry args={[0.35, 0.3, 0.05]} />
        <meshStandardMaterial
          color="#87CEEB"
          roughness={0.1}
          metalness={0.1}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Window frame */}
      <mesh position={[0.55, 0.7, 0.73]}>
        <boxGeometry args={[0.38, 0.03, 0.02]} />
        <meshStandardMaterial color="#5a3d2b" roughness={1} flatShading />
      </mesh>
      <mesh position={[0.55, 0.7, 0.73]}>
        <boxGeometry args={[0.03, 0.33, 0.02]} />
        <meshStandardMaterial color="#5a3d2b" roughness={1} flatShading />
      </mesh>

      {/* Chimney */}
      <mesh position={[-0.5, 1.6, 0]}>
        <boxGeometry args={[0.25, 0.5, 0.25]} />
        <meshStandardMaterial
          color="#7a5c4f"
          roughness={0.95}
          metalness={0.02}
          flatShading
        />
      </mesh>

      {/* Small step/porch */}
      <mesh position={[0, 0.05, 0.9]}>
        <boxGeometry args={[0.6, 0.1, 0.3]} />
        <meshStandardMaterial
          color="#9a6b4a"
          roughness={0.95}
          metalness={0.02}
          flatShading
        />
      </mesh>
    </group>
  );
}

// Low poly pond with reflective water
interface PondProps {
  position: [number, number, number];
  scale?: number;
  seed?: number;
  hasLilies?: boolean;
}

function LowPolyPond({ position, scale = 1, seed = 123, hasLilies = true }: PondProps) {
  const pondGeometry = useMemo(() => {
    const geo = new THREE.CircleGeometry(1.5 * scale, 8);
    geo.rotateX(-Math.PI / 2);
    return geo;
  }, [scale]);

  const rocks = useMemo(() => {
    const rand = createSeededRandom(seed);
    const rockCount = Math.max(4, Math.floor(6 * scale));
    return Array.from({ length: rockCount }, (_, i) => {
      const angle = (i / rockCount) * Math.PI * 2 + rand() * 0.3;
      const radius = (1.4 + rand() * 0.4) * scale;
      const rockScale = (0.15 + rand() * 0.2) * scale;
      return {
        position: [Math.cos(angle) * radius, -0.1, Math.sin(angle) * radius] as const,
        scale: rockScale,
        rotation: [rand() * 0.5, rand() * Math.PI * 2, rand() * 0.5] as const,
      };
    });
  }, [scale, seed]);

  return (
    <group position={position}>
      {/* Water surface */}
      <mesh geometry={pondGeometry} position={[0, 0.05, 0]}>
        <meshStandardMaterial
          color="#3a7ca5"
          roughness={0.1}
          metalness={0.4}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Deeper center */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1 * scale, 6]} />
        <meshStandardMaterial
          color="#2d5a7b"
          roughness={0.05}
          metalness={0.5}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Pond edge/bank */}
      <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.5 * scale, 0.15 * scale, 4, 8]} />
        <meshStandardMaterial
          color="#6d5a4a"
          roughness={0.95}
          metalness={0.02}
          flatShading
        />
      </mesh>

      {/* Rocks around pond */}
      {rocks.map((rock, i) => (
        <mesh
          key={`pond-rock-${i}`}
          position={rock.position}
          rotation={rock.rotation}
          scale={rock.scale}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#7a7a7a"
            roughness={0.85}
            metalness={0.08}
            flatShading
          />
        </mesh>
      ))}

      {/* Water lily pads */}
      {hasLilies && scale >= 0.6 && (
        <>
          <mesh position={[0.4 * scale, 0.08, 0.3 * scale]} rotation={[-Math.PI / 2, 0, 0.5]}>
            <circleGeometry args={[0.18 * scale, 6]} />
            <meshStandardMaterial
              color="#4a8c5c"
              roughness={0.8}
              metalness={0.05}
              flatShading
            />
          </mesh>
          <mesh position={[-0.3 * scale, 0.08, -0.5 * scale]} rotation={[-Math.PI / 2, 0, 1.2]}>
            <circleGeometry args={[0.15 * scale, 6]} />
            <meshStandardMaterial
              color="#3d7a4f"
              roughness={0.8}
              metalness={0.05}
              flatShading
            />
          </mesh>
          {scale >= 1 && (
            <mesh position={[0.6 * scale, 0.08, -0.2 * scale]} rotation={[-Math.PI / 2, 0, 2.1]}>
              <circleGeometry args={[0.12 * scale, 5]} />
              <meshStandardMaterial
                color="#5a9a6a"
                roughness={0.8}
                metalness={0.05}
                flatShading
              />
            </mesh>
          )}
        </>
      )}
    </group>
  );
}

// Low poly river flowing through the scene
function LowPolyRiver() {
  const riverPath = useMemo(() => {
    // River flows across the front of the meadow where it's visible
    // Calculate y positions based on terrain
    const pathPoints: [number, number, number][] = [];
    const xzPoints: [number, number][] = [
      [-12, 6],
      [-8, 5],
      [-5, 4.5],
      [-3, 5],
      [0, 6],
      [3, 7],
      [6, 8],
      [10, 10],
    ];

    for (const [x, z] of xzPoints) {
      const y = -2.38 + getMeadowHeight(x, z); // Slightly above ground
      pathPoints.push([x, y, z]);
    }

    return pathPoints;
  }, []);

  const riverGeometry = useMemo(() => {
    const width = 0.9;

    // Create river segments
    const positions: number[] = [];
    const colors: number[] = [];
    const color = new THREE.Color();

    for (let i = 0; i < riverPath.length - 1; i++) {
      const curr = riverPath[i];
      const next = riverPath[i + 1];

      // Calculate perpendicular direction for width
      const dx = next[0] - curr[0];
      const dz = next[2] - curr[2];
      const len = Math.sqrt(dx * dx + dz * dz);
      const perpX = -dz / len;
      const perpZ = dx / len;

      // Vary width slightly along river
      const w1 = width * (0.9 + Math.sin(i * 0.7) * 0.2);
      const w2 = width * (0.9 + Math.sin((i + 1) * 0.7) * 0.2);

      // Two triangles per segment
      // Triangle 1
      positions.push(
        curr[0] + perpX * w1, curr[1], curr[2] + perpZ * w1,
        curr[0] - perpX * w1, curr[1], curr[2] - perpZ * w1,
        next[0] + perpX * w2, next[1], next[2] + perpZ * w2
      );
      // Triangle 2
      positions.push(
        curr[0] - perpX * w1, curr[1], curr[2] - perpZ * w1,
        next[0] - perpX * w2, next[1], next[2] - perpZ * w2,
        next[0] + perpX * w2, next[1], next[2] + perpZ * w2
      );

      // Colors - blue water
      for (let j = 0; j < 6; j++) {
        color.setHSL(0.55, 0.65, 0.4);
        colors.push(color.r, color.g, color.b);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    return geo;
  }, [riverPath]);

  // River bank rocks
  const bankRocks = useMemo(() => {
    const rand = createSeededRandom(456);
    const rocks: { position: [number, number, number]; scale: number; rotation: [number, number, number] }[] = [];

    for (let i = 0; i < riverPath.length - 1; i++) {
      const curr = riverPath[i];
      const next = riverPath[i + 1];
      const dx = next[0] - curr[0];
      const dz = next[2] - curr[2];
      const len = Math.sqrt(dx * dx + dz * dz);
      const perpX = -dz / len;
      const perpZ = dx / len;

      // Add rocks on both sides
      for (let side = -1; side <= 1; side += 2) {
        if (rand() > 0.4) {
          const offset = 1.0 + rand() * 0.3;
          const rx = curr[0] + perpX * offset * side;
          const rz = curr[2] + perpZ * offset * side;
          rocks.push({
            position: [rx, -2.42 + getMeadowHeight(rx, rz), rz],
            scale: 0.15 + rand() * 0.2,
            rotation: [rand() * 0.5, rand() * Math.PI * 2, rand() * 0.5],
          });
        }
      }
    }

    return rocks;
  }, [riverPath]);

  return (
    <group>
      {/* River water */}
      <mesh geometry={riverGeometry}>
        <meshStandardMaterial
          vertexColors
          roughness={0.05}
          metalness={0.6}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* River bank rocks */}
      {bankRocks.map((rock, i) => (
        <mesh
          key={`river-rock-${i}`}
          position={rock.position}
          rotation={rock.rotation}
          scale={rock.scale}
        >
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial
            color="#6a6a6a"
            roughness={0.85}
            metalness={0.08}
            flatShading
          />
        </mesh>
      ))}
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

// Helper to clear a group and remove all children from the scene
function clearGroup(group: THREE.Group) {
  // Recursively clear all nested groups and remove from parent
  const objectsToRemove: THREE.Object3D[] = [];

  group.traverse((object) => {
    if (object !== group) {
      objectsToRemove.push(object);
    }
  });

  // Remove all objects from their parents
  objectsToRemove.forEach((object) => {
    if (object.parent) {
      object.parent.remove(object);
    }
  });
}

function RoseComponent({ roseType }: { roseType: RoseType }) {
  const groupRef = useRef<THREE.Group>(null);

  // Cleanup when rose type changes - clear all children from the group
  useEffect(() => {
    const currentGroup = groupRef.current;

    return () => {
      if (currentGroup) {
        clearGroup(currentGroup);
      }
    };
  }, [roseType]);

  // Use key to force complete remount when rose type changes
  // This ensures React properly unmounts old components and their useFrame hooks
  return (
    <group ref={groupRef} key={roseType}>
      {roseType === "realistic" && <RealisticRose />}
      {roseType === "spiral" && <SpiralRose />}
      {roseType === "glass" && <GlassRose />}
      {roseType === "iridescent" && <IridescentRose />}
    </group>
  );
}

export default function Scene({ isMobile = false, roseType = "glass" }: SceneProps) {
  const { camera } = useThree();
  const controls = useRef<OrbitControlsImpl | null>(null);

  useEffect(() => {
    const position = isMobile ? [0, 2.6, 7.8] : [0, 1, 8];
    const target = isMobile ? [0, 0.8, 0] : [0, 0.5, 0];
    camera.position.set(position[0], position[1], position[2]);
    camera.lookAt(target[0], target[1], target[2]);
    camera.updateProjectionMatrix();
    if (controls.current) {
      controls.current.target.set(target[0], target[1], target[2]);
    }
    controls.current?.update();
  }, [camera, isMobile]);

  const maxDistance = isMobile ? 11 : 8;
  const minDistance = isMobile ? 4 : 3;
  const pondConfigs = useMemo(
    () => [
      {
        position: [-5, -2.35 + getMeadowHeight(-5, 5), 5] as [number, number, number],
        scale: 1,
        seed: 123,
      },
      {
        position: [8, -2.35 + getMeadowHeight(8, -2), -2] as [number, number, number],
        scale: 0.7,
        seed: 234,
      },
      {
        position: [-8, -2.35 + getMeadowHeight(-8, -6), -6] as [number, number, number],
        scale: 1.3,
        seed: 345,
      },
      {
        position: [4, -2.35 + getMeadowHeight(4, 8), 8] as [number, number, number],
        scale: 0.5,
        seed: 456,
        hasLilies: false,
      },
      {
        position: [-3, -2.35 + getMeadowHeight(-3, -7), -7] as [number, number, number],
        scale: 0.8,
        seed: 567,
      },
      {
        position: [9, -2.35 + getMeadowHeight(9, 6), 6] as [number, number, number],
        scale: 0.6,
        seed: 678,
        hasLilies: false,
      },
    ],
    []
  );
  const pondsToRender = isMobile ? pondConfigs.slice(0, 3) : pondConfigs;

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
      <MountainInitials />

      {!isMobile && (
        <Stars
          radius={35}
          depth={25}
          count={180}
          factor={2}
          saturation={0.1}
          fade
          speed={0.05}
        />
      )}

      <Suspense fallback={null}>
        <LowPolyMeadow isMobile={isMobile} />
        <GrassTufts isMobile={isMobile} />
        <LowPolyHills />
        <LowPolyTrees />
        <LowPolyRocks />
        <LowPolyCabin />
        <LowPolyRiver />
        {/* Multiple ponds of various sizes - slightly above terrain */}
        {pondsToRender.map((pond, index) => (
          <LowPolyPond
            key={`pond-${index}`}
            position={pond.position}
            scale={pond.scale}
            seed={pond.seed}
            hasLilies={pond.hasLilies}
          />
        ))}

        <Float
          speed={1}
          rotationIntensity={roseType === "iridescent" ? 0 : 0.2}
          floatIntensity={roseType === "iridescent" ? 0.18 : 0.3}
          floatingRange={[-0.05, 0.05]}
        >
          <RoseComponent roseType={roseType} />
        </Float>

        <GlassCube isMobile={isMobile} />
        <RoseBaseBush isMobile={isMobile} />
        <Sparkles count={isMobile ? 40 : 80} radius={2.5} />
        <MysticalSmoke />
      </Suspense>

      <OrbitControls
        ref={controls}
        enablePan={false}
        enableZoom={true}
        minDistance={minDistance}
        maxDistance={maxDistance}
        minPolarAngle={0.1}
        maxPolarAngle={Math.PI / 2}
        autoRotate
        autoRotateSpeed={0.5}
      />

      {!isMobile && (
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
      )}
    </>
  );
}
