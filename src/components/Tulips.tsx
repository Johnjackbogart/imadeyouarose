import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";

type PetalGeometryOptions = {
  width: number;
  height: number;
  curl: number;
  flare: number;
  twist: number;
  jitter: number;
  topRoundness?: number;
};

type BloomConfig = {
  outerCount: number;
  innerCount: number;
  outerRadius: number;
  innerRadius: number;
  outerTilt: number;
  innerTilt: number;
  outerWidth: number;
  outerHeight: number;
  innerWidth: number;
  innerHeight: number;
  curl: number;
  flare: number;
  twist: number;
  jitter: number;
  topRoundness: number;
  baseY: number;
};

type TulipProps = {
  petalMaterial: THREE.Material;
  innerMaterial: THREE.Material;
  stemMaterial: THREE.Material;
  leafMaterial: THREE.Material;
  centerMaterial: THREE.Material;
  calyxMaterial?: THREE.Material;
  config: BloomConfig;
  swaySpeed?: number;
  swayStrength?: number;
};

const BASE_BLOOM: BloomConfig = {
  outerCount: 6,
  innerCount: 3,
  outerRadius: 0.22,
  innerRadius: 0.14,
  outerTilt: 0.35,
  innerTilt: 0.18,
  outerWidth: 0.55,
  outerHeight: 1.05,
  innerWidth: 0.38,
  innerHeight: 0.85,
  curl: 0.22,
  flare: 0.22,
  twist: 0,
  jitter: 0,
  topRoundness: 0,
  baseY: 0.9,
};

const GLASS_BLOOM: BloomConfig = {
  ...BASE_BLOOM,
  outerTilt: 0.48,
  innerTilt: 0.26,
  curl: 0.3,
  flare: 0.3,
  twist: 0.12,
};

const REALISTIC_BLOOM: BloomConfig = {
  ...BASE_BLOOM,
  outerTilt: 0.38,
  innerTilt: 0.22,
  curl: 0.2,
  flare: 0.2,
  twist: 0.05,
};

const SPIRAL_BLOOM: BloomConfig = {
  ...BASE_BLOOM,
  outerTilt: 0.52,
  innerTilt: 0.3,
  curl: 0.26,
  flare: 0.28,
  twist: 0.45,
};

const IRIDESCENT_BLOOM: BloomConfig = {
  ...BASE_BLOOM,
  outerTilt: 0.4,
  innerTilt: 0.24,
  curl: 0.24,
  flare: 0.26,
  twist: 0.14,
};

const ROUNDED_BLOOM: BloomConfig = {
  ...BASE_BLOOM,
  outerTilt: 0.26,
  innerTilt: 0.15,
  outerHeight: 1.0,
  innerHeight: 0.82,
  outerWidth: 0.6,
  innerWidth: 0.42,
  curl: 0.14,
  flare: 0.1,
  twist: 0.05,
  topRoundness: 0.6,
};

// Cupped red tulip - tighter cup formation for realistic closed tulip
const CUPPED_RED_BLOOM: BloomConfig = {
  outerCount: 3,
  innerCount: 3,
  outerRadius: 0.06,
  innerRadius: 0.03,
  outerTilt: 0.12,
  innerTilt: 0.06,
  outerWidth: 0.55,
  outerHeight: 1.15,
  innerWidth: 0.48,
  innerHeight: 1.05,
  curl: 0.4,
  flare: 0.05,
  twist: 0,
  jitter: 0,
  topRoundness: 0,
  baseY: 0.9,
};

const STORM_BLOOM: BloomConfig = {
  ...BASE_BLOOM,
  outerTilt: 0.28,
  innerTilt: 0.16,
  curl: 0.18,
  flare: 0.16,
  twist: 0.08,
  jitter: 0.15,
};

function useTulipTexture(path: string) {
  const texture = useTexture(path);

  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.needsUpdate = true;
  }, [texture]);

  return texture;
}

