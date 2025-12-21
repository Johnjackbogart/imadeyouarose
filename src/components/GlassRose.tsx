import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface LeafProps {
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: number;
  phase?: number;
  flutter?: number;
}

interface PetalConfig {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  geometryIndex: number;
  materialIndex: number;
  openness: number; // 0-1 how open this petal is (outer petals more open)
}

interface ThornConfig {
  position: [number, number, number];
  rotation: [number, number, number];
}

interface ProceduralLeafConfig {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  phase: number;
  flutter: number;
}

interface SepalConfig {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

// Shared materials - reuse instead of creating per-mesh
const petalMaterialBase = {
  metalness: 0.02,
  roughness: 0.5,
  transmission: 0.08,
  thickness: 0.18,
  ior: 1.35,
  clearcoat: 0.22,
  clearcoatRoughness: 0.6,
  sheen: 0.75,
  sheenRoughness: 0.8,
  transparent: true,
  opacity: 0.96,
  side: THREE.DoubleSide,
};

const petalMaterials = [
  new THREE.MeshPhysicalMaterial({
    ...petalMaterialBase,
    color: "#b4002b",
    sheenColor: "#ff8fa5",
  }),
  new THREE.MeshPhysicalMaterial({
    ...petalMaterialBase,
    color: "#d10b35",
    sheenColor: "#ff9fb2",
  }),
  new THREE.MeshPhysicalMaterial({
    ...petalMaterialBase,
    color: "#e01440",
    sheenColor: "#ffb0bf",
  }),
];

const stemMaterial = new THREE.MeshPhysicalMaterial({
  color: "#2b8f55",
  metalness: 0.05,
  roughness: 0.45,
  transmission: 0.1,
  thickness: 0.25,
  ior: 1.35,
  attenuationDistance: 1.8,
  attenuationColor: "#2b8f55",
  clearcoat: 0.25,
  clearcoatRoughness: 0.55,
  transparent: true,
  opacity: 0.95,
  side: THREE.DoubleSide,
});

const leafMaterial = new THREE.MeshPhysicalMaterial({
  color: "#1f7a43",
  metalness: 0.05,
  roughness: 0.5,
  transmission: 0.08,
  thickness: 0.22,
  ior: 1.35,
  attenuationDistance: 1.4,
  attenuationColor: "#1f7a43",
  clearcoat: 0.25,
  clearcoatRoughness: 0.6,
  transparent: true,
  opacity: 0.92,
  side: THREE.DoubleSide,
});

const sepalMaterial = new THREE.MeshPhysicalMaterial({
  color: "#1b6b3a",
  metalness: 0.05,
  roughness: 0.55,
  transmission: 0.06,
  thickness: 0.2,
  ior: 1.35,
  attenuationDistance: 1.2,
  attenuationColor: "#1b6b3a",
  clearcoat: 0.2,
  clearcoatRoughness: 0.65,
  transparent: true,
  opacity: 0.9,
  side: THREE.DoubleSide,
});

// Create realistic rose petal shape - heart-shaped with wider top
function createRosePetalShape(layer: number = 0) {
  // layer 0 = innermost (narrow, tall), layer 3 = outermost (wide, heart-shaped)
  const shape = new THREE.Shape();

  // Petal proportions change by layer
  const widthScale = 0.8 + layer * 0.15; // Outer petals are wider
  const heightScale = 1.0 - layer * 0.05; // Outer petals slightly shorter relative to width
  const notchDepth = 0.02 + layer * 0.03; // Heart notch deeper on outer petals

  // Base point (narrow attachment point)
  shape.moveTo(0, 0);

  // Right side going up - creates the rounded bulge of the petal
  shape.bezierCurveTo(
    0.15 * widthScale, 0.05 * heightScale,  // control point 1
    0.45 * widthScale, 0.25 * heightScale,  // control point 2
    0.48 * widthScale, 0.55 * heightScale   // end point (widest part)
  );

  // Right side continuing to top with heart curve
  shape.bezierCurveTo(
    0.50 * widthScale, 0.75 * heightScale,  // control point 1
    0.42 * widthScale, 0.95 * heightScale,  // control point 2
    0.22 * widthScale, 1.0 * heightScale    // right lobe peak
  );

  // Heart notch at top
  shape.bezierCurveTo(
    0.12 * widthScale, 1.02 * heightScale,  // control point 1
    0.04 * widthScale, (1.0 - notchDepth) * heightScale, // control point 2
    0, (1.0 - notchDepth * 0.5) * heightScale // center notch
  );

  // Left lobe
  shape.bezierCurveTo(
    -0.04 * widthScale, (1.0 - notchDepth) * heightScale,
    -0.12 * widthScale, 1.02 * heightScale,
    -0.22 * widthScale, 1.0 * heightScale   // left lobe peak
  );

  // Left side going down
  shape.bezierCurveTo(
    -0.42 * widthScale, 0.95 * heightScale,
    -0.50 * widthScale, 0.75 * heightScale,
    -0.48 * widthScale, 0.55 * heightScale  // widest part
  );

  // Left side to base
  shape.bezierCurveTo(
    -0.45 * widthScale, 0.25 * heightScale,
    -0.15 * widthScale, 0.05 * heightScale,
    0, 0
  );

  return shape;
}

// Pre-create petal shapes for different layers
const petalShapes = [
  createRosePetalShape(0), // innermost
  createRosePetalShape(1),
  createRosePetalShape(2),
  createRosePetalShape(3), // outermost
];

interface LayerGeometryOptions {
  layer: number; // 0-4 (innermost to outermost)
  variant?: number; // 0-2 for slight variations within layer
}

function createLayeredPetalGeometry({ layer, variant = 0 }: LayerGeometryOptions) {
  // Get shape based on layer (clamp to available shapes)
  const shapeIndex = Math.min(layer, petalShapes.length - 1);
  const shape = petalShapes[shapeIndex];

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.018,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 3,
    curveSegments: 24,
  });

  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) return geometry;

  const height = bounds.max.y - bounds.min.y;
  const halfWidth = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)) || 1;
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();

  // Layer-specific deformation parameters
  // Inner petals: tight cup, minimal curl, strong twist inward
  // Outer petals: open cup, strong backward curl, edge ruffles
  const layerT = layer / 4; // 0 to 1

  const cup = 0.15 - layerT * 0.12; // Inner: strong cup, outer: flatter
  const backwardCurl = layerT * 0.25; // Only outer petals curl backward
  const edgeCurl = 0.02 + layerT * 0.08; // Edge curl increases outward
  const ruffle = layerT * 0.04; // Only outer petals ruffle
  const pinch = 0.3 - layerT * 0.15; // Base pinch stronger on inner
  const twist = 0.1 + (1 - layerT) * 0.3; // Inner petals twist more (spiral)

  // Add variant randomness
  const variantOffset = variant * 0.15;

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);

    const y01 = height > 0 ? (vertex.y - bounds.min.y) / height : 0;
    const edge = THREE.MathUtils.clamp(Math.abs(vertex.x) / halfWidth, 0, 1);
    const center = 1 - edge;

    // Pinch the base narrower
    const basePinch = 1 - (1 - Math.min(y01 / 0.25, 1)) * pinch;
    vertex.x *= basePinch;

    // Cupping - makes petal curve inward like a spoon
    const cupCurve = Math.sin(y01 * Math.PI * 0.8) * center * cup;

    // Edge curl - edges curl inward/outward
    const edgeCurlAmount = Math.pow(edge, 1.5) * edgeCurl * (1 + Math.sin(y01 * Math.PI) * 0.5);

    // Backward curl for outer petals - tip folds backward
    const backCurl = Math.pow(y01, 2) * backwardCurl * (0.5 + center * 0.5);

    // Ruffle on edges (wavy edge effect on outer petals)
    const ruffleWave = Math.sin(y01 * Math.PI * 4 + edge * Math.PI * 2 + variantOffset) * ruffle * edge * y01;

    // Combine Z deformations
    vertex.z += cupCurve - edgeCurlAmount - backCurl + ruffleWave;

    // Twist for spiral effect (stronger on inner petals)
    const twistAngle = (y01 - 0.2) * twist * (1 + variantOffset * 0.3);
    const cos = Math.cos(twistAngle);
    const sin = Math.sin(twistAngle);
    const x = vertex.x;
    const z = vertex.z;
    vertex.x = x * cos - z * sin;
    vertex.z = x * sin + z * cos;

    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  position.needsUpdate = true;
  geometry.computeBoundingBox();
  const adjustedBounds = geometry.boundingBox;
  if (adjustedBounds) {
    const centerX = (adjustedBounds.min.x + adjustedBounds.max.x) * 0.5;
    const centerZ = (adjustedBounds.min.z + adjustedBounds.max.z) * 0.5;
    geometry.translate(-centerX, -adjustedBounds.min.y, -centerZ);
  }

  geometry.computeVertexNormals();
  return geometry;
}

