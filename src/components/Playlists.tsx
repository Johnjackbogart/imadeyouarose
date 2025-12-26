import { Html } from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}

const playlists = [
  {
    name: "somebodyfuckingkillme",
    url: "https://open.spotify.com/playlist/2E1fdSG9FTt8pVX09BSam9",
    songs: 13,
    duration: "55 min",
  },
  {
    name: "ijustliketheseandithinkyouwouldtoo",
    url: "https://open.spotify.com/playlist/5U1dZrwi5JRiGHXCePJHnK",
    songs: 13,
    duration: "52 min",
  },
  {
    name: "ruhroh",
    url: "https://open.spotify.com/playlist/5Cr2Eztvf1aAeD9CdSwSpo",
    songs: 28,
    duration: "1hr 58min",
  },
];

export default function Playlists() {
  const groupRef = useRef<THREE.Group>(null);
  const isMobile = useIsMobile();

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group ref={groupRef} position={[0, 1.5, 0]}>
      <Html center transform distanceFactor={isMobile ? 8 : 10}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: isMobile ? "8px" : "12px",
            padding: isMobile ? "12px" : "16px",
            background: "linear-gradient(135deg, rgba(81, 146, 30, 0.85), rgba(139, 69, 19, 0.85))",
            borderRadius: isMobile ? "12px" : "16px",
            border: "2px solid #ffb509",
            backdropFilter: "blur(8px)",
            boxShadow: "0 8px 32px rgba(81, 146, 30, 0.5)",
            maxWidth: isMobile ? "280px" : "none",
            width: isMobile ? "calc(100vw - 40px)" : "auto",
          }}
        >
          <h3
            style={{
              margin: 0,
              color: "#ffb509",
              fontFamily: "Georgia, serif",
              fontSize: isMobile ? "12px" : "14px",
              letterSpacing: "0.15em",
              textAlign: "center",
              textShadow: "0 2px 4px rgba(0,0,0,0.4)",
            }}
          >
            PLAYLISTS
          </h3>
          {playlists.map((playlist, index) => (
            <a
              key={index}
              href={playlist.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: "block",
                padding: isMobile ? "10px 12px" : "12px 16px",
                background: "rgba(255, 248, 231, 0.15)",
                borderRadius: "8px",
                textDecoration: "none",
                transition: "all 0.3s ease",
                border: "1px solid rgba(255, 181, 9, 0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 181, 9, 0.3)";
                e.currentTarget.style.transform = "scale(1.02)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 248, 231, 0.15)";
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              <div
                style={{
                  color: "#fff8e7",
                  fontFamily: "Georgia, serif",
                  fontSize: isMobile ? "11px" : "13px",
                  fontWeight: "bold",
                  marginBottom: "4px",
                  textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  wordBreak: "break-word",
                }}
              >
                {playlist.name}
              </div>
              <div
                style={{
                  color: "rgba(255, 248, 231, 0.7)",
                  fontFamily: "Georgia, serif",
                  fontSize: isMobile ? "10px" : "11px",
                }}
              >
                {playlist.songs} songs · {playlist.duration}
              </div>
            </a>
          ))}
        </div>
      </Html>
    </group>
  );
}
