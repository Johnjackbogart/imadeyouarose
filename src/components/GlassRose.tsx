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

interface PetalGeometryOptions {
  curl?: number;
  cup?: number;
  twist?: number;
  ruffle?: number;
  tipFold?: number;
  pinch?: number;
}

// Pre-create petal geometries once
const petalShape = new THREE.Shape();
petalShape.moveTo(0, 0);
petalShape.bezierCurveTo(0.2, 0.02, 0.52, 0.35, 0.44, 0.75);
petalShape.bezierCurveTo(0.4, 1.12, 0.16, 1.42, 0, 1.34);
petalShape.bezierCurveTo(-0.16, 1.42, -0.4, 1.12, -0.44, 0.75);
petalShape.bezierCurveTo(-0.52, 0.35, -0.2, 0.02, 0, 0);

function createPetalGeometry({
  curl = 0.06,
  cup = 0.06,
  twist = 0.35,
  ruffle = 0.025,
  tipFold = 0.04,
  pinch = 0.18,
}: PetalGeometryOptions = {}) {
  const geometry = new THREE.ExtrudeGeometry(petalShape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.012,
    bevelSegments: 3,
    curveSegments: 20,
  });

  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox;
  if (!bounds) return geometry;

  const height = bounds.max.y - bounds.min.y;
  const halfWidth =
    Math.max(Math.abs(bounds.min.x), Math.abs(bounds.max.x)) || 1;
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();

  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i);

    const y01 = height > 0 ? (vertex.y - bounds.min.y) / height : 0;
    const edge = THREE.MathUtils.clamp(Math.abs(vertex.x) / halfWidth, 0, 1);
    const center = 1 - edge;

    const basePinch = 1 - (1 - Math.min(y01 / 0.22, 1)) * pinch;
    vertex.x *= basePinch;

    const ruffleWave =
      Math.sin(y01 * Math.PI * 3.5 + edge * Math.PI) * ruffle * edge;
    const cupCurve = Math.sin(y01 * Math.PI) * center * cup;
    const curlEdge =
      Math.pow(edge, 1.55) * (curl + 0.02 * Math.sin(y01 * Math.PI * 2));
    const tip = Math.max(0, y01 - 0.78) / 0.22;

    const tipFoldAmount = tip * tipFold * (0.35 + edge * 0.65);
    vertex.z += cupCurve - curlEdge + ruffleWave - tipFoldAmount;

    const twistAngle = (y01 - 0.15) * twist;
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

