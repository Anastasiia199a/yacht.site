import { skyColor } from "./sky.wgsl";

// An inside-out sphere centered on the camera. Alpha carries a far "distance"
// so the composite never treats the sky as foreground.

struct Sky {
  viewProj: mat4x4f,
  camPos: vec3f,
  radius: f32,
  sunDir: vec3f,
  underwater: f32,
}

@group(0) @binding(0) var<uniform> u: Sky;

struct VOut {
  @builtin(position) clip: vec4f,
  @location(0) dir: vec3f,
}

@vertex fn vs_main(@location(0) position: vec3f) -> VOut {
  var o: VOut;
  let world = position * u.radius + u.camPos;
  o.clip = u.viewProj * vec4f(world, 1.0);
  o.dir = normalize(position);
  return o;
}

@fragment fn fs_main(@location(0) dir: vec3f) -> @location(0) vec4f {
  let d = normalize(dir);
  let sky = skyColor(d, u.sunDir);

  let lit = smoothstep(-0.55, 0.85, d.y);
  var below = mix(vec3f(0.002, 0.013, 0.026), vec3f(0.028, 0.185, 0.255), lit);
  below += vec3f(0.10, 0.22, 0.24) * pow(max(dot(d, normalize(u.sunDir)), 0.0), 8.0);

  return vec4f(mix(sky, below, u.underwater), 1.0e4);
}
