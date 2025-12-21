import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface PetalConfig {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  geometryIndex: number;
  materialIndex: number;
  openness: number;
}

interface SepalConfig {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
}

interface LeafConfig {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  phase: number;
  flutter: number;
}

interface ThornConfig {
  position: [number, number, number];
  rotation: [number, number, number];
}

// Velvety petal materials
const spiralPetalMaterialBase = {
  metalness: 0.0,
  roughness: 0.7,
  transmission: 0.0,
  clearcoat: 0.05,
  clearcoatRoughness: 0.9,
  sheen: 1.2,
  sheenRoughness: 0.35,
  side: THREE.DoubleSide,
};

// Deep reds for center to lighter for outer
const spiralPetalMaterials = [
  new THREE.MeshPhysicalMaterial({
    ...spiralPetalMaterialBase,
    color: "#6b0018",
    sheenColor: "#aa3355",
  }),
  new THREE.MeshPhysicalMaterial({
    ...spiralPetalMaterialBase,
    color: "#8b0020",
    sheenColor: "#bb4466",
  }),
  new THREE.MeshPhysicalMaterial({
    ...spiralPetalMaterialBase,
    color: "#a50028",
    sheenColor: "#cc5577",
  }),
  new THREE.MeshPhysicalMaterial({
    ...spiralPetalMaterialBase,
    color: "#c01030",
    sheenColor: "#dd6688",
  }),
  new THREE.MeshPhysicalMaterial({
    ...spiralPetalMaterialBase,
    color: "#d81840",
    sheenColor: "#ee7799",
  }),
];

const spiralStemMaterial = new THREE.MeshPhysicalMaterial({
  color: "#1a5c35",
  metalness: 0.0,
  roughness: 0.75,
  clearcoat: 0.1,
  clearcoatRoughness: 0.8,
  side: THREE.DoubleSide,
});

const spiralLeafMaterial = new THREE.MeshPhysicalMaterial({
  color: "#145c30",
  metalness: 0.0,
  roughness: 0.65,
  clearcoat: 0.15,
  clearcoatRoughness: 0.7,
  sheen: 0.25,
  sheenColor: "#2a8050",
  side: THREE.DoubleSide,
});

const spiralSepalMaterial = new THREE.MeshPhysicalMaterial({
  color: "#0f4825",
  metalness: 0.0,
  roughness: 0.75,
  clearcoat: 0.08,
  clearcoatRoughness: 0.85,
  side: THREE.DoubleSide,
});

// Create petal shape - narrower for center, wider for outer
function createSpiralPetalShape(layer: number = 0) {
  const shape = new THREE.Shape();

  // Layer 0 = center (narrow, tall), Layer 5+ = outer (wide, rounder)
  const t = Math.min(layer / 5, 1);

  // Center petals are narrow and elongated, outer are wider and rounder
  const widthScale = 0.5 + t * 0.6;
  const heightScale = 1.1 - t * 0.15;
  const notchDepth = 0.01 + t * 0.02;

  shape.moveTo(0, 0);

  // Narrow base that widens - center petals are more tapered
  shape.bezierCurveTo(
    0.08 * widthScale, 0.03 * heightScale,
    0.35 * widthScale, 0.15 * heightScale,
    0.45 * widthScale, 0.45 * heightScale
  );

  // Upper curve - rounder top
  shape.bezierCurveTo(
    0.50 * widthScale, 0.65 * heightScale,
    0.45 * widthScale, 0.85 * heightScale,
    0.25 * widthScale, 0.97 * heightScale
  );

  // Soft notch at top
  shape.bezierCurveTo(
    0.12 * widthScale, 1.01 * heightScale,
    0.04 * widthScale, (1.0 - notchDepth) * heightScale,
    0, (1.0 - notchDepth * 0.3) * heightScale
  );

  shape.bezierCurveTo(
    -0.04 * widthScale, (1.0 - notchDepth) * heightScale,
    -0.12 * widthScale, 1.01 * heightScale,
    -0.25 * widthScale, 0.97 * heightScale
  );

  shape.bezierCurveTo(
    -0.45 * widthScale, 0.85 * heightScale,
    -0.50 * widthScale, 0.65 * heightScale,
    -0.45 * widthScale, 0.45 * heightScale
  );

  shape.bezierCurveTo(
    -0.35 * widthScale, 0.15 * heightScale,
    -0.08 * widthScale, 0.03 * heightScale,
    0, 0
  );

  return shape;
}