const petalGeometries = [
  createPetalGeometry({
    curl: 0.04,
    cup: 0.08,
    twist: 0.4,
    ruffle: 0.015,
    tipFold: 0.02,
    pinch: 0.24,
  }),
  createPetalGeometry({
    curl: 0.06,
    cup: 0.06,
    twist: 0.32,
    ruffle: 0.022,
    tipFold: 0.035,
    pinch: 0.18,
  }),
  createPetalGeometry({
    curl: 0.08,
    cup: 0.05,
    twist: 0.45,
    ruffle: 0.03,
    tipFold: 0.05,
    pinch: 0.14,
  }),
  createPetalGeometry({
    curl: 0.11,
    cup: 0.03,
    twist: 0.55,
    ruffle: 0.045,
    tipFold: 0.075,
    pinch: 0.1,
  }),
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

function RoseBud() {
  const groupRef = useRef<THREE.Group>(null);

  const petals = useMemo(() => {
    const petalConfigs: PetalConfig[] = [];
    const rand = mulberry32(23);
    const petalCount = 60;
    const goldenAngle = Math.PI * (3 - Math.sqrt(5)) * 1.12;
    const up = new THREE.Vector3(0, 1, 0);
    const down = new THREE.Vector3(0, -1, 0);
    const radial = new THREE.Vector3();
    const tangent = new THREE.Vector3();
    const petalDir = new THREE.Vector3();
    const radialScaled = new THREE.Vector3();
    const downScaled = new THREE.Vector3();
    const currentRight = new THREE.Vector3();
    const desiredRight = new THREE.Vector3();
    const projectedCurrent = new THREE.Vector3();
    const projectedDesired = new THREE.Vector3();
    const cross = new THREE.Vector3();
    const baseQuat = new THREE.Quaternion();
    const rollQuat = new THREE.Quaternion();
    const finalQuat = new THREE.Quaternion();
    const euler = new THREE.Euler();

    for (let i = 0; i < petalCount; i++) {
      const t = i / (petalCount - 1);
      const open = Math.pow(t, 1.18);
      const edge = Math.max(0, (t - 0.8) / 0.2);

      const spiral = i * goldenAngle;
      const angle = spiral + (rand() - 0.5) * 0.12 + open * 0.5;
      const radius = 0.005 + Math.pow(t, 0.86) * 0.3;
      const height = 0.15 - Math.pow(t, 0.94) * 0.33;
      const scale = (0.18 + open * 0.68) * (0.9 + rand() * 0.12);

      const outward =
        radius + (rand() - 0.5) * (0.012 + open * 0.01) + edge * 0.02;
      const lifted = height + (rand() - 0.5) * 0.02 - edge * 0.02;

      const geometryIndex =
        edge > 0.5 ? 3 : open > 0.62 ? 2 : open > 0.28 ? 1 : 0;

      let materialIndex = Math.min(
        petalMaterials.length - 1,
        Math.floor(open * petalMaterials.length),
      );
      if (rand() < 0.25 && materialIndex > 0) {
        materialIndex -= 1;
      }

      radial.set(Math.cos(angle), 0, Math.sin(angle));
      tangent.set(-Math.sin(angle), 0, Math.cos(angle));

      const radialBias = -0.36 + open * 1.18;
      const upward = 1 - open * 0.28;
      radialScaled.copy(radial).multiplyScalar(radialBias);
      downScaled.copy(down).multiplyScalar(open * (0.08 + edge * 0.25));

      petalDir
        .copy(up)
        .multiplyScalar(upward)
        .add(radialScaled)
        .add(downScaled)
        .normalize();

      baseQuat.setFromUnitVectors(up, petalDir);

      desiredRight
        .copy(tangent)
        .lerp(radial, 0.2 + open * 0.6)
        .normalize();
      currentRight.set(1, 0, 0).applyQuaternion(baseQuat);

      projectedCurrent
        .copy(currentRight)
        .addScaledVector(petalDir, -currentRight.dot(petalDir));
      projectedDesired
        .copy(desiredRight)
        .addScaledVector(petalDir, -desiredRight.dot(petalDir));

      if (
        projectedCurrent.lengthSq() < 1e-6 ||
        projectedDesired.lengthSq() < 1e-6
      ) {
        rollQuat.identity();
      } else {
        projectedCurrent.normalize();
        projectedDesired.normalize();
        const dot = THREE.MathUtils.clamp(
          projectedCurrent.dot(projectedDesired),
          -1,
          1,
        );
        let angleAround = Math.acos(dot);
        cross.crossVectors(projectedCurrent, projectedDesired);
        if (petalDir.dot(cross) < 0) {
          angleAround = -angleAround;
        }
        angleAround += (rand() - 0.5) * (0.3 + open * 0.6) + edge * 0.15;
        rollQuat.setFromAxisAngle(petalDir, angleAround);
      }

      finalQuat.copy(rollQuat).multiply(baseQuat);
      euler.setFromQuaternion(finalQuat, "XYZ");

      petalConfigs.push({
        position: [
          Math.cos(angle) * outward,
          lifted,
          Math.sin(angle) * outward,
        ],
        rotation: [euler.x, euler.y, euler.z],
        scale,
        geometryIndex,
        materialIndex,
        openness: open, // Store how open this petal is for animation
      });
    }
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
    </group>
  );
}
