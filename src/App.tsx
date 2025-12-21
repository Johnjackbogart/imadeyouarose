import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import Scene from "./components/Scene";
import SunLoader from "./components/SunLoader";
import "./App.css";

type RoseType = "glass" | "realistic" | "spiral" | "iridescent" | "storm";

const VALID_ROSES: RoseType[] = ["glass", "realistic", "spiral", "iridescent", "storm"];

function getRoseFromURL(): RoseType {
  const params = new URLSearchParams(window.location.search);
  const rose = params.get("rose");
  if (rose && VALID_ROSES.includes(rose as RoseType)) {
    return rose as RoseType;
  }
  return "spiral";
}

function setRoseInURL(rose: RoseType) {
  const url = new URL(window.location.href);
  url.searchParams.set("rose", rose);
  window.history.replaceState({}, "", url.toString());
}

function App() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(max-width: 768px)").matches;
  });
  const [canvasReady, setCanvasReady] = useState(false);
  const [sceneVisible, setSceneVisible] = useState(false);
  const [roseType, setRoseType] = useState<RoseType>(getRoseFromURL);

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
      <div className={`message${sceneVisible ? " is-hidden" : ""}`}>
        <h1>i made this for you</h1>
      </div>
      {sceneVisible && (
        <select
          className="rose-selector"
          value={roseType}
          onChange={(e) => {
            const newRose = e.target.value as RoseType;
            setRoseType(newRose);
            setRoseInURL(newRose);
          }}
        >
          <option value="spiral">Spiral Rose</option>
          <option value="realistic">Realistic Rose</option>
          <option value="glass">Glass Rose</option>
          <option value="iridescent">Iridescent Rose</option>
          <option value="storm">Storm Rose</option>
        </select>
      )}
    </div>
  );
}

export default App;