// Create geometries for each layer with variants
const petalGeometries = [
  // Layer 0 - innermost tight spiral (3 variants)
  createLayeredPetalGeometry({ layer: 0, variant: 0 }),
  createLayeredPetalGeometry({ layer: 0, variant: 1 }),
  createLayeredPetalGeometry({ layer: 0, variant: 2 }),
  // Layer 1 - inner cup
  createLayeredPetalGeometry({ layer: 1, variant: 0 }),
  createLayeredPetalGeometry({ layer: 1, variant: 1 }),
  createLayeredPetalGeometry({ layer: 1, variant: 2 }),
  // Layer 2 - middle
  createLayeredPetalGeometry({ layer: 2, variant: 0 }),
  createLayeredPetalGeometry({ layer: 2, variant: 1 }),
  createLayeredPetalGeometry({ layer: 2, variant: 2 }),
  // Layer 3 - outer
  createLayeredPetalGeometry({ layer: 3, variant: 0 }),
  createLayeredPetalGeometry({ layer: 3, variant: 1 }),
  createLayeredPetalGeometry({ layer: 3, variant: 2 }),
  // Layer 4 - outermost with strong backward curl
  createLayeredPetalGeometry({ layer: 4, variant: 0 }),
  createLayeredPetalGeometry({ layer: 4, variant: 1 }),
  createLayeredPetalGeometry({ layer: 4, variant: 2 }),
];

