import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import Scene from "./components/Scene";
import "./App.css";

function App() {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return window.matchMedia("(max-width: 768px)").matches;
  });

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
        camera={camera}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>
      <div className="message">
        <h1>i made this for you</h1>
      </div>
    </div>
  );
}

export default App;
