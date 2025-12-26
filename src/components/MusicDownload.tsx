import { Html } from "@react-three/drei";
import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export default function MusicDownload() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Gentle floating motion
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = "/songs/slug.flac";
    link.download = "slug.flac";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <group ref={groupRef} position={[0, 1.5, 0]}>
      <Html center transform distanceFactor={8}>
        <button
          onClick={handleDownload}
          style={{
            padding: "16px 32px",
            fontSize: "18px",
            fontFamily: "Georgia, serif",
            background: "linear-gradient(135deg, #51921e, #8B4513)",
            color: "#fff8e7",
            border: "2px solid #ffb509",
            borderRadius: "12px",
            cursor: "pointer",
            backdropFilter: "blur(8px)",
            boxShadow: "0 8px 32px rgba(81, 146, 30, 0.5)",
            transition: "all 0.3s ease",
            textShadow: "0 2px 4px rgba(0,0,0,0.4)",
            letterSpacing: "0.1em",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.1)";
            e.currentTarget.style.boxShadow = "0 12px 40px rgba(255, 181, 9, 0.6)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 8px 32px rgba(81, 146, 30, 0.5)";
          }}
        >
          Download Song
        </button>
      </Html>
    </group>
  );
}
