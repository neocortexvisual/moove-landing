#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

varying vec2 v_uv;
uniform vec2 u_size;
uniform vec2 u_pointer;
uniform vec2 u_velocity;
uniform float u_presence;
uniform float u_mobile;
uniform float u_opening;

float gaussian(float x) {
  return exp(-x * x);
}

float noise(float index) {
  return fract(sin(index * 41.83 + 6.7) * 437.58);
}

vec3 lightField(vec2 p) {
  float x = p.x;
  float primaryY = 0.71 - 0.49 * smoothstep(0.37, 1.02, x)
    + 0.043 * sin(14.0 * x + 1.0);
  float lowerY = 0.81 + 0.10 * sin(10.0 * x - 1.8);
  float crossingY = 1.20 - 0.69 * x + 0.055 * sin(17.0 * x);
  float primary = p.y - primaryY;
  float lower = p.y - lowerY;
  float crossing = p.y - crossingY;
  float hotspot = gaussian((x - 0.82) / 0.19);
  float lowerSpot = gaussian((x - 0.64) / 0.24);
  float markGlow = gaussian((x - 0.76) / 0.25) * gaussian((p.y - 0.50) / 0.39);

  vec3 light = vec3(0.007, 0.018, 0.083);
  light += vec3(0.012, 0.062, 0.31) * gaussian(primary / 0.25);
  light += vec3(0.005, 0.17, 0.67) * gaussian(primary / 0.115);
  light += vec3(0.038, 0.45, 0.46) * gaussian(primary / 0.063) * hotspot;
  light += vec3(0.003, 0.068, 0.31) * gaussian(lower / 0.19);
  light += vec3(0.011, 0.24, 0.73) * gaussian(lower / 0.088) * lowerSpot;
  light += vec3(0.009, 0.098, 0.46) * gaussian(crossing / 0.101);
  light += vec3(0.008, 0.043, 0.31) * markGlow;
  return light;
}

// Work in CSS pixels so the lens and its wake keep their size at any pixel density.
vec2 lens(vec2 uv, float textZone) {
  float radius = clamp(u_size.x * 0.106, 78.0, 240.0);
  vec2 delta = (uv - u_pointer) * u_size / radius;
  vec2 motionVector = u_velocity * 0.001;
  float speed = length(motionVector);
  float motion = smoothstep(0.022, 0.98, speed);
  vec2 direction = motionVector / max(speed, 0.001);
  float along = dot(delta, direction);
  vec2 across = delta - along * direction;

  float near = exp(-2.15 * dot(delta, delta));
  float trailAlong = (along + motion * 0.58) / (0.68 + motion * 0.55);
  float trail = gaussian(trailAlong) * exp(-4.8 * dot(across, across));
  float influence = u_presence * mix(1.0, 0.14, textZone) * (0.74 * near + 0.40 * motion * trail);
  float shear = clamp(delta.x, -1.0, 1.0) * 0.74 + direction.x * motion * 0.67;
  return vec2(influence, shear);
}

void main() {
  vec2 uv = v_uv;
  float textZone = mix(1.0 - smoothstep(0.32, 0.61, uv.x), smoothstep(0.27, 0.45, uv.y), u_mobile);
  float axis = mix(uv.x + (uv.y - 0.5) * 0.08, 1.0 - uv.y + (uv.x - 0.5) * 0.08, u_mobile);
  float sweepDistance = axis - mix(-0.19, 1.19, u_opening);
  float revealed = 1.0 - smoothstep(-0.18, 0.09, sweepDistance);
  float pulse = gaussian(sweepDistance / 0.091);
  float wake = gaussian((sweepDistance + 0.095) / 0.16);
  float sweep = (pulse + 0.24 * wake) * smoothstep(0.0, 0.13, u_opening)
    * (1.0 - smoothstep(0.79, 1.0, u_opening));

  float ribWidth = clamp(u_size.x / 37.0, 16.0, 58.0);
  float pitch = ribWidth / u_size.x;
  float cell = uv.x / pitch;
  float index = floor(cell);
  float face = fract(cell);
  float stagger = noise(index);
  float flicker = noise(index + 18.0);

  // The profile and seams are defined in screen space; only the light is refracted.
  float lightX = mix(uv.x + (1.0 - u_opening) * 0.13, 0.38 + uv.x * 0.62, u_mobile);
  vec2 samplePoint = vec2(
    lightX + pitch * ((0.5 - face) * 0.71 + (stagger - 0.5) * 0.91),
    uv.y + (flicker - 0.5) * 0.039
  );

  vec3 light;
  vec2 refraction = lens(uv, textZone);
  if (refraction.x > 0.002) {
    samplePoint.x += pitch * refraction.x * ((stagger - 0.5) * 3.3 + refraction.y);
    float blur = pitch * refraction.x * 1.55;
    light = 0.46 * lightField(samplePoint)
      + 0.27 * lightField(samplePoint - vec2(blur, 0.0))
      + 0.27 * lightField(samplePoint + vec2(blur, 0.0));
  } else {
    light = lightField(samplePoint);
  }

  float seam = exp(-face * 17.0);
  float shoulder = exp(-face * 4.2);
  float opposite = exp(-(1.0 - face) * 28.0);
  float modulation = mix(0.73, 1.14, stagger);
  vec3 glass = light * (0.63 + 0.35 * shoulder) * modulation;
  glass += seam * (vec3(0.004, 0.052, 0.17) + light * vec3(0.54, 0.89, 0.61));
  glass += opposite * light * 0.10;
  glass += light * refraction.x * 0.13;

  vec3 shadedGlass = vec3(0.009, 0.014, 0.034)
    + glass * vec3(0.11, 0.12, 0.17) + seam * vec3(0.004, 0.006, 0.017);
  vec3 haze = mix(glass, shadedGlass, textZone * revealed);
  haze += vec3(0.016, 0.21, 0.66) * sweep * (0.55 + 0.45 * seam);
  gl_FragColor = vec4(clamp(haze, 0.0, 1.0), 1.0);
}
