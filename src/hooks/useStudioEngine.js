import { useEffect, useRef, useState } from "react";
import { createStudioEngine } from "../studio/StudioEngine.js";
import { normalizeSnowflakeOptions } from "../snowflake/options.js";

/**
 * Mounts the imperative Studio engine against the given DOM refs and mirrors its
 * status/history/options/save state into React state. Returns an imperative
 * `engineRef` so toolbar buttons can drive the engine.
 */
export function useStudioEngine({ foldedHostRef, unfoldedHostRef, backgroundCanvasRef }) {
  const engineRef = useRef(null);
  const [status, setStatus] = useState("Ready");
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [options, setOptions] = useState(() => normalizeSnowflakeOptions(null));
  const [canSave, setCanSave] = useState(false);

  useEffect(() => {
    const engine = createStudioEngine({
      foldedHost: foldedHostRef.current,
      unfoldedHost: unfoldedHostRef.current,
      backgroundCanvas: backgroundCanvasRef.current,
      onStatus: setStatus,
      onHistory: setHistory,
      onOptions: setOptions,
      onCanSave: setCanSave
    });
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
    // Refs are stable; the engine is created once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { engineRef, status, setStatus, history, options, canSave };
}