function createTulipPetalGeometry({
  width,
  height,
  curl,
  flare,
  twist,
  jitter,
  topRoundness = 0,
}: PetalGeometryOptions) {
  const geometry = new THREE.PlaneGeometry(width, height, 16, 20);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();
  const halfHeight = height / 2;
  const halfWidth = width / 2;
  const roundness = Math.max(0, topRoundness);

  for (let i = 0; i < position.count; i += 1) {
    vertex.fromBufferAttribute(position, i);
    const t = (vertex.y + halfHeight) / height;
    const widthScale = THREE.MathUtils.lerp(0.25, 1 + flare, t);
    vertex.x *= widthScale;

    const edge = Math.abs(vertex.x) / (halfWidth * widthScale);
    const curlWave = Math.sin(t * Math.PI) * curl;
    vertex.z += curlWave * (1 - edge);
    vertex.z += t * t * 0.18;

    if (twist !== 0) {
      const angle = twist * (t - 0.1);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const x = vertex.x;
      const z = vertex.z;
      vertex.x = x * cos - z * sin;
      vertex.z = x * sin + z * cos;
    }

    if (jitter > 0) {
      const noise =
        Math.sin(vertex.x * 12.7 + vertex.y * 8.3) * 43758.5453;
      const n = (noise - Math.floor(noise) - 0.5) * jitter;
      vertex.x += n * 0.05;
      vertex.z += n * 0.08;
    }

    if (roundness > 0) {
      const topFade = THREE.MathUtils.smoothstep(t, 0.6, 1);
      const denom = halfWidth * widthScale;
      const normalizedX =
        denom === 0
          ? 0
          : THREE.MathUtils.clamp(vertex.x / denom, -1, 1);
      const cap = Math.sqrt(1 - normalizedX * normalizedX);
      const drop = roundness * height * (1 - cap);
      vertex.y -= drop * topFade;
    }

    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geometry.translate(0, height / 2, 0);
  geometry.computeVertexNormals();
  return geometry;
}

function createLeafGeometry() {
  const geometry = new THREE.PlaneGeometry(0.5, 1.25, 6, 14);
  const position = geometry.attributes.position as THREE.BufferAttribute;
  const vertex = new THREE.Vector3();
  const halfHeight = 1.25 / 2;

  for (let i = 0; i < position.count; i += 1) {
    vertex.fromBufferAttribute(position, i);
    const t = (vertex.y + halfHeight) / 1.25;
    const widthScale = THREE.MathUtils.lerp(0.2, 1.0, t);
    vertex.x *= widthScale;
    vertex.z += Math.sin(t * Math.PI) * 0.22;
    vertex.z += (1 - t) * 0.05;
    position.setXYZ(i, vertex.x, vertex.y, vertex.z);
  }

  geometry.translate(0, 1.25 / 2, 0);
  geometry.computeVertexNormals();
  return geometry;
}

const leafGeometry = createLeafGeometry();

const stemCurve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(0, -1.45, 0),
    new THREE.Vector3(0.08, -0.9, 0.05),
    new THREE.Vector3(-0.06, -0.2, -0.04),
    new THREE.Vector3(0.04, 0.45, 0.02),
    new THREE.Vector3(0, 0.95, 0),
  ],
  false,
  "catmullrom",
  0.6
);

const stemGeometry = new THREE.TubeGeometry(stemCurve, 80, 0.045, 10, false);
const centerGeometry = new THREE.SphereGeometry(0.08, 16, 16);

function TulipStem({
  stemMaterial,
  leafMaterial,
}: {
  stemMaterial: THREE.Material;
  leafMaterial: THREE.Material;
}) {
  return (
    <group>
      <mesh geometry={stemGeometry} material={stemMaterial} />
      <mesh
        geometry={leafGeometry}
        material={leafMaterial}
        position={[0.2, -0.35, 0]}
        rotation={[0.2, 0.5, 0.6]}
        scale={0.9}
      />
      <mesh
        geometry={leafGeometry}
        material={leafMaterial}
        position={[-0.22, -0.75, -0.05]}
        rotation={[-0.1, -0.7, -0.5]}
        scale={0.75}
      />
    </group>
  );
}

