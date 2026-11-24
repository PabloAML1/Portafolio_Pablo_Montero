export const fullscreenVertex = `#version 300 es
out vec2 uv;
void main() {
  uv = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);
}`;

const header = `#version 300 es
precision highp float;
in vec2 uv;
out vec4 color;
`;

const linearSample = `
vec2 velocityAt(sampler2D source, vec2 point) {
  vec2 size = vec2(textureSize(source, 0));
  vec2 texel = point * size - 0.5;
  vec2 cell = floor(texel);
  vec2 fraction = fract(texel);
  vec2 a = (cell + 0.5) / size;
  vec2 d = 1.0 / size;
  vec2 bottom = mix(texture(source, a).xy, texture(source, a + vec2(d.x, 0.0)).xy, fraction.x);
  vec2 top = mix(texture(source, a + vec2(0.0, d.y)).xy, texture(source, a + d).xy, fraction.x);
  return mix(bottom, top, fraction.y);
}
`;

export const advect = header + linearSample + `
uniform sampler2D velocity;
uniform vec2 ratio;
uniform float dt;
void main() {
  vec2 a = velocityAt(velocity, uv);
  vec2 backward = uv - a * dt * ratio;
  vec2 forward = backward + velocityAt(velocity, backward) * dt * ratio;
  vec2 corrected = uv - (forward - uv) * 0.5;
  vec2 source = corrected - velocityAt(velocity, corrected) * dt * ratio;
  color = vec4(velocityAt(velocity, source) * 0.96, 0.0, 0.0);
}`;

export const splat = header + `
uniform vec2 center;
uniform vec2 radius;
uniform vec2 force;
void main() {
  float falloff = 1.0 - min(length((uv - center) / radius), 1.0);
  color = vec4(force * falloff * falloff, 0.0, 0.0);
}`;

export const divergence = header + linearSample + `
uniform sampler2D velocity;
uniform vec2 cell;
uniform float dt;
void main() {
  float l = velocityAt(velocity, uv - vec2(cell.x, 0.0)).x;
  float r = velocityAt(velocity, uv + vec2(cell.x, 0.0)).x;
  float d = velocityAt(velocity, uv - vec2(0.0, cell.y)).y;
  float u = velocityAt(velocity, uv + vec2(0.0, cell.y)).y;
  color = vec4((r - l + u - d) * 0.5 / dt, 0.0, 0.0, 0.0);
}`;

const pressureSamples = `
uniform sampler2D pressure;
uniform vec2 cell;
vec4 neighbors(vec2 distance) {
  return vec4(
    velocityAt(pressure, uv - vec2(distance.x, 0.0)).r,
    velocityAt(pressure, uv + vec2(distance.x, 0.0)).r,
    velocityAt(pressure, uv - vec2(0.0, distance.y)).r,
    velocityAt(pressure, uv + vec2(0.0, distance.y)).r
  );
}
`;

export const poisson = header + linearSample + pressureSamples + `
uniform sampler2D divergence;
void main() {
  color = vec4(dot(neighbors(cell * 2.0), vec4(0.2)) - texture(divergence, uv).r, 0.0, 0.0, 0.0);
}`;

export const project = header + linearSample + pressureSamples + `
uniform sampler2D velocity;
uniform float dt;
void main() {
  vec4 p = neighbors(cell);
  vec2 gradient = vec2(p.y - p.x, p.w - p.z) * 0.5;
  color = vec4(texture(velocity, uv).xy - gradient * dt, 0.0, 0.0);
}`;

export const compose = header + linearSample + `
uniform sampler2D velocity;
uniform sampler2D photo;
uniform sampler2D marble;
uniform vec2 frame;
uniform vec2 pointer;
uniform vec4 photoPlane;
uniform vec4 marblePlane;
uniform float fullReveal;

vec4 portraitAt(sampler2D image, vec4 plane, vec2 position) {
  vec2 point = (position - plane.xy) / plane.zw + 0.5;
  vec4 pixel = texture(image, clamp(point, 0.0, 1.0));
  vec2 inside = step(vec2(0.0), point) * step(point, vec2(1.0));
  pixel.a *= inside.x * inside.y;
  return vec4(pixel.rgb * pixel.a, pixel.a);
}

void main() {
  vec2 v = velocityAt(velocity, uv);
  vec3 field = mix(vec3(1.0), vec3(v * 0.5 + 0.5, 1.0), length(v));
  float fluidMask = smoothstep(0.085, 0.115, 1.0 - field.r);
  float wave = uv.y + sin(uv.x * 3.14159265) * sin(fullReveal * 3.14159265) * 0.2;
  float wipe = smoothstep(1.0 - fullReveal - 0.018, 1.0 - fullReveal + 0.018, wave);
  if (fullReveal <= 0.0) wipe = 0.0;
  if (fullReveal >= 1.0) wipe = 1.0;
  float mask = max(fluidMask, wipe);
  vec2 subject = (uv + (pointer - 0.5) * 0.008 * (1.0 - fullReveal)) * frame;
  vec4 image = mix(portraitAt(photo, photoPlane, subject), portraitAt(marble, marblePlane, subject), mask);
  float tint = 0.027 * mask * (1.0 - image.a) * (1.0 - smoothstep(0.2, 0.65, length(uv - vec2(0.5, 0.55))));
  color = image + vec4(vec3(0.65, 0.49, 0.35) * tint, tint);
}`;
