import * as THREE from 'three';

export type ColorMode =
  | 'rainbow curvature-like bands'
  | 'radial rainbow bands'
  | 'normal-based coloring'
  | 'monochrome porcelain/glass'
  | 'metallic white/gold rim emphasis';

export const colorModes: ColorMode[] = [
  'rainbow curvature-like bands',
  'radial rainbow bands',
  'normal-based coloring',
  'monochrome porcelain/glass',
  'metallic white/gold rim emphasis',
];

const vertexShader = /* glsl */ `
  attribute float surfaceRadius;
  attribute float surfaceGradient;

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying float vRadius;
  varying float vGradient;

  uniform float uTime;
  uniform float uWobble;
  uniform float uWobbleSpeed;
  uniform float uWobbleScale;
  uniform float uBreathing;
  uniform float uTwist;
  uniform float uSurfaceThickness;

  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vRadius = surfaceRadius;
    vGradient = surfaceGradient;

    float t = uTime * uWobbleSpeed;
    float wave = sin(t + length(position) * uWobbleScale);
    wave += 0.45 * sin(t * 0.73 + dot(position, vec3(1.7, -0.8, 1.1)) * uWobbleScale * 0.72);
    vec3 p = position + normal * (uSurfaceThickness * 0.65 + wave * uWobble);
    p *= 1.0 + sin(t * 0.58) * uBreathing;

    float twistAngle = p.z * uTwist * sin(t * 0.37);
    float c = cos(twistAngle);
    float s = sin(twistAngle);
    p.xy = mat2(c, -s, s, c) * p.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec3 vPosition;
  varying vec3 vNormal;
  varying float vRadius;
  varying float vGradient;

  uniform int uColorMode;
  uniform float uTime;
  uniform float uRimStrength;
  uniform vec3 uCameraPosition;

  vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
  }

  vec3 palette(float t) {
    float hue = fract(t);
    return hsv2rgb(vec3(hue, 0.92, 1.0));
  }

  void main() {
    vec3 n = normalize(vNormal);
    vec3 viewDir = normalize(uCameraPosition - vPosition);
    vec3 lightDir = normalize(vec3(-0.35, 0.75, 0.55));
    float diffuse = max(dot(n, lightDir), 0.0);
    float backLight = max(dot(n, normalize(vec3(0.6, -0.45, -0.7))), 0.0);
    float tunnel = smoothstep(0.05, 0.95, 1.0 - abs(n.z * 0.45 + n.y * 0.35));
    float radialBand = vRadius * 1.65;
    float curveBand = vGradient * 1.2 + length(vPosition.xy) * 0.18 - vPosition.z * 0.08;

    vec3 base;
    if (uColorMode == 0) {
      base = palette(0.18 + curveBand * 0.72 + sin(vPosition.x * 3.0 + vPosition.y * 2.0) * 0.035);
      base = mix(base, vec3(0.0, 0.62, 0.92), tunnel * 0.28);
    } else if (uColorMode == 1) {
      base = palette(radialBand - 0.15 + sin(vPosition.z * 4.0) * 0.035);
    } else if (uColorMode == 2) {
      base = normalize(n) * 0.5 + 0.5;
      base = pow(base, vec3(0.72));
    } else if (uColorMode == 3) {
      base = mix(vec3(0.72, 0.92, 1.0), vec3(1.0, 0.95, 0.86), vRadius);
    } else {
      base = mix(vec3(0.92, 0.88, 0.72), vec3(1.0), smoothstep(0.72, 1.0, vRadius));
    }

    float bands = 0.5 + 0.5 * sin((curveBand + radialBand) * 36.0);
    vec3 contourInk = mix(base * 0.45, base * 1.16, smoothstep(0.36, 0.92, bands));
    base = mix(base, contourInk, uColorMode == 3 ? 0.08 : 0.38);

    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
    float cropRim = smoothstep(0.88, 1.0, vRadius);
    vec3 rimColor = mix(vec3(0.9, 0.88, 0.78), vec3(1.0, 0.82, 0.36), 0.35 + 0.25 * sin(uTime * 0.6));
    vec3 lit = base * (0.32 + diffuse * 0.78 + backLight * 0.22);

    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(n, halfDir), 0.0), 90.0);
    lit += vec3(specular) * 0.9;
    lit += rimColor * (fresnel * 0.42 + cropRim * cropRim * 0.72) * uRimStrength;
    lit += base * 0.1;

    float alpha = uColorMode == 3 ? 0.86 : 1.0;
    gl_FragColor = vec4(lit, alpha);
  }
`;

export function createSurfaceMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uWobble: { value: 0 },
      uWobbleSpeed: { value: 1 },
      uWobbleScale: { value: 4 },
      uBreathing: { value: 0 },
      uTwist: { value: 0 },
      uSurfaceThickness: { value: 0 },
      uColorMode: { value: 0 },
      uRimStrength: { value: 1.2 },
      uCameraPosition: { value: new THREE.Vector3() },
    },
  });
}

export function colorModeIndex(mode: ColorMode) {
  return Math.max(0, colorModes.indexOf(mode));
}
