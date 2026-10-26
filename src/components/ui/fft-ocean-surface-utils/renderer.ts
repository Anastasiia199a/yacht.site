import { clock, frameLoop, init, surface, type Gpu, type Surface } from "vgpu";

import { directionToScreen, viewProjection, type Vec3 } from "./camera";
import { buildOcean, OCEAN_CAMERA, type OceanScene } from "./scene";

/** Everything the page may drive per frame. Wind, amplitude and patch size stay fixed. */
export interface OceanFrame {
  readonly position: Vec3;
  readonly target: Vec3;
  readonly fov: number;
  /** Wave height. */
  readonly heightScale: number;
  /** Swell (horizontal choppiness). */
  readonly choppyScale: number;
  readonly foamScale: number;
  readonly sunElevation: number;
  readonly sunAzimuth: number;
  readonly timeScale: number;
  /** Distance below which water is lifted over the page; 0 disables the sheet. */
  readonly focus: number;
}

export const DEFAULT_FRAME: OceanFrame = {
  position: OCEAN_CAMERA.position,
  target: OCEAN_CAMERA.target,
  fov: OCEAN_CAMERA.fov,
  heightScale: 34,
  choppyScale: 14,
  foamScale: 0.5,
  sunElevation: 6.5,
  sunAzimuth: 236,
  timeScale: 1,
  focus: 0,
};

interface RendererOptions {
  /** Opaque backdrop. */
  readonly canvas: HTMLCanvasElement;
  /** Transparent sheet of near water drawn over the page. */
  readonly foreground?: HTMLCanvasElement;
  readonly getFrame?: () => OceanFrame;
  /** Halves the water grid and caps pixel density at 1.5. */
  readonly lowPower?: boolean;
}

export function underwaterAt(cameraHeight: number): number {
  const t = Math.min(1, Math.max(0, (cameraHeight + 2.5) / 6));
  return 1 - t * t * (3 - 2 * t);
}

export function createRenderer({
  canvas,
  foreground,
  getFrame = () => DEFAULT_FRAME,
  lowPower = false,
}: RendererOptions) {
  let disposed = false;
  let failed = false;
  let gpu: Gpu | undefined;
  let output: Surface | undefined;
  let sheet: Surface | undefined;
  let scene: OceanScene | undefined;
  let loop: { stop(): void } | undefined;
  let unsubscribeResize: (() => void) | undefined;
  const viewProj = new Float32Array(16);

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    runCleanups([
      () => loop?.stop(),
      () => unsubscribeResize?.(),
      () => gpu?.dispose(),
    ]);
  }

  function fail(error: unknown): never {
    failed = true;
    try {
      dispose();
    } catch {
      // Teardown must not replace the render, resize, or initialization error.
    }
    throw error;
  }

  function guard<T>(action: () => T): T {
    try {
      return action();
    } catch (error) {
      return fail(error);
    }
  }

  const initialize = async () => {
    if (typeof navigator === "undefined" || !("gpu" in navigator)) {
      throw new Error("WebGPU is not available");
    }
    if (disposed) return;
    const nextGpu = await init();
    if (disposed) {
      nextGpu.dispose();
      return;
    }

    gpu = nextGpu;
    const dpr: [number, number] = lowPower ? [1, 1.5] : [1, 2];
    output = surface(gpu, canvas, { dpr });
    if (foreground) {
      sheet = surface(gpu, foreground, {
        dpr,
        alphaMode: "premultiplied",
        clearColor: [0, 0, 0, 0],
      });
    }
    scene = buildOcean(gpu, output.size, { grid: lowPower ? 256 : 512 });
    unsubscribeResize = output.onResize(() =>
      guard(() => {
        if (scene && output) scene.resize(output.size);
      })
    );

    const time = clock(gpu);
    let elapsed = 0;
    loop = frameLoop(gpu, (currentFrame) => {
      guard(() => {
        if (disposed || !output || !scene) return;
        const dt = Math.min(time.deltaTime, 0.1);
        elapsed += dt;
        const f = getFrame();
        const p = scene.params;
        p.heightScale = f.heightScale;
        p.choppyScale = f.choppyScale;
        p.foamScale = f.foamScale;
        p.sunElevation = f.sunElevation;
        p.sunAzimuth = f.sunAzimuth;
        p.timeScale = f.timeScale;

        const aspect = output.size[0] / output.size[1];
        viewProjection(
          f.position,
          f.target,
          f.fov,
          aspect,
          OCEAN_CAMERA.near,
          OCEAN_CAMERA.far,
          viewProj
        );
        const underwater = underwaterAt(f.position[1]);
        const post = {
          sunScreen: directionToScreen(viewProj, scene.sunDir()),
          time: elapsed,
          underwater,
          aspect,
          focus: f.focus,
        };

        scene.simulate(dt);
        scene.updateCamera(viewProj, f.position, underwater);
        currentFrame.pass({ target: scene.hdr, clear: scene.clear }, (pass) => {
          pass.draw(scene!.skydome);
          pass.draw(scene!.ocean);
        });
        scene.composite.back.set({ post: { ...post, foreground: 0 } });
        currentFrame.pass(output, scene.composite.back);
        if (sheet) {
          scene.composite.front.set({ post: { ...post, foreground: 1 } });
          currentFrame.pass(
            { target: sheet, clear: [0, 0, 0, 0] },
            scene.composite.front
          );
        }
      });
    });
  };

  const ready = initialize().catch((error: unknown) => {
    if (disposed && !failed) return;
    fail(error);
  });

  return { ready, dispose };
}

function runCleanups(cleanups: readonly (() => void)[]): void {
  const errors: unknown[] = [];
  for (const cleanup of cleanups) {
    try {
      cleanup();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) throw errors[0];
}
