@group(0) @binding(0) var<storage, read> h0: array<vec4f>;
@group(0) @binding(1) var<storage, read_write> specX: array<vec2f>;
@group(0) @binding(2) var<storage, read_write> specY: array<vec2f>;
@group(0) @binding(3) var<storage, read_write> specZ: array<vec2f>;
@group(0) @binding(4) var<uniform> sim: _vgsl_824ec1f3__SimParams;

fn _vgsl_8bfabbf2__cmul(a: vec2f, b: vec2f) -> vec2f {
  return vec2f(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

fn _vgsl_8bfabbf2__cexp(theta: f32) -> vec2f {
  return vec2f(cos(theta), sin(theta));
}

@compute @workgroup_size(8, 8)
fn update(@builtin(global_invocation_id) gid: vec3u) {
  let x = gid.x;
  let z = gid.y;
  if (x >= _vgsl_824ec1f3__N || z >= _vgsl_824ec1f3__N) { return; }
  let idx = z * _vgsl_824ec1f3__N + x;

  let nx = f32(i32(x) - i32(_vgsl_824ec1f3__N) / 2);
  let nz = f32(i32(z) - i32(_vgsl_824ec1f3__N) / 2);
  let k = _vgsl_824ec1f3__TWO_PI * vec2f(nx, nz) / sim.patchSize;
  let kmag = length(k);

  let pair = h0[idx];
  let ex = pair.xy;
  let emk = pair.zw;

  let w = sqrt(_vgsl_824ec1f3__GRAVITY * kmag);
  let e = _vgsl_8bfabbf2__cexp(w * sim.time);
  let ec = vec2f(e.x, -e.y);
  let htilde = _vgsl_8bfabbf2__cmul(ex, e) + _vgsl_8bfabbf2__cmul(emk, ec);

  specY[idx] = htilde;

  let khat = select(vec2f(0.0), k / kmag, kmag > 1e-6);
  let nih = vec2f(htilde.y, -htilde.x);
  specX[idx] = nih * khat.x;
  specZ[idx] = nih * khat.y;
}

const _vgsl_824ec1f3__TWO_PI: f32 = 6.28318530718;
const _vgsl_824ec1f3__N: u32 = 256u;

const _vgsl_824ec1f3__GRAVITY: f32 = 9.81;

struct _vgsl_824ec1f3__SimParams {
  windDir: vec2f,
  windSpeed: f32,
  amplitude: f32,
  patchSize: f32,
  time: f32,
  _pad: vec2f,
}