function mulberry32(seed: number) {
  let t = seed;
  return () => {
    t += 0x6d2b79f5;
    let r = t;
    r = Math.imul(r ^ (r >>> 15), r | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function createLeafGeometry() {
  const leafLength = 1;
  const halfWidth = 0.22;
  const edgeSegments = 12;

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);

  for (let i = 1; i <= edgeSegments; i++) {
    const t = i / edgeSegments;
    const y = t * leafLength;
    const widthProfile = Math.sin(Math.PI * t) * halfWidth;
    const serration = 0.018 * Math.sin(t * Math.PI * 10);
    shape.lineTo(widthProfile + serration, y);
  }

  shape.lineTo(0, leafLength);

  for (let i = edgeSegments; i >= 1; i--) {
    const t = i / edgeSegments;
    const y = t * leafLength;
    const widthProfile = Math.sin(Math.PI * t) * halfWidth;
    const serration = 0.018 * Math.sin(t * Math.PI * 10);
    shape.lineTo(-(widthProfile + serration), y);
  }

  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.006,
    bevelSize: 0.006,
    bevelSegments: 2,
    curveSegments: 16,
  });

  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (bounds) {
    geometry.translate(0, -bounds.min.y, 0);
  }

  const position = geometry.attributes.position as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);

    const y01 = THREE.MathUtils.clamp(vertex.y / leafLength, 0, 1);
    const centerFalloff =
      1 - THREE.MathUtils.clamp(Math.abs(vertex.x) / (halfWidth * 1.1), 0, 1);

    const midrib =
      (1 -
        THREE.MathUtils.clamp(Math.abs(vertex.x) / (halfWidth * 0.35), 0, 1)) *
      0.02;
    const curl = Math.sin(y01 * Math.PI) * 0.08 * centerFalloff;
    const twist = Math.sin(y01 * Math.PI * 0.8) * 0.02 * Math.sign(vertex.x);

    vertex.z += curl + midrib;
    vertex.x += twist;

    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

