import { useEffect, useRef, useState } from "react";
import { useProgress } from "@react-three/drei";

type SunLoaderProps = {
  canvasReady?: boolean;
  minDurationMs?: number;
  onComplete?: () => void;
};

export default function SunLoader({
  canvasReady = false,
  minDurationMs = 450,
  onComplete,
}: SunLoaderProps) {
  const { active, progress } = useProgress();
  const [showLoader, setShowLoader] = useState(true);
  const startTimeRef = useRef(Date.now());
  const hasProgressRef = useRef(false);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (active || progress > 0) {
      hasProgressRef.current = true;
    }
  }, [active, progress]);

  useEffect(() => {
    if (active) {
      setShowLoader(true);
      return;
    }

    if (!canvasReady) {
      return;
    }

    const finishedLoading =
      progress === 100 || (progress === 0 && !hasProgressRef.current);

    if (!finishedLoading) {
      return;
    }

    const elapsed = Date.now() - startTimeRef.current;
    const delay = Math.max(0, minDurationMs - elapsed);
    const timeoutId = window.setTimeout(() => {
      setShowLoader(false);
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true;
        onComplete?.();
      }
    }, delay);

    return () => window.clearTimeout(timeoutId);
  }, [active, canvasReady, minDurationMs, onComplete, progress]);

  return (
    <div
      className={`sun-loader-overlay${showLoader ? " is-active" : ""}`}
      aria-hidden={!showLoader}
    >
      <div className="sun-loader" role="status" aria-label="Loading scene">
        <div className="sun-loader__rays" />
        <div className="sun-loader__disc" />
        <div className="sun-loader__core" />
      </div>
    </div>
  );
}