function TulipBloom({
  config,
  petalMaterial,
  innerMaterial,
  centerMaterial,
  calyxMaterial,
}: {
  config: BloomConfig;
  petalMaterial: THREE.Material;
  innerMaterial: THREE.Material;
  centerMaterial: THREE.Material;
  calyxMaterial: THREE.Material;
}) {
  const {
    outerCount,
    innerCount,
    outerRadius,
    innerRadius,
    outerTilt,
    innerTilt,
    outerWidth,
    outerHeight,
    innerWidth,
    innerHeight,
    curl,
    flare,
    twist,
    jitter,
    topRoundness,
    baseY,
  } = config;

  const outerGeometry = useMemo(
    () =>
      createTulipPetalGeometry({
        width: outerWidth,
        height: outerHeight,
        curl,
        flare,
        twist,
        jitter,
        topRoundness,
      }),
    [outerWidth, outerHeight, curl, flare, twist, jitter, topRoundness]
  );

  const innerGeometry = useMemo(
    () =>
      createTulipPetalGeometry({
        width: innerWidth,
        height: innerHeight,
        curl: curl * 0.7,
        flare: flare * 0.55,
        twist: twist * 0.6,
        jitter: jitter * 0.5,
        topRoundness: topRoundness * 0.85,
      }),
    [innerWidth, innerHeight, curl, flare, twist, jitter, topRoundness]
  );

  const cupGeometry = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(
      outerRadius * 0.7,
      outerRadius * 0.55,
      outerRadius * 0.4,
      12,
      1,
      true
    );
    geometry.translate(0, outerRadius * 0.2, 0);
    return geometry;
  }, [outerRadius]);

  const calyxGeometry = useMemo(() => {
    const geometry = new THREE.ConeGeometry(
      outerRadius * 0.85,
      outerRadius * 0.6,
      6,
      1,
      true
    );
    geometry.translate(0, outerRadius * 0.18, 0);
    return geometry;
  }, [outerRadius]);

  return (
    <group position={[0, baseY, 0]}>
      <mesh geometry={calyxGeometry} material={calyxMaterial} rotation={[Math.PI, 0, 0]} />
      <mesh geometry={cupGeometry} material={innerMaterial} position={[0, 0.05, 0]} />
      {Array.from({ length: outerCount }, (_, i) => {
        const angle = (i / outerCount) * Math.PI * 2;
        const tilt = outerTilt + (i % 2 === 0 ? 0.04 : -0.03);
        const radius = outerRadius + (i % 2 === 0 ? 0.01 : -0.01);
        return (
          <group key={`outer-${i}`} rotation={[0, angle, 0]}>
            <mesh
              geometry={outerGeometry}
              material={petalMaterial}
              position={[0, 0, radius]}
              rotation={[tilt, 0, 0]}
            />
          </group>
        );
      })}
      {Array.from({ length: innerCount }, (_, i) => {
        const angle = (i / innerCount) * Math.PI * 2 + Math.PI / innerCount;
        const tilt = innerTilt + (i % 2 === 0 ? 0.02 : -0.01);
        const radius = innerRadius + (i % 2 === 0 ? 0.005 : -0.005);
        return (
          <group key={`inner-${i}`} rotation={[0, angle, 0]}>
            <mesh
              geometry={innerGeometry}
              material={innerMaterial}
              position={[0, 0.05, radius]}
              rotation={[tilt, 0, 0]}
              scale={0.9}
            />
          </group>
        );
      })}
      <mesh
        geometry={centerGeometry}
        material={centerMaterial}
        position={[0, 0.32, 0]}
        scale={0.9}
      />
    </group>
  );
}

function Tulip({
  petalMaterial,
  innerMaterial,
  stemMaterial,
  leafMaterial,
  centerMaterial,
  calyxMaterial,
  config,
  swaySpeed = 0.45,
  swayStrength = 0.05,
}: TulipProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;
    const t = state.clock.elapsedTime;
    groupRef.current.rotation.y = Math.sin(t * swaySpeed) * swayStrength;
    groupRef.current.rotation.z = Math.sin(t * swaySpeed * 0.8) * swayStrength * 0.6;
  });

  return (
    <group ref={groupRef}>
      <TulipStem stemMaterial={stemMaterial} leafMaterial={leafMaterial} />
      <TulipBloom
        config={config}
        petalMaterial={petalMaterial}
        innerMaterial={innerMaterial}
        centerMaterial={centerMaterial}
        calyxMaterial={calyxMaterial ?? leafMaterial}
      />
    </group>
  );
}