const leafGeometry = createLeafGeometry();

interface AnimatedPetalProps {
  config: PetalConfig;
  index: number;
}

function AnimatedPetal({ config, index }: AnimatedPetalProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseRotation = useMemo(
    () =>
      new THREE.Euler(
        config.rotation[0],
        config.rotation[1],
        config.rotation[2],
      ),
    [config.rotation],
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    // Breathing open/close animation
    const breathSpeed = 0.4; // Breathing speed
    const phase = index * 0.15; // Stagger the animation between petals

    // Base breath amount - outer petals move more
    const baseBreath = 0.15 + config.openness * 0.25;

    // Main breathing motion - tilts petals open and closed
    const breath = Math.sin(t * breathSpeed + phase) * baseBreath;

    // Secondary wave for more organic feel
    const secondaryWave = Math.sin(t * 0.8 + phase * 1.3) * 0.06 * config.openness;

    // Apply rotations
    meshRef.current.rotation.x = baseRotation.x + breath + secondaryWave;
    meshRef.current.rotation.y = baseRotation.y + Math.sin(t * 0.5 + phase) * 0.04 * config.openness;
    meshRef.current.rotation.z = baseRotation.z + Math.sin(t * 0.4 + phase * 0.8) * 0.05 * config.openness;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={petalGeometries[config.geometryIndex]}
      material={petalMaterials[config.materialIndex]}
      position={config.position}
      rotation={config.rotation}
      scale={config.scale}
    />
  );
}

// Falling petal component
interface FallingPetalConfig {
  startPosition: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  geometryIndex: number;
  materialIndex: number;
  fallSpeed: number;
  swaySpeed: number;
  swayAmount: number;
  spinSpeed: number;
  delay: number;
}

function FallingPetal({ config }: { config: FallingPetalConfig }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    // Offset time by delay
    const time = t - config.delay;
    if (time < 0) {
      meshRef.current.visible = false;
      return;
    }
    meshRef.current.visible = true;

    // Fall cycle - petals fall and then reset
    const fallCycle = 8; // seconds to complete one fall
    const cycleTime = (time % fallCycle) / fallCycle;

    // Y position - fall from top to bottom
    const fallHeight = 4; // total fall distance
    const y = config.startPosition[1] - cycleTime * fallHeight;

    // Swaying motion
    const swayX = Math.sin(time * config.swaySpeed + config.delay) * config.swayAmount;
    const swayZ = Math.cos(time * config.swaySpeed * 0.7 + config.delay * 1.3) * config.swayAmount * 0.6;

    meshRef.current.position.set(
      config.startPosition[0] + swayX,
      y,
      config.startPosition[2] + swayZ
    );

    // Tumbling rotation
    meshRef.current.rotation.x = config.rotation[0] + time * config.spinSpeed * 0.5;
    meshRef.current.rotation.y = config.rotation[1] + time * config.spinSpeed;
    meshRef.current.rotation.z = config.rotation[2] + Math.sin(time * 1.5 + config.delay) * 0.3;

    // Fade out near bottom
    const fadeStart = 0.7;
    if (cycleTime > fadeStart) {
      const fade = 1 - (cycleTime - fadeStart) / (1 - fadeStart);
      meshRef.current.scale.setScalar(config.scale * fade);
    } else {
      meshRef.current.scale.setScalar(config.scale);
    }
  });

  return (
    <mesh
      ref={meshRef}
      geometry={petalGeometries[config.geometryIndex]}
      material={petalMaterials[config.materialIndex]}
      position={config.startPosition}
      rotation={config.rotation}
      scale={config.scale}
    />
  );
}