// Create shapes for different layers
const spiralPetalShapes = [
  createSpiralPetalShape(0),
  createSpiralPetalShape(1),
  createSpiralPetalShape(2),
  createSpiralPetalShape(3),
  createSpiralPetalShape(4),
  createSpiralPetalShape(5),
];

function createSpiralPetalGeometry(layer: number, variant: number = 0) {
  const shapeIndex = Math.min(layer, spiralPetalShapes.length - 1);
  const shape = spiralPetalShapes[shapeIndex];

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.008,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 2,
    curveSegments: 24,
  });

  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) return geometry;

  const height = bounds.max.y - bounds.min.y;
  const halfWidth = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)) || 1;
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();

  const t = Math.min(layer / 6, 1);
  const variantOffset = variant * 0.1;

  // Deformation parameters that change dramatically from center to outer
  // Center: very strong inward cup, no backward curl
  // Outer: less cup, more backward curl
  const inwardCup = 0.35 * (1 - t * 0.6); // Strong cup for center, less for outer
  const backwardCurl = Math.pow(t, 2) * 0.4; // Only outer petals curl back
  const edgeWrap = 0.08 * (1 - t * 0.5); // Edges wrap inward, less on outer
  const twist = 0.15 * (1 - t * 0.7); // Slight twist, more on inner
  const basePinchAmount = 0.4 - t * 0.15;

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);

    const y01 = height > 0 ? (vertex.y - bounds.min.y) / height : 0;
    const edge = THREE.MathUtils.clamp(Math.abs(vertex.x) / halfWidth, 0, 1);
    const center = 1 - edge;

    // Strong base pinch
    const basePinch = 1 - (1 - Math.min(y01 / 0.25, 1)) * basePinchAmount;
    vertex.x *= basePinch;

    // Inward cupping - curves the petal inward like cupped hands
    // Stronger in the middle of the petal, both vertically and horizontally
    const cupCurve = Math.sin(y01 * Math.PI * 0.85) * center * inwardCup;

    // Edge wrap - the sides of the petal curl inward
    const edgeWrapAmount = Math.pow(edge, 1.5) * edgeWrap * (0.7 + y01 * 0.5);

    // Backward curl - only affects upper part of outer petals
    const backCurl = Math.pow(Math.max(0, y01 - 0.4), 2) * backwardCurl;

    // Top inward curl - the tip of the petal curls inward toward center
    // This is crucial for the spiral look
    const topCurl = Math.pow(Math.max(0, y01 - 0.7), 2) * (1 - t) * 0.2;

    // Combine Z deformations
    vertex.z += cupCurve + edgeWrapAmount - backCurl + topCurl;

    // Gentle twist along the length
    const twistAngle = (y01 - 0.2) * twist * (1 + variantOffset * 0.15);
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
const spiralPetalGeometries: THREE.ExtrudeGeometry[] = [];
for (let layer = 0; layer < 7; layer++) {
  for (let variant = 0; variant < 3; variant++) {
    spiralPetalGeometries.push(createSpiralPetalGeometry(layer, variant));
  }
}

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

function createSpiralLeafGeometry() {
  const leafLength = 1;
  const halfWidth = 0.22;
  const edgeSegments = 14;

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);

  for (let i = 1; i <= edgeSegments; i++) {
    const t = i / edgeSegments;
    const y = t * leafLength;
    const widthProfile = Math.sin(Math.PI * t) * halfWidth * (1 - t * 0.25);
    const serration = 0.012 * Math.sin(t * Math.PI * 10) * (1 - t * 0.4);
    shape.lineTo(widthProfile + serration, y);
  }

  shape.lineTo(0, leafLength);

  for (let i = edgeSegments; i >= 1; i--) {
    const t = i / edgeSegments;
    const y = t * leafLength;
    const widthProfile = Math.sin(Math.PI * t) * halfWidth * (1 - t * 0.25);
    const serration = 0.012 * Math.sin(t * Math.PI * 10) * (1 - t * 0.4);
    shape.lineTo(-(widthProfile + serration), y);
  }

  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.006,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 2,
    curveSegments: 18,
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
    const centerFalloff = 1 - THREE.MathUtils.clamp(Math.abs(vertex.x) / (halfWidth * 1.1), 0, 1);

    const midrib = (1 - THREE.MathUtils.clamp(Math.abs(vertex.x) / (halfWidth * 0.3), 0, 1)) * 0.02;
    const curl = Math.sin(y01 * Math.PI) * 0.05 * centerFalloff;
    const twist = Math.sin(y01 * Math.PI * 0.7) * 0.012 * Math.sign(vertex.x);

    vertex.z += curl + midrib;
    vertex.x += twist;

    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