export function GlassTulip() {
  const petalMap = useTulipTexture("/tulips/tulip0.jpeg");

  const petalMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#f6b0c8",
        map: petalMap,
        metalness: 0.05,
        roughness: 0.25,
        transmission: 0.85,
        thickness: 0.3,
        ior: 1.45,
        clearcoat: 0.4,
        clearcoatRoughness: 0.2,
        transparent: true,
        opacity: 0.82,
        side: THREE.DoubleSide,
      }),
    [petalMap]
  );

  const innerMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#ee8cb4",
        map: petalMap,
        metalness: 0.05,
        roughness: 0.28,
        transmission: 0.82,
        thickness: 0.28,
        ior: 1.42,
        clearcoat: 0.35,
        clearcoatRoughness: 0.22,
        transparent: true,
        opacity: 0.84,
        side: THREE.DoubleSide,
      }),
    [petalMap]
  );

  const stemMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#3aa36d",
        metalness: 0.05,
        roughness: 0.4,
        transmission: 0.35,
        thickness: 0.22,
        ior: 1.4,
        clearcoat: 0.25,
        clearcoatRoughness: 0.35,
      }),
    []
  );

  const leafMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#2f8b5b",
        metalness: 0.04,
        roughness: 0.45,
        transmission: 0.3,
        thickness: 0.2,
        ior: 1.4,
        clearcoat: 0.2,
        clearcoatRoughness: 0.4,
        side: THREE.DoubleSide,
      }),
    []
  );

  const centerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f7d07a",
        emissive: "#f3b85b",
        emissiveIntensity: 0.2,
        roughness: 0.5,
        metalness: 0.1,
      }),
    []
  );

  return (
    <Tulip
      petalMaterial={petalMaterial}
      innerMaterial={innerMaterial}
      stemMaterial={stemMaterial}
      leafMaterial={leafMaterial}
      centerMaterial={centerMaterial}
      config={GLASS_BLOOM}
      swayStrength={0.045}
    />
  );
}

export function RealisticTulip() {
  const petalMap = useTulipTexture("/tulips/tulip1.jpeg");

  const petalMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f2b1c7",
        map: petalMap,
        roughness: 0.7,
        metalness: 0.05,
        side: THREE.DoubleSide,
      }),
    [petalMap]
  );

  const innerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e08aa8",
        map: petalMap,
        roughness: 0.65,
        metalness: 0.04,
        side: THREE.DoubleSide,
      }),
    [petalMap]
  );

  const stemMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#3d9a63",
        roughness: 0.75,
        metalness: 0.05,
      }),
    []
  );

  const leafMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2f7f55",
        roughness: 0.8,
        metalness: 0.04,
        side: THREE.DoubleSide,
      }),
    []
  );

  const centerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f0c97f",
        roughness: 0.7,
        metalness: 0.05,
      }),
    []
  );

  return (
    <Tulip
      petalMaterial={petalMaterial}
      innerMaterial={innerMaterial}
      stemMaterial={stemMaterial}
      leafMaterial={leafMaterial}
      centerMaterial={centerMaterial}
      config={REALISTIC_BLOOM}
      swayStrength={0.055}
    />
  );
}

export function SpiralTulip() {
  const petalMap = useTulipTexture("/tulips/tulip2.jpeg");

  const petalMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ff8fb2",
        map: petalMap,
        roughness: 0.55,
        metalness: 0.08,
        side: THREE.DoubleSide,
      }),
    [petalMap]
  );

  const innerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ff6f9a",
        map: petalMap,
        roughness: 0.5,
        metalness: 0.1,
        side: THREE.DoubleSide,
      }),
    [petalMap]
  );

  const stemMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#41a86c",
        roughness: 0.6,
        metalness: 0.05,
      }),
    []
  );

  const leafMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2f8a5e",
        roughness: 0.65,
        metalness: 0.05,
        side: THREE.DoubleSide,
      }),
    []
  );

  const centerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffd28a",
        roughness: 0.6,
        metalness: 0.1,
      }),
    []
  );

  return (
    <Tulip
      petalMaterial={petalMaterial}
      innerMaterial={innerMaterial}
      stemMaterial={stemMaterial}
      leafMaterial={leafMaterial}
      centerMaterial={centerMaterial}
      config={SPIRAL_BLOOM}
      swayStrength={0.06}
    />
  );
}

