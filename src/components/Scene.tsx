import { Suspense } from "react";
import {
  Environment,
  Float,
  OrbitControls,
  Stars,
  MeshTransmissionMaterial,
} from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import GlassRose from "./GlassRose";
import Sparkles from "./Sparkles";

function Lights() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <spotLight
        position={[5, 5, 5]}
        angle={0.3}
        penumbra={1}
        intensity={2}
        color="#fff0f5"
      />
      <spotLight
        position={[-5, 3, -5]}
        angle={0.4}
        penumbra={1}
        intensity={1.5}
        color="#ffe4ec"
      />
      <pointLight position={[0, 3, 0]} intensity={1} color="#ff69b4" />
      <pointLight position={[0, -2, 2]} intensity={0.5} color="#87ceeb" />
    </>
  );
}

function GlassBall() {
  return (
    <mesh position={[0, 0.8, 0]}>
      <sphereGeometry args={[2.5, 64, 64]} />
      <MeshTransmissionMaterial
        backside
        samples={16}
        resolution={512}
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
      />
    </mesh>
  );
}

function Base() {
  return (
    <group position={[0, -1.5, 0]}>
      {/* Main base */}
      <mesh position={[0, -0.15, 0]}>
        <cylinderGeometry args={[1.8, 2, 0.3, 32]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Gold rim */}
      <mesh position={[0, 0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.82, 0.05, 8, 32]} />
        <meshStandardMaterial color="#ffd700" metalness={1} roughness={0.2} />
      </mesh>
      {/* Inner platform for rose */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.1, 32]} />
        <meshStandardMaterial color="#2d2d44" metalness={0.7} roughness={0.3} />
      </mesh>
    </group>
  );
}

export default function Scene() {
  return (
    <>
      <color attach="background" args={["#0a0a15"]} />

      <Lights />

      <Stars
        radius={50}
        depth={50}
        count={1000}
        factor={4}
        saturation={0.5}
        fade
        speed={0.3}
      />

      <Suspense fallback={null}>
        <Environment environmentIntensity={0.05} preset="studio" />

        <Float
          speed={1}
          rotationIntensity={0.2}
          floatIntensity={0.3}
          floatingRange={[-0.05, 0.05]}
        >
          <GlassRose />
        </Float>

        <GlassBall />
        <Base />
        <Sparkles count={80} radius={2.5} />
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

      <EffectComposer>
        <Bloom
          intensity={0.4}
          luminanceThreshold={0.3}
          luminanceSmoothing={0.9}
        />
      </EffectComposer>
    </>
  );
}