function FallingPetals() {
  const petals = useMemo(() => {
    const configs: FallingPetalConfig[] = [];
    const rand = mulberry32(789);

    // Create falling petals around the rose - use outer layer geometries (9-14)
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + rand() * 0.5;
      const radius = 0.8 + rand() * 1.2;

      configs.push({
        startPosition: [
          Math.cos(angle) * radius,
          3 + rand() * 1.5, // Start above the rose
          Math.sin(angle) * radius,
        ],
        rotation: [rand() * Math.PI, rand() * Math.PI * 2, rand() * Math.PI],
        scale: 0.3 + rand() * 0.25,
        geometryIndex: 9 + Math.floor(rand() * 6), // Use outer layer petal shapes (layers 3-4)
        materialIndex: Math.floor(rand() * petalMaterials.length),
        fallSpeed: 0.3 + rand() * 0.2,
        swaySpeed: 1.5 + rand() * 1,
        swayAmount: 0.15 + rand() * 0.15,
        spinSpeed: 0.5 + rand() * 0.5,
        delay: rand() * 8, // Stagger the falls
      });
    }

    return configs;
  }, []);

  return (
    <group>
      {petals.map((petal, i) => (
        <FallingPetal key={`falling-${i}`} config={petal} />
      ))}
    </group>
  );
}

function RoseBud() {
  const groupRef = useRef<THREE.Group>(null);

  const petals = useMemo(() => {
    const petalConfigs: PetalConfig[] = [];
    const rand = mulberry32(23);

    // Define concentric whorls like real roses
    // Each whorl has: count, radius, height, tilt (how open), scale
    const whorls = [
      // Center spiral - very tight, almost vertical petals
      { count: 3, radius: 0.02, height: 0.22, tilt: 0.15, scale: 0.12, layer: 0 },
      { count: 4, radius: 0.04, height: 0.20, tilt: 0.25, scale: 0.16, layer: 0 },
      // Inner cup - still quite upright
      { count: 5, radius: 0.07, height: 0.17, tilt: 0.35, scale: 0.22, layer: 1 },
      { count: 6, radius: 0.10, height: 0.14, tilt: 0.45, scale: 0.28, layer: 1 },
      // Middle layers - starting to open
      { count: 7, radius: 0.14, height: 0.10, tilt: 0.55, scale: 0.35, layer: 2 },
      { count: 8, radius: 0.18, height: 0.06, tilt: 0.65, scale: 0.42, layer: 2 },
      // Outer layers - quite open, backward curl
      { count: 8, radius: 0.23, height: 0.02, tilt: 0.78, scale: 0.50, layer: 3 },
      { count: 9, radius: 0.28, height: -0.02, tilt: 0.88, scale: 0.55, layer: 3 },
      // Outermost - very open, strong backward curl
      { count: 10, radius: 0.34, height: -0.06, tilt: 0.95, scale: 0.58, layer: 4 },
    ];

    const up = new THREE.Vector3(0, 1, 0);
    const radial = new THREE.Vector3();
    const petalDir = new THREE.Vector3();
    const baseQuat = new THREE.Quaternion();
    const rollQuat = new THREE.Quaternion();
    const finalQuat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    let whorlOffset = 0; // Stagger each whorl by half a petal width

    whorls.forEach((whorl) => {
      // Offset each whorl to stagger petals
      whorlOffset += Math.PI / whorl.count;

      for (let i = 0; i < whorl.count; i++) {
        const angleBase = (i / whorl.count) * Math.PI * 2 + whorlOffset;
        const angle = angleBase + (rand() - 0.5) * 0.15; // Slight random variation

        // Position with slight random variation
        const radiusVar = whorl.radius * (0.92 + rand() * 0.16);
        const heightVar = whorl.height + (rand() - 0.5) * 0.02;
        const scaleVar = whorl.scale * (0.9 + rand() * 0.2);

        // Calculate petal direction based on tilt (openness)
        // tilt 0 = straight up, tilt 1 = horizontal outward
        radial.set(Math.cos(angle), 0, Math.sin(angle));

        // Blend between up and outward based on tilt
        const upComponent = Math.cos(whorl.tilt * Math.PI * 0.5);
        const outComponent = Math.sin(whorl.tilt * Math.PI * 0.5);

        // For outer petals, add slight downward tilt (backward curl effect)
        const downComponent = whorl.layer >= 3 ? (whorl.tilt - 0.7) * 0.3 : 0;

        petalDir.set(
          radial.x * outComponent,
          upComponent - downComponent,
          radial.z * outComponent
        ).normalize();

        baseQuat.setFromUnitVectors(up, petalDir);

        // Roll to face center with some variation
        const rollAngle = angle + Math.PI + (rand() - 0.5) * 0.3;
        rollQuat.setFromAxisAngle(petalDir, rollAngle);

        finalQuat.copy(rollQuat).multiply(baseQuat);
        euler.setFromQuaternion(finalQuat, "XYZ");

        // Select geometry based on layer (3 variants per layer)
        const geometryIndex = whorl.layer * 3 + Math.floor(rand() * 3);

        // Material - darker in center, lighter outside
        let materialIndex = Math.min(
          petalMaterials.length - 1,
          Math.floor((whorl.layer / 4) * petalMaterials.length)
        );
        if (rand() < 0.2 && materialIndex > 0) materialIndex--;

        petalConfigs.push({
          position: [
            Math.cos(angle) * radiusVar,
            heightVar,
            Math.sin(angle) * radiusVar,
          ],
          rotation: [euler.x, euler.y, euler.z],
          scale: scaleVar,
          geometryIndex: Math.min(geometryIndex, petalGeometries.length - 1),
          materialIndex,
          openness: whorl.tilt,
        });
      }
    });

    return petalConfigs;
  }, []);

  const sepals = useMemo(() => {
    const configs: SepalConfig[] = [];
    const rand = mulberry32(87);
    const count = 5;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + 0.2;
      const tilt = 2.15 + (rand() - 0.5) * 0.2;
      const roll = (rand() - 0.5) * 0.25;
      const radius = 0.16 + (rand() - 0.5) * 0.03;
      const scale = 0.22 + rand() * 0.06;

      configs.push({
        position: [
          Math.cos(angle) * radius,
          -0.16 + (rand() - 0.5) * 0.02,
          Math.sin(angle) * radius,
        ],
        rotation: [tilt, angle + Math.PI, roll],
        scale,
      });
    }

    return configs;
  }, []);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      groupRef.current.rotation.y = t * 0.25;
      groupRef.current.rotation.x = Math.sin(t * 0.6) * 0.03;
      const breath = 1 + Math.sin(t * 0.9) * 0.012;
      groupRef.current.scale.setScalar(breath);
    }
  });

  return (
    <group ref={groupRef} position={[0, 1.5, 0]}>
      {petals.map((petal, i) => (
        <AnimatedPetal key={i} config={petal} index={i} />
      ))}
      {sepals.map((sepal, i) => (
        <mesh
          key={`sepal-${i}`}
          geometry={leafGeometry}
          material={sepalMaterial}
          position={sepal.position}
          rotation={sepal.rotation}
          scale={sepal.scale}
        />
      ))}
      {/* Center bud */}
      <mesh position={[0, 0.18, 0]}>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color="#7b001f" roughness={0.7} metalness={0} />
      </mesh>
    </group>
  );
}

