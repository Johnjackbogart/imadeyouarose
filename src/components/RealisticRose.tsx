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

// More realistic petal materials - velvety appearance with depth
const realisticPetalMaterialBase = {
  metalness: 0.0,
  roughness: 0.65, // More velvety
  transmission: 0.02, // Less glassy
  thickness: 0.3,
  ior: 1.2,
  clearcoat: 0.1,
  clearcoatRoughness: 0.8,
  sheen: 1.0, // Strong velvet sheen
  sheenRoughness: 0.4,
  transparent: true,
  opacity: 0.98,
  side: THREE.DoubleSide,
};

// Richer, more varied red tones
const realisticPetalMaterials = [
  // Deep crimson for center
  new THREE.MeshPhysicalMaterial({
    ...realisticPetalMaterialBase,
    color: "#8b0020",
    sheenColor: "#cc4466",
  }),
  // Rich red
  new THREE.MeshPhysicalMaterial({
    ...realisticPetalMaterialBase,
    color: "#a50028",
    sheenColor: "#dd5577",
  }),
  // Bright red
  new THREE.MeshPhysicalMaterial({
    ...realisticPetalMaterialBase,
    color: "#c41035",
    sheenColor: "#ee6688",
  }),
  // Lighter red for outer petals
  new THREE.MeshPhysicalMaterial({
    ...realisticPetalMaterialBase,
    color: "#d01840",
    sheenColor: "#ff7799",
  }),
  // Lightest for very outer edges
  new THREE.MeshPhysicalMaterial({
    ...realisticPetalMaterialBase,
    color: "#dd2050",
    sheenColor: "#ff88aa",
  }),
];

const realisticStemMaterial = new THREE.MeshPhysicalMaterial({
  color: "#1a5c35",
  metalness: 0.0,
  roughness: 0.7,
  clearcoat: 0.15,
  clearcoatRoughness: 0.7,
  side: THREE.DoubleSide,
});

const realisticLeafMaterial = new THREE.MeshPhysicalMaterial({
  color: "#145c30",
  metalness: 0.0,
  roughness: 0.6,
  clearcoat: 0.2,
  clearcoatRoughness: 0.6,
  sheen: 0.3,
  sheenColor: "#2a8050",
  side: THREE.DoubleSide,
});

const realisticSepalMaterial = new THREE.MeshPhysicalMaterial({
  color: "#0f4825",
  metalness: 0.0,
  roughness: 0.7,
  clearcoat: 0.1,
  clearcoatRoughness: 0.8,
  side: THREE.DoubleSide,
});

// Create more realistic petal shape - rounder, more heart-like
function createRealisticPetalShape(layer: number = 0) {
  const shape = new THREE.Shape();

  // More pronounced shape changes per layer
  const widthScale = 0.7 + layer * 0.2;
  const heightScale = 1.05 - layer * 0.08;
  const notchDepth = 0.015 + layer * 0.025;

  shape.moveTo(0, 0);

  // Rounder, fuller shape
  shape.bezierCurveTo(
    0.12 * widthScale, 0.02 * heightScale,
    0.42 * widthScale, 0.18 * heightScale,
    0.52 * widthScale, 0.48 * heightScale
  );

  shape.bezierCurveTo(
    0.56 * widthScale, 0.68 * heightScale,
    0.48 * widthScale, 0.88 * heightScale,
    0.28 * widthScale, 0.98 * heightScale
  );

  // Softer heart notch
  shape.bezierCurveTo(
    0.15 * widthScale, 1.02 * heightScale,
    0.05 * widthScale, (1.0 - notchDepth) * heightScale,
    0, (1.0 - notchDepth * 0.4) * heightScale
  );

  shape.bezierCurveTo(
    -0.05 * widthScale, (1.0 - notchDepth) * heightScale,
    -0.15 * widthScale, 1.02 * heightScale,
    -0.28 * widthScale, 0.98 * heightScale
  );

  shape.bezierCurveTo(
    -0.48 * widthScale, 0.88 * heightScale,
    -0.56 * widthScale, 0.68 * heightScale,
    -0.52 * widthScale, 0.48 * heightScale
  );

  shape.bezierCurveTo(
    -0.42 * widthScale, 0.18 * heightScale,
    -0.12 * widthScale, 0.02 * heightScale,
    0, 0
  );

  return shape;
}

