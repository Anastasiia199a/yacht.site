// Tone-map the HDR scene to a canvas. The same shader runs twice:
// foreground = 0 gives the opaque backdrop, foreground = 1 keeps only water
// nearer than the focus plane, premultiplied, for the sheet above the headline.

struct Post {
  sunScreen: vec2f,
  time: f32,
  underwater: f32,
  aspect: f32,
  foreground: f32,
  focus: f32,
}

@group(0) @binding(0) var src: texture_2d<f32>;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var<uniform> post: Post;

fn aces(x: vec3f) -> vec3f {
  let a = 2.51;
  let b = 0.03;
  let c = 2.43;
  let d = 0.59;
  let e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), vec3f(0.0), vec3f(1.0));
}

fn hash21(p: vec2f) -> f32 {
  var q = fract(p * vec2f(123.34, 456.21));
  q += dot(q, q + 45.32);
  return fract(q.x * q.y);
}

const EXPOSURE = 0.62;

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let w = post.underwater;
  let wobble = vec2f(
    sin(uv.y * 24.0 + post.time * 1.7) * 0.0030,
    cos(uv.x * 19.0 + post.time * 1.3) * 0.0026,
  ) * w;

  // Exposure drops, red goes first, blue survives.
  let scene = textureSampleLevel(src, samp, uv + wobble, 0.0);
  let hdr = scene.rgb * EXPOSURE * (1.0 - 0.16 * w);
  var col = pow(aces(hdr), vec3f(1.0 / 2.2));

  col = (col - 0.5) * 1.07 + 0.5;
  col *= vec3f(1.05, 1.0, 0.95);
  col = mix(col, col * vec3f(0.34, 0.80, 1.0), w);
  col *= 1.0 - (0.28 + 0.50 * w) * dot(uv - 0.5, uv - 0.5);

  if (w > 0.002) {
    // Light shafts fanning from the sun's screen position; two frequencies keep them alive.
    let toSun = (uv - post.sunScreen) * vec2f(post.aspect, 1.0);
    let ang = atan2(toSun.y, toSun.x);
    let fan = (sin(ang * 13.0 + post.time * 0.30) * 0.5 + 0.5)
      * (sin(ang * 6.0 - post.time * 0.19) * 0.5 + 0.5);
    let reach = exp(-length(toSun) * 1.9) * smoothstep(0.0, 0.35, uv.y);
    col += vec3f(0.22, 0.50, 0.72) * fan * reach * w * 0.75;

    // Sparse motes drifting up past the lens, jittered across the whole cell.
    let sp = uv * vec2f(post.aspect, 1.0) * 38.0 + vec2f(0.0, -post.time * 0.08);
    let cell = floor(sp);
    let seed = hash21(cell);
    let jitter = vec2f(fract(seed * 17.31), fract(seed * 53.77)) - 0.5;
    let size = 0.035 + fract(seed * 7.13) * 0.055;
    let mote = smoothstep(size, 0.0, length(fract(sp) - 0.5 - jitter * 0.92));
    col += vec3f(0.60, 0.79, 0.87) * mote * step(0.935, fract(seed * 91.7)) * w * 0.6;
  }

  col = clamp(col, vec3f(0.0), vec3f(1.0));

  // Zero focus switches the sheet off: everything is farther than the plane.
  let near = 1.0 - smoothstep(post.focus, max(post.focus * 1.34, post.focus + 1e-3), scene.a);
  let a = mix(1.0, near, post.foreground);
  return vec4f(col * a, a);
}
