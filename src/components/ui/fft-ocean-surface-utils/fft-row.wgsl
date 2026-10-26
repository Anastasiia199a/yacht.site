// Pass 1: one inverse transform per row.

@group(0) @binding(0) var<storage, read> inX: array<vec2f>;
@group(0) @binding(1) var<storage, read> inY: array<vec2f>;
@group(0) @binding(2) var<storage, read> inZ: array<vec2f>;
@group(0) @binding(3) var<storage, read_write> outX: array<vec2f>;
@group(0) @binding(4) var<storage, read_write> outY: array<vec2f>;
@group(0) @binding(5) var<storage, read_write> outZ: array<vec2f>;

var<workgroup> _vgsl_652b26b3__shX: array<vec2f, 256>;
var<workgroup> _vgsl_652b26b3__shY: array<vec2f, 256>;
var<workgroup> _vgsl_652b26b3__shZ: array<vec2f, 256>;

@compute @workgroup_size(128)
fn fftRow(
  @builtin(workgroup_id) wid: vec3u,
  @builtin(local_invocation_id) lid: vec3u,
) {
  let base = wid.x * _vgsl_824ec1f3__N;
  let t = lid.x;
  let i0 = t;
  let i1 = t + 128u;

  let r0 = _vgsl_c5f285f5__bitrev(i0);
  let r1 = _vgsl_c5f285f5__bitrev(i1);
  _vgsl_652b26b3__shX[r0] = inX[base + i0];
  _vgsl_652b26b3__shY[r0] = inY[base + i0];
  _vgsl_652b26b3__shZ[r0] = inZ[base + i0];
  _vgsl_652b26b3__shX[r1] = inX[base + i1];
  _vgsl_652b26b3__shY[r1] = inY[base + i1];
  _vgsl_652b26b3__shZ[r1] = inZ[base + i1];
  workgroupBarrier();

  _vgsl_c5f285f5__fftStages3(&_vgsl_652b26b3__shX, &_vgsl_652b26b3__shY, &_vgsl_652b26b3__shZ, t);

  let norm = 1.0 / f32(_vgsl_824ec1f3__N);
  outX[base + i0] = _vgsl_652b26b3__shX[i0] * norm;
  outY[base + i0] = _vgsl_652b26b3__shY[i0] * norm;
  outZ[base + i0] = _vgsl_652b26b3__shZ[i0] * norm;
  outX[base + i1] = _vgsl_652b26b3__shX[i1] * norm;
  outY[base + i1] = _vgsl_652b26b3__shY[i1] * norm;
  outZ[base + i1] = _vgsl_652b26b3__shZ[i1] * norm;
}

fn _vgsl_c5f285f5__cmul(a: vec2f, b: vec2f) -> vec2f {
  return vec2f(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

fn _vgsl_c5f285f5__bitrev(i: u32) -> u32 {
  return reverseBits(i) >> (32u - _vgsl_824ec1f3__LOG2N);
}

// Run one 256-point inverse FFT over three displacement fields.
fn _vgsl_c5f285f5__fftStages3(
  a: ptr<workgroup, array<vec2f, 256>>,
  b: ptr<workgroup, array<vec2f, 256>>,
  c: ptr<workgroup, array<vec2f, 256>>,
  lid: u32,
) {
  for (var s: u32 = 0u; s < _vgsl_824ec1f3__LOG2N; s = s + 1u) {
    let half = 1u << s;
    let m = half << 1u;
    if (lid < 128u) {
      let k = lid & (half - 1u);
      let base = (lid >> s) << (s + 1u);
      let i0 = base + k;
      let i1 = i0 + half;
      let ang = _vgsl_824ec1f3__TWO_PI * f32(k) / f32(m);
      let w = vec2f(cos(ang), sin(ang));

      let a0 = (*a)[i0];
      let a1 = _vgsl_c5f285f5__cmul(w, (*a)[i1]);
      (*a)[i0] = a0 + a1;
      (*a)[i1] = a0 - a1;
      let b0 = (*b)[i0];
      let b1 = _vgsl_c5f285f5__cmul(w, (*b)[i1]);
      (*b)[i0] = b0 + b1;
      (*b)[i1] = b0 - b1;
      let c0 = (*c)[i0];
      let c1 = _vgsl_c5f285f5__cmul(w, (*c)[i1]);
      (*c)[i0] = c0 + c1;
      (*c)[i1] = c0 - c1;
    }
    workgroupBarrier();
  }
}

const _vgsl_824ec1f3__TWO_PI: f32 = 6.28318530718;
const _vgsl_824ec1f3__N: u32 = 256u;
const _vgsl_824ec1f3__LOG2N: u32 = 8u;