const realisticPetalShapes = [
  createRealisticPetalShape(0),
  createRealisticPetalShape(1),
  createRealisticPetalShape(2),
  createRealisticPetalShape(3),
  createRealisticPetalShape(4),
];

function createRealisticPetalGeometry(layer: number, variant: number = 0) {
  const shapeIndex = Math.min(layer, realisticPetalShapes.length - 1);
  const shape = realisticPetalShapes[shapeIndex];

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelThickness: 0.005,
    bevelSize: 0.005,
    bevelSegments: 2,
    curveSegments: 28,
  });

  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) return geometry;

  const height = bounds.max.y - bounds.min.y;
  const halfWidth = Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)) || 1;
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();

  const layerT = layer / 5;
  const variantOffset = variant * 0.12;

  // More natural deformation parameters
  const cup = 0.18 - layerT * 0.14;
  const backwardCurl = Math.pow(layerT, 1.5) * 0.35;
  const edgeCurl = 0.015 + layerT * 0.06;
  const ruffle = layerT * 0.025;
  const pinch = 0.35 - layerT * 0.18;
  const twist = 0.08 + (1 - layerT) * 0.25;

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);

    const y01 = height > 0 ? (vertex.y - bounds.min.y) / height : 0;
    const edge = THREE.MathUtils.clamp(Math.abs(vertex.x) / halfWidth, 0, 1);
    const center = 1 - edge;

    // Stronger base pinch
    const basePinch = 1 - (1 - Math.min(y01 / 0.3, 1)) * pinch;
    vertex.x *= basePinch;

    // Natural cupping
    const cupCurve = Math.sin(y01 * Math.PI * 0.7) * center * cup;

    // Gentle edge curl
    const edgeCurlAmount = Math.pow(edge, 1.8) * edgeCurl * (0.8 + Math.sin(y01 * Math.PI) * 0.4);

    // Progressive backward curl
    const backCurl = Math.pow(Math.max(0, y01 - 0.3), 2) * backwardCurl * (0.6 + center * 0.4);

    // Subtle edge ruffle
    const ruffleWave = Math.sin(y01 * Math.PI * 5 + edge * Math.PI * 3 + variantOffset * 2)
      * ruffle * edge * Math.pow(y01, 0.5);

    vertex.z += cupCurve - edgeCurlAmount - backCurl + ruffleWave;

    // Spiral twist
    const twistAngle = (y01 - 0.25) * twist * (1 + variantOffset * 0.2);
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