export function IridescentTulip() {
  const petalMap = useTulipTexture("/tulips/tulip3.jpeg");

  const petalMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#f7a4d2",
        map: petalMap,
        roughness: 0.28,
        metalness: 0.18,
        iridescence: 0.9,
        iridescenceIOR: 1.6,
        iridescenceThicknessRange: [140, 320],
        clearcoat: 0.5,
        clearcoatRoughness: 0.2,
        side: THREE.DoubleSide,
      }),
    [petalMap]
  );

  const innerMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#e989c3",
        map: petalMap,
        roughness: 0.3,
        metalness: 0.2,
        iridescence: 0.85,
        iridescenceIOR: 1.6,
        iridescenceThicknessRange: [160, 360],
        clearcoat: 0.45,
        clearcoatRoughness: 0.22,
        side: THREE.DoubleSide,
      }),
    [petalMap]
  );

  const stemMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#36a06d",
        roughness: 0.6,
        metalness: 0.1,
      }),
    []
  );

  const leafMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2f8c5f",
        roughness: 0.65,
        metalness: 0.08,
        side: THREE.DoubleSide,
      }),
    []
  );

  const centerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f7d48e",
        roughness: 0.55,
        metalness: 0.2,
      }),
    []
  );

  return (
    <Tulip
      petalMaterial={petalMaterial}
      innerMaterial={innerMaterial}
      stemMaterial={stemMaterial}
      leafMaterial={leafMaterial}
      centerMaterial={centerMaterial}
      config={IRIDESCENT_BLOOM}
      swayStrength={0.035}
    />
  );
}

export function RoundedTulip() {
  const petalMap = useTulipTexture("/tulips/tulip5.jpeg");

  const petalMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f4a7b8",
        map: petalMap,
        roughness: 0.6,
        metalness: 0.08,
        side: THREE.DoubleSide,
      }),
    [petalMap]
  );

  const innerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e992a7",
        map: petalMap,
        roughness: 0.55,
        metalness: 0.06,
        side: THREE.DoubleSide,
      }),
    [petalMap]
  );

  const stemMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#359a69",
        roughness: 0.55,
        metalness: 0.1,
      }),
    []
  );

  const leafMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2f8f5e",
        roughness: 0.5,
        metalness: 0.08,
        side: THREE.DoubleSide,
      }),
    []
  );

  const centerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f6c982",
        emissive: "#f0b66a",
        emissiveIntensity: 0.22,
        roughness: 0.55,
        metalness: 0.1,
      }),
    []
  );

  return (
    <Tulip
      petalMaterial={petalMaterial}
      innerMaterial={innerMaterial}
      stemMaterial={stemMaterial}
      leafMaterial={leafMaterial}
      centerMaterial={centerMaterial}
      config={ROUNDED_BLOOM}
      swayStrength={0.04}
    />
  );
}

export function StormTulip() {
  const petalMap = useTulipTexture("/tulips/tulip4.jpeg");

  const petalMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2a3149",
        map: petalMap,
        roughness: 0.35,
        metalness: 0.8,
        emissive: "#1b2b55",
        emissiveIntensity: 0.35,
        side: THREE.DoubleSide,
      }),
    [petalMap]
  );

  const innerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1e2338",
        map: petalMap,
        roughness: 0.4,
        metalness: 0.85,
        emissive: "#142244",
        emissiveIntensity: 0.3,
        side: THREE.DoubleSide,
      }),
    [petalMap]
  );

  const stemMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#2a6b4a",
        roughness: 0.7,
        metalness: 0.2,
      }),
    []
  );

  const leafMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#21523f",
        roughness: 0.75,
        metalness: 0.25,
        side: THREE.DoubleSide,
      }),
    []
  );

  const centerMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f1c06f",
        roughness: 0.45,
        metalness: 0.25,
      }),
    []
  );

  return (
    <Tulip
      petalMaterial={petalMaterial}
      innerMaterial={innerMaterial}
      stemMaterial={stemMaterial}
      leafMaterial={leafMaterial}
      centerMaterial={centerMaterial}
      config={STORM_BLOOM}
      swayStrength={0.02}
    />
  );
}
