import { useEffect, useRef, useState } from "react";

import {
  createRenderer,
  DEFAULT_FRAME,
  type OceanFrame,
} from "./fft-ocean-surface-utils/renderer";

export type { OceanFrame } from "./fft-ocean-surface-utils/renderer";

interface OceanSurfaceProps {
  /** Read every frame; drives camera, waves and sun. */
  getFrame?: () => OceanFrame;
  /** Halves the grid and caps pixel density, for phones. */
  lowPower?: boolean;
  /** Called once if the browser cannot run WebGPU or the renderer fails. */
  onUnsupported?: (error: unknown) => void;
}

/**
 * Full-screen decorative ocean. Two fixed canvases: the opaque scene under the
 * page (z -10) and a transparent sheet of near water over it (z 15). Neither
 * takes pointer input; the page scrolls above them.
 */
export function OceanSurface({ getFrame, lowPower, onUnsupported }: OceanSurfaceProps) {
  const backRef = useRef<HTMLCanvasElement>(null);
  const frontRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(getFrame);
  const failRef = useRef(onUnsupported);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    frameRef.current = getFrame;
    failRef.current = onUnsupported;
  });

  useEffect(() => {
    const canvas = backRef.current;
    const foreground = frontRef.current;
    if (!canvas || !foreground) return;
    const renderer = createRenderer({
      canvas,
      foreground,
      lowPower,
      getFrame: () => frameRef.current?.() ?? DEFAULT_FRAME,
    });
    renderer.ready.catch((error: unknown) => {
      console.warn("Ocean disabled, falling back to a flat backdrop:", error);
      setFailed(true);
      failRef.current?.(error);
    });
    return () => {
      try {
        renderer.dispose();
      } catch {
        // Already torn down by a failure.
      }
    };
  }, [lowPower]);

  if (failed) return null;
  return (
    <>
      <canvas
        ref={backRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 block h-full w-full"
      />
      <canvas
        ref={frontRef}
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[15] block h-full w-full"
      />
    </>
  );
}

export default OceanSurface;
