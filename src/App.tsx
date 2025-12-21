import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import Scene from "./components/Scene";
import SunLoader from "./components/SunLoader";
import "./App.css";

function App() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(max-width: 768px)").matches;
  });
  const [canvasReady, setCanvasReady] = useState(false);
  const [sceneVisible, setSceneVisible] = useState(false);
  const [roseType, setRoseType] = useState<"glass" | "realistic" | "spiral">("spiral");

  useEffect(() => {
    const media = window.matchMedia("(max-width: 768px)");
    const handleChange = () => setIsMobile(media.matches);

    handleChange();
    if (media.addEventListener) {
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    }
    media.addListener(handleChange);
    return () => media.removeListener(handleChange);
  }, []);

  const camera = useMemo(
    () => ({
      position: (isMobile ? [-5, 14, 12] : [-15, 10, 8]) as [number, number, number],
      fov: 60,
    }),
    [isMobile],
  );

  return (
    <div className="app">
      <Canvas
        className={`scene-canvas${sceneVisible ? " is-ready" : ""}`}
        camera={camera}
        gl={{
          antialias: !isMobile,
          alpha: false,
          powerPreference: isMobile ? "high-performance" : "default",
        }}
        dpr={isMobile ? 1 : [1, 2]}
        onCreated={() => setCanvasReady(true)}
      >
        <Scene isMobile={isMobile} roseType={roseType} />
      </Canvas>
      <SunLoader
        canvasReady={canvasReady}
        onComplete={() => setSceneVisible(true)}
      />
      <div className="message">
        <h1>i made this for you</h1>
      </div>
      {sceneVisible && (
        <button
          className="rose-toggle"
          onClick={() => {
            const types: ("glass" | "realistic" | "spiral")[] = ["glass", "realistic", "spiral"];
            const currentIndex = types.indexOf(roseType);
            const nextIndex = (currentIndex + 1) % types.length;
            setRoseType(types[nextIndex]);
          }}
        >
          {roseType === "glass" && "Realistic Rose →"}
          {roseType === "realistic" && "Spiral Rose →"}
          {roseType === "spiral" && "Glass Rose →"}
        </button>
      )}
    </div>
  );
}

export default App;