const spiralLeafGeometry = createSpiralLeafGeometry();

function SpiralPetal({ config, index }: { config: PetalConfig; index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseRotation = useMemo(
    () => new THREE.Euler(config.rotation[0], config.rotation[1], config.rotation[2]),
    [config.rotation]
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    // Very subtle breathing
    const breathSpeed = 0.2;
    const phase = index * 0.05;
    const baseBreath = 0.015 + config.openness * 0.025;
    const breath = Math.sin(t * breathSpeed + phase) * baseBreath;

    meshRef.current.rotation.x = baseRotation.x + breath;
    meshRef.current.rotation.y = baseRotation.y + Math.sin(t * 0.2 + phase) * 0.005;
    meshRef.current.rotation.z = baseRotation.z + Math.sin(t * 0.18 + phase * 0.7) * 0.008;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={spiralPetalGeometries[config.geometryIndex]}
      material={spiralPetalMaterials[config.materialIndex]}
      position={config.position}
      rotation={config.rotation}
      scale={config.scale}
    />
  );
}

function SpiralRoseBud() {
  const groupRef = useRef<THREE.Group>(null);

  const petals = useMemo(() => {
    const petalConfigs: PetalConfig[] = [];
    const rand = mulberry32(137);

    // TRUE SPIRAL APPROACH
    // Use Fermat's spiral for the center with logarithmic growth
    // r = a * sqrt(n) where n is petal index
    // theta = n * golden_angle

    const goldenAngle = Math.PI * (3 - Math.sqrt(5)); // ~137.5 degrees
    const totalPetals = 75;

    const up = new THREE.Vector3(0, 1, 0);
    const radial = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const petalDir = new THREE.Vector3();
    const baseQuat = new THREE.Quaternion();
    const rollQuat = new THREE.Quaternion();
    const tiltQuat = new THREE.Quaternion();
    const finalQuat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    for (let i = 0; i < totalPetals; i++) {
      const t = i / (totalPetals - 1); // 0 to 1

      // Fermat's spiral: r = a * sqrt(n)
      // This creates even petal distribution in a disc
      const spiralRadius = Math.sqrt(i / totalPetals) * 0.36;

      // Golden angle for rotation - this creates the characteristic spiral
      const angle = i * goldenAngle;

      // Add slight random variation to radius
      const radius = spiralRadius * (0.95 + rand() * 0.1);

      // Height: center petals are higher, outer are lower
      // Create a dome shape
      const heightCurve = Math.cos(t * Math.PI * 0.5); // 1 at center, 0 at edge
      const height = 0.28 * heightCurve - t * 0.12 + (rand() - 0.5) * 0.008;

      // Tilt: center petals are nearly vertical, outer are more horizontal
      // This is CRUCIAL for the spiral look
      // t=0: tilt=0.05 (almost straight up)
      // t=1: tilt=0.95 (almost horizontal)
      const tilt = 0.05 + Math.pow(t, 0.6) * 0.9;

      // Scale: center petals are small, outer are larger
      const baseScale = 0.04 + t * 0.52;
      const scale = baseScale * (0.9 + rand() * 0.2);

      // Determine layer for geometry and material
      const layer = Math.min(6, Math.floor(t * 7));

      // Direction vectors
      radial.set(Math.cos(angle), 0, Math.sin(angle));
      tangent.set(-Math.sin(angle), 0, Math.cos(angle));

      // Petal direction: blend from UP to OUTWARD based on tilt
      const upComponent = Math.cos(tilt * Math.PI * 0.5);
      const outComponent = Math.sin(tilt * Math.PI * 0.5);

      // For inner petals, lean INTO the spiral (toward the tangent direction)
      // This creates the wrapped look
      const spiralLean = (1 - t) * 0.5; // Stronger for inner petals

      petalDir.set(
        radial.x * outComponent + tangent.x * spiralLean,
        upComponent,
        radial.z * outComponent + tangent.z * spiralLean
      ).normalize();

      // Base orientation: point petal tip in petalDir
      baseQuat.setFromUnitVectors(up, petalDir);

      // Roll: rotate petal so its concave side faces the CENTER
      // angle + Math.PI makes it face inward
      // Add spiral offset so each petal wraps around the previous
      const spiralWrapOffset = (1 - t) * 0.4;
      const rollAngle = angle + Math.PI + spiralWrapOffset + (rand() - 0.5) * 0.08;
      rollQuat.setFromAxisAngle(petalDir, rollAngle);

      // Additional inward tilt for center petals - makes them cup around center
      const inwardTiltAmount = (1 - t) * 0.3;
      const inwardAxis = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();
      tiltQuat.setFromAxisAngle(inwardAxis, inwardTiltAmount);

      // Combine: roll, then tilt, then base
      finalQuat.copy(rollQuat).multiply(baseQuat).premultiply(tiltQuat);
      euler.setFromQuaternion(finalQuat, "XYZ");

      // Geometry and material selection
      const geometryIndex = Math.min(
        layer * 3 + Math.floor(rand() * 3),
        spiralPetalGeometries.length - 1
      );

      const materialIndex = Math.min(
        spiralPetalMaterials.length - 1,
        Math.floor((layer / 6) * spiralPetalMaterials.length)
      );

      petalConfigs.push({
        position: [
          Math.cos(angle) * radius,
          height,
          Math.sin(angle) * radius,
        ],
        rotation: [euler.x, euler.y, euler.z],
        scale,
        geometryIndex,
        materialIndex,
        openness: tilt,
      });
    }

    return petalConfigs;
  }, []);

  const sepals = useMemo(() => {
    const configs: SepalConfig[] = [];
    const rand = mulberry32(101);
    const count = 5;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + 0.12;
      const tilt = 2.25 + (rand() - 0.5) * 0.12;
      const roll = (rand() - 0.5) * 0.18;
      const radius = 0.13 + (rand() - 0.5) * 0.015;
      const scale = 0.18 + rand() * 0.04;

      configs.push({
        position: [
          Math.cos(angle) * radius,
          -0.12 + (rand() - 0.5) * 0.01,
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
      groupRef.current.rotation.y = t * 0.12;
      groupRef.current.rotation.x = Math.sin(t * 0.35) * 0.01;
      const breath = 1 + Math.sin(t * 0.5) * 0.004;
      groupRef.current.scale.setScalar(breath);
    }
  });

  return (
    <group ref={groupRef} position={[0, 1.5, 0]}>
      {petals.map((petal, i) => (
        <SpiralPetal key={i} config={petal} index={i} />
      ))}
      {sepals.map((sepal, i) => (
        <mesh
          key={`sepal-${i}`}
          geometry={spiralLeafGeometry}
          material={spiralSepalMaterial}
          position={sepal.position}
          rotation={sepal.rotation}
          scale={sepal.scale}
        />
      ))}
      {/* Tight center bud */}
      <mesh position={[0, 0.24, 0]}>
        <sphereGeometry args={[0.025, 12, 12]} />
        <meshStandardMaterial color="#3a0010" roughness={0.85} metalness={0} />
      </mesh>
    </group>
  );
}

function SpiralLeaf({
  position,
  rotation,
  scale = 1,
  phase = 0,
  flutter = 0.025,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale?: number;
  phase?: number;
  flutter?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseRotation = useMemo(
    () => new THREE.Euler(rotation[0], rotation[1], rotation[2]),
    [rotation]
  );
  const basePosition = useMemo(
    () => new THREE.Vector3(position[0], position[1], position[2]),
    [position]
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;
    meshRef.current.rotation.x = baseRotation.x + Math.sin(t * 0.7 + phase) * flutter;
    meshRef.current.rotation.y = baseRotation.y + Math.sin(t * 0.5 + phase * 1.1) * (flutter * 0.2);
    meshRef.current.rotation.z = baseRotation.z + Math.sin(t * 0.85 + phase * 1.3) * (flutter * 0.4);

    meshRef.current.position.x = basePosition.x + Math.sin(t * 0.4 + phase) * 0.003;
    meshRef.current.position.y = basePosition.y + Math.sin(t * 0.6 + phase * 0.9) * 0.002;
    meshRef.current.position.z = basePosition.z + Math.sin(t * 0.5 + phase * 1.2) * 0.003;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={spiralLeafGeometry}
      material={spiralLeafMaterial}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

function SpiralThorns({ thorns }: { thorns: ThornConfig[] }) {
  const thornGeometry = useMemo(() => {
    const geometry = new THREE.ConeGeometry(0.01, 0.04, 5);
    geometry.translate(0, 0.02, 0);
    return geometry;
  }, []);

  return (
    <>
      {thorns.map((thorn, i) => (
        <mesh
          key={i}
          geometry={thornGeometry}
          material={spiralStemMaterial}
          position={thorn.position}
          rotation={thorn.rotation}
        />
      ))}
    </>
  );
}

function SpiralStemAssembly() {
  const groupRef = useRef<THREE.Group>(null);

  const stem = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, -1.5, 0),
        new THREE.Vector3(0.1, -1.0, 0.04),
        new THREE.Vector3(-0.06, -0.4, -0.08),
        new THREE.Vector3(0.08, 0.25, 0.05),
        new THREE.Vector3(-0.04, 0.9, -0.02),
        new THREE.Vector3(0.01, 1.35, 0.015),
      ],
      false,
      "catmullrom",
      0.55
    );

    const tubeGeometry = new THREE.TubeGeometry(curve, 72, 0.035, 8, false);
    const frameSegments = 120;
    const frames = curve.computeFrenetFrames(frameSegments, false);
    return { curve, tubeGeometry, frameSegments, frames };
  }, []);

  const leaves = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const configs = [
      { t: 0.4, side: -1, scale: 0.45, roll: -0.4 },
      { t: 0.26, side: 1, scale: 0.38, roll: 0.28 },
      { t: 0.12, side: -1, scale: 0.32, roll: -0.12 },
    ];

    return configs.map((config, idx): LeafConfig => {
      const i = Math.min(
        stem.frameSegments,
        Math.max(0, Math.floor(config.t * stem.frameSegments))
      );
      const point = stem.curve.getPointAt(config.t);
      const tangent = stem.frames.tangents[i];
      const normal = stem.frames.normals[i];

      const outward = normal.clone().multiplyScalar(config.side);
      const direction = tangent
        .clone()
        .multiplyScalar(0.28)
        .add(outward.multiplyScalar(0.82))
        .normalize();

      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
      quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(direction, config.roll));
      const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");

      const leafPos = point.clone().add(normal.clone().multiplyScalar(config.side * 0.06));

      return {
        position: [leafPos.x, leafPos.y, leafPos.z],
        rotation: [euler.x, euler.y, euler.z],
        scale: config.scale,
        phase: idx * 1.4,
        flutter: 0.025 + idx * 0.006,
      };
    });
  }, [stem]);

  const thorns = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const tValues = [0.18, 0.28, 0.4, 0.52, 0.62];
    return tValues.map((t, idx): ThornConfig => {
      const i = Math.min(
        stem.frameSegments,
        Math.max(0, Math.floor(t * stem.frameSegments))
      );
      const point = stem.curve.getPointAt(t);
      const tangent = stem.frames.tangents[i];
      const normal = stem.frames.normals[i];

      const angle = idx * 1.4 + 0.5;
      const outward = normal.clone().applyAxisAngle(tangent, angle).normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, outward);
      const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");

      const thornPos = point.clone().add(outward.multiplyScalar(0.04));
      return {
        position: [thornPos.x, thornPos.y, thornPos.z],
        rotation: [euler.x, euler.y, euler.z],
      };
    });
  }, [stem]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.z = Math.sin(t * 0.3) * 0.015;
    groupRef.current.rotation.x = Math.sin(t * 0.25) * 0.01;
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={stem.tubeGeometry} material={spiralStemMaterial} />
      <SpiralThorns thorns={thorns} />
      {leaves.map((leaf, i) => (
        <SpiralLeaf
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

export default function SpiralRose() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      groupRef.current.position.y = Math.sin(t * 0.3) * 0.025;
      groupRef.current.rotation.y = Math.sin(t * 0.1) * 0.04;
    }
  });

  return (
    <group ref={groupRef}>
      <SpiralRoseBud />
      <SpiralStemAssembly />
    </group>
  );
}