function Leaf({
  position,
  rotation,
  scale = 1,
  phase = 0,
  flutter = 0.05,
}: LeafProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseRotation = useMemo(
    () => new THREE.Euler(rotation[0], rotation[1], rotation[2]),
    [rotation],
  );
  const basePosition = useMemo(
    () => new THREE.Vector3(position[0], position[1], position[2]),
    [position],
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.x =
      baseRotation.x + Math.sin(t * 1.2 + phase) * flutter;
    meshRef.current.rotation.y =
      baseRotation.y + Math.sin(t * 0.9 + phase * 1.1) * (flutter * 0.35);
    meshRef.current.rotation.z =
      baseRotation.z + Math.sin(t * 1.6 + phase * 1.3) * (flutter * 0.7);

    meshRef.current.position.x =
      basePosition.x + Math.sin(t * 0.7 + phase) * 0.008;
    meshRef.current.position.y =
      basePosition.y + Math.sin(t * 1.0 + phase * 0.9) * 0.006;
    meshRef.current.position.z =
      basePosition.z + Math.sin(t * 0.8 + phase * 1.2) * 0.008;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={leafGeometry}
      material={leafMaterial}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

function Thorns({ thorns }: { thorns: ThornConfig[] }) {
  const thornGeometry = useMemo(() => {
    const geometry = new THREE.ConeGeometry(0.015, 0.06, 6);
    geometry.translate(0, 0.03, 0);
    return geometry;
  }, []);

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
  );
}

function StemAssembly() {
  const groupRef = useRef<THREE.Group>(null);

  const stem = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, -1.5, 0),
        new THREE.Vector3(0.18, -0.9, 0.08),
        new THREE.Vector3(-0.12, -0.25, -0.16),
        new THREE.Vector3(0.14, 0.5, 0.08),
        new THREE.Vector3(-0.08, 1.15, -0.04),
        new THREE.Vector3(0.02, 1.4, 0.03),
      ],
      false,
      "catmullrom",
      0.65,
    );

    const tubeGeometry = new THREE.TubeGeometry(curve, 96, 0.045, 10, false);
    const frameSegments = 160;
    const frames = curve.computeFrenetFrames(frameSegments, false);
    return { curve, tubeGeometry, frameSegments, frames };
  }, []);

  const leaves = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const configs = [
      { t: 0.45, side: -1, scale: 0.52, roll: -0.5 },
      { t: 0.3, side: 1, scale: 0.44, roll: 0.35 },
      { t: 0.16, side: -1, scale: 0.38, roll: -0.2 },
    ];

    return configs.map((config, idx): ProceduralLeafConfig => {
      const i = Math.min(
        stem.frameSegments,
        Math.max(0, Math.floor(config.t * stem.frameSegments)),
      );
      const point = stem.curve.getPointAt(config.t);
      const tangent = stem.frames.tangents[i];
      const normal = stem.frames.normals[i];

      const outward = normal.clone().multiplyScalar(config.side);
      const direction = tangent
        .clone()
        .multiplyScalar(0.35)
        .add(outward.multiplyScalar(0.9))
        .normalize();

      const quaternion = new THREE.Quaternion().setFromUnitVectors(
        up,
        direction,
      );
      quaternion.multiply(
        new THREE.Quaternion().setFromAxisAngle(direction, config.roll),
      );
      const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");

      const leafPos = point
        .clone()
        .add(normal.clone().multiplyScalar(config.side * 0.09));

      return {
        position: [leafPos.x, leafPos.y, leafPos.z],
        rotation: [euler.x, euler.y, euler.z],
        scale: config.scale,
        phase: idx * 1.7,
        flutter: 0.045 + idx * 0.01,
      };
    });
  }, [stem]);

  const thorns = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const tValues = [0.22, 0.32, 0.44, 0.57, 0.68];
    return tValues.map((t, idx): ThornConfig => {
      const i = Math.min(
        stem.frameSegments,
        Math.max(0, Math.floor(t * stem.frameSegments)),
      );
      const point = stem.curve.getPointAt(t);
      const tangent = stem.frames.tangents[i];
      const normal = stem.frames.normals[i];

      const angle = idx * 1.4 + 0.8;
      const outward = normal.clone().applyAxisAngle(tangent, angle).normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, outward);
      const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");

      const thornPos = point.clone().add(outward.multiplyScalar(0.05));
      return {
        position: [thornPos.x, thornPos.y, thornPos.z],
        rotation: [euler.x, euler.y, euler.z],
      };
    });
  }, [stem]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.z = Math.sin(t * 0.55) * 0.03;
    groupRef.current.rotation.x = Math.sin(t * 0.45) * 0.02;
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={stem.tubeGeometry} material={stemMaterial} />
      <Thorns thorns={thorns} />
      {leaves.map((leaf, i) => (
        <Leaf
          key={i}
          position={leaf.position}
          rotation={leaf.rotation}
          scale={leaf.scale}
          phase={leaf.phase}
          flutter={leaf.flutter}
        />
      ))}
    </group>
  );
}

export default function GlassRose() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      groupRef.current.position.y = Math.sin(t * 0.5) * 0.05;
      groupRef.current.rotation.y = Math.sin(t * 0.18) * 0.08;
    }
  });

  return (
    <group ref={groupRef}>
      <RoseBud />
      <StemAssembly />
      <FallingPetals />
    </group>
  );
}
