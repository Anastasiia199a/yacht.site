import type { OceanFrame } from "@/components/ui/fft-ocean-surface";

// One continuous shot: descent from altitude, dive, water column, surfacing, calm.
// Columns: p, camera, look, fov, wave height, swell, foam, sun elevation, azimuth, time speed.
type Key = [number, [number, number, number], [number, number, number], number, number, number, number, number, number, number];

const KEYS: Key[] = [
  [0.000, [0, 118, 236], [0, 0, 0], 42, 31, 11, 0.34, 4.0, 232, 0.85],
  [0.050, [0, 78, 176], [0, 2, 0], 44, 34, 12, 0.42, 3.4, 233, 0.95],
  [0.095, [0, 44, 118], [0, 6, 0], 47, 44, 17, 0.58, 2.6, 235, 1.08],
  [0.140, [0, 13, 64], [0, 12, 0], 51, 56, 21, 0.70, 1.8, 237, 1.22],
  [0.185, [0, 4, 32], [0, 7, 0], 57, 63, 23, 0.74, 1.4, 239, 1.32],
  [0.250, [0, -16, 36], [0, -2, 0], 62, 44, 17, 0.54, 3.4, 245, 1.10],
  [0.390, [0, -30, 30], [0, 2, 0], 60, 32, 13, 0.42, 5.0, 252, 0.90],
  [0.580, [0, -20, 22], [0, 8, 0], 58, 24, 10, 0.32, 6.6, 258, 0.80],
  [0.760, [0, 3, 46], [0, 7, 0], 52, 15, 6, 0.22, 8.6, 263, 0.60],
  [0.885, [0, 14, 84], [0, 5, 0], 48, 7, 3, 0.14, 11.0, 267, 0.44],
  [1.000, [0, 22, 126], [0, 4, 0], 46, 3, 1.5, 0.08, 13.0, 270, 0.30],
];

// Focus plane of the water sheet over the headline; zero turns the sheet off.
const FOCUS: [number, number][] = [
  [0.000, 196], [0.050, 108], [0.095, 52], [0.140, 56], [0.185, 32],
  [0.250, 0], [0.580, 0], [0.760, 16], [0.885, 0], [1.000, 0],
];

/**
 * Monotone cubic (Fritsch–Carlson) through non-uniform knots: smooth through
 * every key, never overshoots, so the camera cannot dip below a key height.
 */
function monotone(xs: number[], ys: number[]): (x: number) => number {
  const n = xs.length;
  const h: number[] = [];
  const d: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    h.push(xs[i + 1] - xs[i]);
    d.push((ys[i + 1] - ys[i]) / h[i]);
  }
  const m = new Array<number>(n);
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) {
    if (d[i - 1] * d[i] <= 0) m[i] = 0;
    else {
      const w1 = 2 * h[i] + h[i - 1];
      const w2 = h[i] + 2 * h[i - 1];
      m[i] = (w1 + w2) / (w1 / d[i - 1] + w2 / d[i]);
    }
  }
  return (x) => {
    if (x <= xs[0]) return ys[0];
    if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0;
    while (x > xs[i + 1]) i++;
    const t = (x - xs[i]) / h[i];
    const t2 = t * t;
    const t3 = t2 * t;
    return (
      (2 * t3 - 3 * t2 + 1) * ys[i] +
      (t3 - 2 * t2 + t) * h[i] * m[i] +
      (-2 * t3 + 3 * t2) * ys[i + 1] +
      (t3 - t2) * h[i] * m[i + 1]
    );
  };
}

const ps = KEYS.map((k) => k[0]);
const channel = (pick: (k: Key) => number) => monotone(ps, KEYS.map(pick));
const curves = {
  py: channel((k) => k[1][1]),
  pz: channel((k) => k[1][2]),
  ty: channel((k) => k[2][1]),
  fov: channel((k) => k[3]),
  height: channel((k) => k[4]),
  swell: channel((k) => k[5]),
  foam: channel((k) => k[6]),
  sunEl: channel((k) => k[7]),
  sunAz: channel((k) => k[8]),
  speed: channel((k) => k[9]),
  focus: monotone(FOCUS.map((f) => f[0]), FOCUS.map((f) => f[1])),
};

export const WAVE_MAX = 63;
export const WAVE_MIN = 3;

export function sampleScript(p: number): OceanFrame {
  return {
    position: [0, curves.py(p), curves.pz(p)],
    target: [0, curves.ty(p), 0],
    fov: curves.fov(p),
    heightScale: curves.height(p),
    choppyScale: curves.swell(p),
    foamScale: curves.foam(p),
    sunElevation: curves.sunEl(p),
    sunAzimuth: curves.sunAz(p),
    timeScale: curves.speed(p),
    focus: Math.max(0, curves.focus(p)),
  };
}
