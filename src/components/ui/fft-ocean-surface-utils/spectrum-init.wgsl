@group(0) @binding(0) var<storage, read_write> h0: array<vec4f>;
@group(0) @binding(1) var<uniform> sim: _vgsl_824ec1f3__SimParams;

fn _vgsl_0eedc62e__uhash(x: u32) -> u32 {
  var v = x;
  v ^= v >> 16u;
  v *= 0x7feb352du;
  v ^= v >> 15u;
  v *= 0x846ca68bu;
  v ^= v >> 16u;
  return v;
}

fn _vgsl_0eedc62e__rand(seed: vec2u, salt: u32) -> f32 {
  let h = _vgsl_0eedc62e__uhash(seed.x * 1973u + seed.y * 9277u + salt * 26699u + 1u);
  return f32(h) * (1.0 / 4294967296.0);
}

fn _vgsl_0eedc62e__gauss(seed: vec2u) -> vec2f {
  let u1 = max(_vgsl_0eedc62e__rand(seed, 0u), 1e-6);
  let u2 = _vgsl_0eedc62e__rand(seed, 1u);
  let r = sqrt(-2.0 * log(u1));
  return vec2f(r * cos(_vgsl_824ec1f3__TWO_PI * u2), r * sin(_vgsl_824ec1f3__TWO_PI * u2));
}

fn _vgsl_0eedc62e__phillips(k: vec2f) -> f32 {
  let kmag = length(k);
  if (kmag < 1e-4) { return 0.0; }
  let kmag2 = kmag * kmag;
  let bigL = sim.windSpeed * sim.windSpeed / _vgsl_824ec1f3__GRAVITY;
  let khat = k / kmag;
  let kdotw = dot(khat, normalize(sim.windDir));

  var ph = sim.amplitude * exp(-1.0 / (kmag2 * bigL * bigL)) / (kmag2 * kmag2);
  ph *= kdotw * kdotw;
  let small = sim.patchSize / 2000.0;
  ph *= exp(-kmag2 * small * small);
  if (kdotw < 0.0) { ph *= 0.07; }
  return ph;
}

@compute @workgroup_size(8, 8)
fn init(@builtin(global_invocation_id) gid: vec3u) {
  let x = gid.x;
  let z = gid.y;
  if (x >= _vgsl_824ec1f3__N || z >= _vgsl_824ec1f3__N) { return; }
  let idx = z * _vgsl_824ec1f3__N + x;

  let nx = f32(i32(x) - i32(_vgsl_824ec1f3__N) / 2);
  let nz = f32(i32(z) - i32(_vgsl_824ec1f3__N) / 2);
  let k = _vgsl_824ec1f3__TWO_PI * vec2f(nx, nz) / sim.patchSize;

  let phK = _vgsl_0eedc62e__phillips(k);
  let phMK = _vgsl_0eedc62e__phillips(-k);

  let h0k = sqrt(phK * 0.5) * _vgsl_0eedc62e__gauss(vec2u(x, z));
  let mx = (_vgsl_824ec1f3__N - x) % _vgsl_824ec1f3__N;
  let mz = (_vgsl_824ec1f3__N - z) % _vgsl_824ec1f3__N;
  let h0mk = sqrt(phMK * 0.5) * _vgsl_0eedc62e__gauss(vec2u(mx, mz));

  h0[idx] = vec4f(h0k, vec2f(h0mk.x, -h0mk.y));
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