// Create more geometry variants for natural variation
const realisticPetalGeometries: THREE.ExtrudeGeometry[] = [];
for (let layer = 0; layer < 6; layer++) {
  for (let variant = 0; variant < 4; variant++) {
    realisticPetalGeometries.push(createRealisticPetalGeometry(layer, variant));
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

function createRealisticLeafGeometry() {
  const leafLength = 1;
  const halfWidth = 0.24;
  const edgeSegments = 16;

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);

  for (let i = 1; i <= edgeSegments; i++) {
    const t = i / edgeSegments;
    const y = t * leafLength;
    const widthProfile = Math.sin(Math.PI * t) * halfWidth * (1 - t * 0.3);
    const serration = 0.015 * Math.sin(t * Math.PI * 12) * (1 - t * 0.5);
    shape.lineTo(widthProfile + serration, y);
  }

  shape.lineTo(0, leafLength);

  for (let i = edgeSegments; i >= 1; i--) {
    const t = i / edgeSegments;
    const y = t * leafLength;
    const widthProfile = Math.sin(Math.PI * t) * halfWidth * (1 - t * 0.3);
    const serration = 0.015 * Math.sin(t * Math.PI * 12) * (1 - t * 0.5);
    shape.lineTo(-(widthProfile + serration), y);
  }

  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.008,
    bevelEnabled: true,
    bevelThickness: 0.004,
    bevelSize: 0.004,
    bevelSegments: 2,
    curveSegments: 20,
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

    const midrib = (1 - THREE.MathUtils.clamp(Math.abs(vertex.x) / (halfWidth * 0.3), 0, 1)) * 0.025;
    const curl = Math.sin(y01 * Math.PI) * 0.06 * centerFalloff;
    const twist = Math.sin(y01 * Math.PI * 0.7) * 0.015 * Math.sign(vertex.x);

    vertex.z += curl + midrib;
    vertex.x += twist;

    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  position.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

const realisticLeafGeometry = createRealisticLeafGeometry();

function RealisticPetal({ config, index }: { config: PetalConfig; index: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const baseRotation = useMemo(
    () => new THREE.Euler(config.rotation[0], config.rotation[1], config.rotation[2]),
    [config.rotation]
  );

  useFrame((state) => {
    if (!meshRef.current) return;
    const t = state.clock.elapsedTime;

    // Very subtle breathing - more realistic
    const breathSpeed = 0.25;
    const phase = index * 0.08;
    const baseBreath = 0.03 + config.openness * 0.05;
    const breath = Math.sin(t * breathSpeed + phase) * baseBreath;

    meshRef.current.rotation.x = baseRotation.x + breath;
    meshRef.current.rotation.y = baseRotation.y + Math.sin(t * 0.3 + phase) * 0.01 * config.openness;
    meshRef.current.rotation.z = baseRotation.z + Math.sin(t * 0.25 + phase * 0.8) * 0.015 * config.openness;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={realisticPetalGeometries[config.geometryIndex]}
      material={realisticPetalMaterials[config.materialIndex]}
      position={config.position}
      rotation={config.rotation}
      scale={config.scale}
    />
  );
}

function RealisticRoseBud() {
  const groupRef = useRef<THREE.Group>(null);

  const petals = useMemo(() => {
    const petalConfigs: PetalConfig[] = [];
    const rand = mulberry32(42);

    // More whorls with more petals for realistic density
    const whorls = [
      // Very tight center spiral
      { count: 3, radius: 0.015, height: 0.24, tilt: 0.08, scale: 0.08, layer: 0 },
      { count: 4, radius: 0.025, height: 0.23, tilt: 0.12, scale: 0.10, layer: 0 },
      { count: 5, radius: 0.038, height: 0.21, tilt: 0.18, scale: 0.13, layer: 0 },
      // Inner cup
      { count: 5, radius: 0.052, height: 0.19, tilt: 0.25, scale: 0.17, layer: 1 },
      { count: 6, radius: 0.068, height: 0.17, tilt: 0.32, scale: 0.21, layer: 1 },
      { count: 7, radius: 0.085, height: 0.15, tilt: 0.40, scale: 0.25, layer: 1 },
      // Middle layers
      { count: 7, radius: 0.105, height: 0.12, tilt: 0.48, scale: 0.30, layer: 2 },
      { count: 8, radius: 0.125, height: 0.09, tilt: 0.55, scale: 0.35, layer: 2 },
      { count: 8, radius: 0.148, height: 0.06, tilt: 0.62, scale: 0.40, layer: 3 },
      // Outer layers
      { count: 9, radius: 0.175, height: 0.03, tilt: 0.70, scale: 0.45, layer: 3 },
      { count: 9, radius: 0.205, height: 0.00, tilt: 0.78, scale: 0.50, layer: 4 },
      { count: 10, radius: 0.238, height: -0.03, tilt: 0.85, scale: 0.54, layer: 4 },
      // Outermost
      { count: 10, radius: 0.275, height: -0.06, tilt: 0.92, scale: 0.56, layer: 5 },
      { count: 11, radius: 0.315, height: -0.09, tilt: 0.97, scale: 0.58, layer: 5 },
    ];

    const up = new THREE.Vector3(0, 1, 0);
    const radial = new THREE.Vector3();
    const petalDir = new THREE.Vector3();
    const baseQuat = new THREE.Quaternion();
    const rollQuat = new THREE.Quaternion();
    const finalQuat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    let whorlOffset = 0;

    whorls.forEach((whorl) => {
      whorlOffset += Math.PI / whorl.count * 0.8;

      for (let i = 0; i < whorl.count; i++) {
        const angleBase = (i / whorl.count) * Math.PI * 2 + whorlOffset;
        const angle = angleBase + (rand() - 0.5) * 0.12;

        const radiusVar = whorl.radius * (0.94 + rand() * 0.12);
        const heightVar = whorl.height + (rand() - 0.5) * 0.015;
        const scaleVar = whorl.scale * (0.92 + rand() * 0.16);

        radial.set(Math.cos(angle), 0, Math.sin(angle));

        const upComponent = Math.cos(whorl.tilt * Math.PI * 0.5);
        const outComponent = Math.sin(whorl.tilt * Math.PI * 0.5);
        const downComponent = whorl.layer >= 4 ? (whorl.tilt - 0.8) * 0.35 : 0;

        petalDir.set(
          radial.x * outComponent,
          upComponent - downComponent,
          radial.z * outComponent
        ).normalize();

        baseQuat.setFromUnitVectors(up, petalDir);

        const rollAngle = angle + Math.PI + (rand() - 0.5) * 0.25;
        rollQuat.setFromAxisAngle(petalDir, rollAngle);

        finalQuat.copy(rollQuat).multiply(baseQuat);
        euler.setFromQuaternion(finalQuat, "XYZ");

        // 4 variants per layer, 6 layers
        const geometryIndex = Math.min(
          whorl.layer * 4 + Math.floor(rand() * 4),
          realisticPetalGeometries.length - 1
        );

        // More gradual color transition
        const materialIndex = Math.min(
          realisticPetalMaterials.length - 1,
          Math.floor((whorl.layer / 5) * realisticPetalMaterials.length)
        );

        petalConfigs.push({
          position: [
            Math.cos(angle) * radiusVar,
            heightVar,
            Math.sin(angle) * radiusVar,
          ],
          rotation: [euler.x, euler.y, euler.z],
          scale: scaleVar,
          geometryIndex,
          materialIndex,
          openness: whorl.tilt,
        });
      }
    });

    return petalConfigs;
  }, []);

  const sepals = useMemo(() => {
    const configs: SepalConfig[] = [];
    const rand = mulberry32(99);
    const count = 5;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + 0.15;
      const tilt = 2.2 + (rand() - 0.5) * 0.15;
      const roll = (rand() - 0.5) * 0.2;
      const radius = 0.14 + (rand() - 0.5) * 0.02;
      const scale = 0.20 + rand() * 0.05;

      configs.push({
        position: [
          Math.cos(angle) * radius,
          -0.14 + (rand() - 0.5) * 0.015,
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
      // Slower, more subtle rotation
      groupRef.current.rotation.y = t * 0.15;
      groupRef.current.rotation.x = Math.sin(t * 0.4) * 0.015;
      const breath = 1 + Math.sin(t * 0.6) * 0.006;
      groupRef.current.scale.setScalar(breath);
    }
  });

  return (
    <group ref={groupRef} position={[0, 1.5, 0]}>
      {petals.map((petal, i) => (
        <RealisticPetal key={i} config={petal} index={i} />
      ))}
      {sepals.map((sepal, i) => (
        <mesh
          key={`sepal-${i}`}
          geometry={realisticLeafGeometry}
          material={realisticSepalMaterial}
          position={sepal.position}
          rotation={sepal.rotation}
          scale={sepal.scale}
        />
      ))}
      {/* Smaller, darker center */}
      <mesh position={[0, 0.20, 0]}>
        <sphereGeometry args={[0.035, 16, 16]} />
        <meshStandardMaterial color="#4a0012" roughness={0.8} metalness={0} />
      </mesh>
    </group>
  );
}

function RealisticLeaf({
  position,
  rotation,
  scale = 1,
  phase = 0,
  flutter = 0.03,
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
    meshRef.current.rotation.x = baseRotation.x + Math.sin(t * 0.8 + phase) * flutter;
    meshRef.current.rotation.y = baseRotation.y + Math.sin(t * 0.6 + phase * 1.1) * (flutter * 0.25);
    meshRef.current.rotation.z = baseRotation.z + Math.sin(t * 1.0 + phase * 1.3) * (flutter * 0.5);

    meshRef.current.position.x = basePosition.x + Math.sin(t * 0.5 + phase) * 0.005;
    meshRef.current.position.y = basePosition.y + Math.sin(t * 0.7 + phase * 0.9) * 0.004;
    meshRef.current.position.z = basePosition.z + Math.sin(t * 0.6 + phase * 1.2) * 0.005;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={realisticLeafGeometry}
      material={realisticLeafMaterial}
      position={position}
      rotation={rotation}
      scale={scale}
    />
  );
}

function RealisticThorns({ thorns }: { thorns: ThornConfig[] }) {
  const thornGeometry = useMemo(() => {
    const geometry = new THREE.ConeGeometry(0.012, 0.05, 6);
    geometry.translate(0, 0.025, 0);
    return geometry;
  }, []);

  return (
    <>
      {thorns.map((thorn, i) => (
        <mesh
          key={i}
          geometry={thornGeometry}
          material={realisticStemMaterial}
          position={thorn.position}
          rotation={thorn.rotation}
        />
      ))}
    </>
  );
}

function RealisticStemAssembly() {
  const groupRef = useRef<THREE.Group>(null);

  const stem = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(
      [
        new THREE.Vector3(0, -1.5, 0),
        new THREE.Vector3(0.12, -0.95, 0.05),
        new THREE.Vector3(-0.08, -0.35, -0.1),
        new THREE.Vector3(0.1, 0.35, 0.06),
        new THREE.Vector3(-0.05, 1.0, -0.03),
        new THREE.Vector3(0.01, 1.38, 0.02),
      ],
      false,
      "catmullrom",
      0.6
    );

    const tubeGeometry = new THREE.TubeGeometry(curve, 80, 0.04, 10, false);
    const frameSegments = 140;
    const frames = curve.computeFrenetFrames(frameSegments, false);
    return { curve, tubeGeometry, frameSegments, frames };
  }, []);

  const leaves = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const configs = [
      { t: 0.42, side: -1, scale: 0.48, roll: -0.45 },
      { t: 0.28, side: 1, scale: 0.40, roll: 0.3 },
      { t: 0.14, side: -1, scale: 0.35, roll: -0.15 },
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
        .multiplyScalar(0.3)
        .add(outward.multiplyScalar(0.85))
        .normalize();

      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
      quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(direction, config.roll));
      const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");

      const leafPos = point.clone().add(normal.clone().multiplyScalar(config.side * 0.07));

      return {
        position: [leafPos.x, leafPos.y, leafPos.z],
        rotation: [euler.x, euler.y, euler.z],
        scale: config.scale,
        phase: idx * 1.5,
        flutter: 0.03 + idx * 0.008,
      };
    });
  }, [stem]);

  const thorns = useMemo(() => {
    const up = new THREE.Vector3(0, 1, 0);
    const tValues = [0.2, 0.3, 0.42, 0.55, 0.65];
    return tValues.map((t, idx): ThornConfig => {
      const i = Math.min(
        stem.frameSegments,
        Math.max(0, Math.floor(t * stem.frameSegments))
      );
      const point = stem.curve.getPointAt(t);
      const tangent = stem.frames.tangents[i];
      const normal = stem.frames.normals[i];

      const angle = idx * 1.5 + 0.6;
      const outward = normal.clone().applyAxisAngle(tangent, angle).normalize();
      const quaternion = new THREE.Quaternion().setFromUnitVectors(up, outward);
      const euler = new THREE.Euler().setFromQuaternion(quaternion, "XYZ");

      const thornPos = point.clone().add(outward.multiplyScalar(0.045));
      return {
        position: [thornPos.x, thornPos.y, thornPos.z],
        rotation: [euler.x, euler.y, euler.z],
      };
    });
  }, [stem]);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.z = Math.sin(t * 0.35) * 0.02;
    groupRef.current.rotation.x = Math.sin(t * 0.3) * 0.012;
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={stem.tubeGeometry} material={realisticStemMaterial} />
      <RealisticThorns thorns={thorns} />
      {leaves.map((leaf, i) => (
        <RealisticLeaf
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

export default function RealisticRose() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      const t = state.clock.elapsedTime;
      // Very subtle movement
      groupRef.current.position.y = Math.sin(t * 0.35) * 0.03;
      groupRef.current.rotation.y = Math.sin(t * 0.12) * 0.05;
    }
  });

  return (
    <group ref={groupRef}>
      <RealisticRoseBud />
      <RealisticStemAssembly />
    </group>
  );
}
