import { Canvas } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import Scene from "./components/Scene";
import SunLoader from "./components/SunLoader";
import HeartMessage from "./components/HeartMessage";
import "./App.css";

type RoseType = "glass" | "realistic" | "spiral" | "iridescent" | "storm";
type IdeaType = RoseType | "music" | "playlists";
type TulipType = RoseType | "rounded" | "cupped-red";
type FlowerMode = "rose" | "tulip";

const VALID_IDEAS: IdeaType[] = [
  "glass",
  "realistic",
  "spiral",
  "iridescent",
  "storm",
  "music",
  "playlists",
];
const VALID_TULIPS: TulipType[] = [
  "glass",
  "realistic",
  "spiral",
  "iridescent",
  "storm",
  "rounded",
  "cupped-red",
];

function getIdeaFromURL(): IdeaType {
  const params = new URLSearchParams(window.location.search);
  const idea = params.get("idea");
  if (idea && VALID_IDEAS.includes(idea as IdeaType)) {
    return idea as IdeaType;
  }
  return "music";
}

function setIdeaInURL(idea: IdeaType) {
  const url = new URL(window.location.href);
  url.searchParams.set("idea", idea);
  window.history.replaceState({}, "", url.toString());
}

function getTulipFromURL(): TulipType {
  const params = new URLSearchParams(window.location.search);
  const tulip = params.get("tulip");
  if (tulip && VALID_TULIPS.includes(tulip as TulipType)) {
    return tulip as TulipType;
  }
  return "cupped-red";
}

function setTulipInURL(tulip: TulipType) {
  const url = new URL(window.location.href);
  url.searchParams.set("tulip", tulip);
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
  const [ideaType, setIdeaType] = useState<IdeaType>(getIdeaFromURL);
  const [tulipType, setTulipType] = useState<TulipType>(getTulipFromURL);
  const [activeFlower, setActiveFlower] = useState<FlowerMode>("rose");

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
      position: (isMobile ? [-5, 14, 12] : [-15, 10, 8]) as [
        number,
        number,
        number,
      ],
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
        <Scene
          isMobile={isMobile}
          roseType={ideaType}
          tulipType={tulipType}
          activeFlower={activeFlower}
        />
      </Canvas>
      <SunLoader
        canvasReady={canvasReady}
        onComplete={() => setSceneVisible(true)}
      />
      <div className={`message${sceneVisible ? " is-hidden" : ""}`}>
        <h1>I'm an idiot!</h1>
      </div>
      {sceneVisible && (
        <>
          <select
            className="garbage-selector"
            value={activeFlower === "rose" ? ideaType : ""}
            onChange={(e) => {
              const newIdea = e.target.value as IdeaType;
              setIdeaType(newIdea);
              setIdeaInURL(newIdea);
              setActiveFlower("rose");
            }}
          >
            <option value="" disabled hidden></option>
            <option value="music">you inspired these songs</option>
            <option value="playlists">Playlists</option>
            <option value="spiral">Spiral Rose</option>
            <option value="realistic">Realistic Rose</option>
            <option value="glass">Glass Rose</option>
            <option value="iridescent">Iridescent Rose</option>
            <option value="storm">Storm Rose</option>
          </select>
          <select
            className="rose-selector"
            value={activeFlower === "tulip" ? tulipType : ""}
            onChange={(e) => {
              const newTulip = e.target.value as TulipType;
              setTulipType(newTulip);
              setTulipInURL(newTulip);
              setActiveFlower("tulip");
            }}
          >
            <option value="" disabled hidden></option>
            <option value="spiral">Spiral Tulip</option>
            <option value="realistic">Realistic Tulip</option>
            <option value="glass">Glass Tulip</option>
            <option value="iridescent">Iridescent Tulip</option>
            <option value="storm">Storm Tulip</option>
            <option value="rounded">Rounded Tulip</option>
            <option value="cupped-red">Cupped Red Tulip</option>
          </select>
          <HeartMessage />
        </>
      )}
    </div>
  );
}

export default App;
