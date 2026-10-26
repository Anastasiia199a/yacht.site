export type Vec3 = readonly [number, number, number];

const DEG = Math.PI / 180;

/** Column-major view-projection for WebGPU clip space (depth 0..1). */
export function viewProjection(
  eye: Vec3,
  target: Vec3,
  fovDeg: number,
  aspect: number,
  near: number,
  far: number,
  out = new Float32Array(16)
): Float32Array {
  let zx = eye[0] - target[0];
  let zy = eye[1] - target[1];
  let zz = eye[2] - target[2];
  const zl = Math.hypot(zx, zy, zz) || 1;
  zx /= zl;
  zy /= zl;
  zz /= zl;
  // x = up × z with up = +Y
  let xx = zz;
  let xz = -zx;
  const xl = Math.hypot(xx, xz) || 1;
  xx /= xl;
  xz /= xl;
  const yx = zy * xz;
  const yy = zz * xx - zx * xz;
  const yz = -zy * xx;

  const tx = -(xx * eye[0] + xz * eye[2]);
  const ty = -(yx * eye[0] + yy * eye[1] + yz * eye[2]);
  const tz = -(zx * eye[0] + zy * eye[1] + zz * eye[2]);

  const f = 1 / Math.tan((fovDeg * DEG) / 2);
  const p0 = f / aspect;
  const p5 = f;
  const p10 = far / (near - far);
  const p14 = (near * far) / (near - far);

  // proj * view, with view rows (x, y, z) and translation (tx, ty, tz)
  out[0] = p0 * xx;
  out[1] = p5 * yx;
  out[2] = p10 * zx;
  out[3] = -zx;
  out[4] = 0;
  out[5] = p5 * yy;
  out[6] = p10 * zy;
  out[7] = -zy;
  out[8] = p0 * xz;
  out[9] = p5 * yz;
  out[10] = p10 * zz;
  out[11] = -zz;
  out[12] = p0 * tx;
  out[13] = p5 * ty;
  out[14] = p10 * tz + p14;
  out[15] = -tz;
  return out;
}

/** Screen position (uv, y down) of a direction; w = 0, only the direction matters. */
export function directionToScreen(m: Float32Array, dir: Vec3): [number, number] {
  const cx = m[0] * dir[0] + m[4] * dir[1] + m[8] * dir[2];
  const cy = m[1] * dir[0] + m[5] * dir[1] + m[9] * dir[2];
  const cw = m[3] * dir[0] + m[7] * dir[1] + m[11] * dir[2];
  if (cw <= 1e-4) return [0.5, -4];
  return [0.5 + (cx / cw) * 0.5, 0.5 - (cy / cw) * 0.5];
}

export function sunDirection(elevationDeg: number, azimuthDeg: number): Vec3 {
  const el = elevationDeg * DEG;
  const az = azimuthDeg * DEG;
  return [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)];
}
