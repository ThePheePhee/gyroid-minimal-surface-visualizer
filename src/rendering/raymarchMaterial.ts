import * as THREE from 'three';
import { colorModeIndex, type ColorMode } from './surfaceMaterial';
import type { MorphPath } from './geometryCache';
import type { SurfacePreset } from '../math/scalarFields';

const surfaceIndex: Record<SurfacePreset, number> = {
  Gyroid: 0,
  'Schwarz P': 1,
  Diamond: 2,
  Neovius: 3,
};

const morphPathIndex: Record<MorphPath, number> = {
  'A to B pulse': 0,
  'Cycle all families': 1,
};

const vertexShader = /* glsl */ `
  varying vec3 vWorldPosition;

  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = /* glsl */ `
  precision highp float;

  varying vec3 vWorldPosition;

  uniform vec3 uCameraPosition;
  uniform int uPreset;
  uniform int uMorphTarget;
  uniform int uMorphPath;
  uniform int uColorMode;
  uniform int uRaySteps;
  uniform float uMorphAmount;
  uniform float uIsoLevel;
  uniform float uFrequency;
  uniform float uCropRadius;
  uniform float uTime;
  uniform float uAutoRotationSpeed;
  uniform float uWobble;
  uniform float uWobbleSpeed;
  uniform float uWobbleScale;
  uniform float uBreathing;
  uniform float uTwist;
  uniform float uSurfaceThickness;
  uniform float uRimStrength;

  const int MAX_STEPS = 768;
  const int REFINE_STEPS = 7;

  vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
  }

  vec3 palette(float t) {
    return hsv2rgb(vec3(fract(t), 0.92, 1.0));
  }

  float smootherstep(float t) {
    t = clamp(t, 0.0, 1.0);
    return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
  }

  mat2 rotate2d(float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c);
  }

  vec3 rotateY(vec3 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
  }

  float gyroid(vec3 p) {
    return (
      sin(p.x) * cos(p.y) +
      sin(p.y) * cos(p.z) +
      sin(p.z) * cos(p.x)
    ) / 1.5;
  }

  float schwarzP(vec3 p) {
    return (cos(p.x) + cos(p.y) + cos(p.z)) / 3.0;
  }

  float diamond(vec3 p) {
    return (
      sin(p.x) * sin(p.y) * sin(p.z) +
      sin(p.x) * cos(p.y) * cos(p.z) +
      cos(p.x) * sin(p.y) * cos(p.z) +
      cos(p.x) * cos(p.y) * sin(p.z)
    ) / 2.0;
  }

  float neovius(vec3 p) {
    return (
      3.0 * (cos(p.x) + cos(p.y) + cos(p.z)) +
      4.0 * cos(p.x) * cos(p.y) * cos(p.z)
    ) / 13.0;
  }

  float fieldByIndex(int index, vec3 p) {
    float value = gyroid(p);
    if (index == 1) {
      value = schwarzP(p);
    } else if (index == 2) {
      value = diamond(p);
    } else if (index == 3) {
      value = neovius(p);
    }
    return value;
  }

  vec3 animatedDomain(vec3 p) {
    float t = uTime * uWobbleSpeed;
    float breath = 1.0 + sin(t * 0.58) * uBreathing;
    p /= max(0.05, breath);
    p = rotateY(p, uTime * uAutoRotationSpeed);
    p.xy = rotate2d(-p.z * uTwist * sin(t * 0.37)) * p.xy;

    vec3 wave = vec3(
      sin(t + dot(p, vec3(1.2, 0.8, -0.6)) * uWobbleScale),
      sin(t * 0.83 + dot(p, vec3(-0.5, 1.4, 0.9)) * uWobbleScale),
      sin(t * 1.17 + dot(p, vec3(0.9, -0.4, 1.5)) * uWobbleScale)
    );
    p += wave * uWobble;
    return p;
  }

  float morphedField(vec3 p) {
    vec3 q = animatedDomain(p) * uFrequency;
    float value = 0.0;
    if (uMorphPath == 1) {
      float scaled = fract(uMorphAmount) * 4.0;
      int fromIndex = int(floor(scaled));
      int toIndex = int(mod(float(fromIndex + 1), 4.0));
      float t = smootherstep(fract(scaled));
      value = mix(fieldByIndex(fromIndex, q), fieldByIndex(toIndex, q), t);
    } else {
      value = mix(
        fieldByIndex(uPreset, q),
        fieldByIndex(uMorphTarget, q),
        smootherstep(uMorphAmount)
      );
    }
    return value - uIsoLevel;
  }

  bool raySphere(vec3 origin, vec3 direction, float radius, out float nearT, out float farT) {
    float b = dot(origin, direction);
    float c = dot(origin, origin) - radius * radius;
    float h = b * b - c;
    if (h < 0.0) return false;
    h = sqrt(h);
    nearT = -b - h;
    farT = -b + h;
    return farT > 0.0;
  }

  vec3 estimateGradient(vec3 p) {
    float eps = max(0.0035, 0.012 / max(0.8, uFrequency));
    vec2 e = vec2(eps, 0.0);
    return vec3(
      morphedField(p + e.xyy) - morphedField(p - e.xyy),
      morphedField(p + e.yxy) - morphedField(p - e.yxy),
      morphedField(p + e.yyx) - morphedField(p - e.yyx)
    ) / (2.0 * eps);
  }

  vec3 estimateNormal(vec3 p) {
    return normalize(estimateGradient(p));
  }

  bool findSurface(vec3 origin, vec3 direction, float nearT, float farT, out vec3 hitPosition, out float hitGradient) {
    float startT = max(nearT, 0.0);
    float travel = farT - startT;
    float stepSize = travel / float(max(uRaySteps, 1));
    float previousT = startT;
    float previousValue = morphedField(origin + direction * previousT);
    float bestT = previousT;
    float bestAbs = abs(previousValue);

    for (int i = 1; i <= MAX_STEPS; i++) {
      if (i > uRaySteps) break;
      float currentT = startT + stepSize * float(i);
      vec3 p = origin + direction * currentT;
      float currentValue = morphedField(p);
      float currentAbs = abs(currentValue);

      if (currentAbs < bestAbs) {
        bestAbs = currentAbs;
        bestT = currentT;
      }

      if (previousValue == 0.0 || sign(previousValue) != sign(currentValue)) {
        float lo = previousT;
        float hi = currentT;
        float loValue = previousValue;
        for (int j = 0; j < REFINE_STEPS; j++) {
          float mid = 0.5 * (lo + hi);
          float midValue = morphedField(origin + direction * mid);
          if (sign(loValue) == sign(midValue)) {
            lo = mid;
            loValue = midValue;
          } else {
            hi = mid;
          }
        }
        hitPosition = origin + direction * (0.5 * (lo + hi));
        hitGradient = clamp(length(estimateGradient(hitPosition)) * 0.22, 0.0, 1.0);
        return true;
      }

      previousT = currentT;
      previousValue = currentValue;
    }

    float tangentTolerance = 0.006 + 0.018 / float(max(uRaySteps, 1)) + uSurfaceThickness * 0.015;
    if (bestAbs < tangentTolerance) {
      hitPosition = origin + direction * bestT;
      hitGradient = clamp(length(estimateGradient(hitPosition)) * 0.22, 0.0, 1.0);
      return true;
    }

    return false;
  }

  vec3 shadeSurface(vec3 position, vec3 normal, vec3 viewDir, float gradient) {
    vec3 n = normalize(normal);
    vec3 lightDir = normalize(vec3(-0.35, 0.75, 0.55));
    float diffuse = max(dot(n, lightDir), 0.0);
    float backLight = max(dot(n, normalize(vec3(0.6, -0.45, -0.7))), 0.0);
    float radius = length(position) / uCropRadius;
    float tunnel = smoothstep(0.05, 0.95, 1.0 - abs(n.z * 0.45 + n.y * 0.35));
    float radialBand = radius * 1.65;
    float curveBand = gradient * 1.2 + length(position.xy) * 0.18 - position.z * 0.08;

    vec3 base;
    if (uColorMode == 0) {
      base = palette(0.18 + curveBand * 0.72 + sin(position.x * 3.0 + position.y * 2.0) * 0.035);
      base = mix(base, vec3(0.0, 0.62, 0.92), tunnel * 0.28);
    } else if (uColorMode == 1) {
      base = palette(radialBand - 0.15 + sin(position.z * 4.0) * 0.035);
    } else if (uColorMode == 2) {
      base = pow(normalize(n) * 0.5 + 0.5, vec3(0.72));
    } else if (uColorMode == 3) {
      base = mix(vec3(0.72, 0.92, 1.0), vec3(1.0, 0.95, 0.86), radius);
    } else {
      base = mix(vec3(0.92, 0.88, 0.72), vec3(1.0), smoothstep(0.72, 1.0, radius));
    }

    float bands = 0.5 + 0.5 * sin((curveBand + radialBand) * 36.0);
    vec3 contourInk = mix(base * 0.45, base * 1.16, smoothstep(0.36, 0.92, bands));
    base = mix(base, contourInk, uColorMode == 3 ? 0.08 : 0.38);

    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(n, halfDir), 0.0), 90.0);
    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
    float cropRim = smoothstep(0.9, 1.0, radius);
    vec3 rimColor = mix(vec3(0.9, 0.88, 0.78), vec3(1.0, 0.82, 0.36), 0.35 + 0.25 * sin(uTime * 0.6));

    vec3 lit = base * (0.32 + diffuse * 0.78 + backLight * 0.22);
    lit += vec3(specular) * 0.9;
    lit += rimColor * (fresnel * 0.42 + cropRim * cropRim * 0.72) * uRimStrength;
    lit += base * 0.1;
    return lit;
  }

  void main() {
    vec3 rayOrigin = uCameraPosition;
    vec3 rayDirection = normalize(vWorldPosition - rayOrigin);
    float nearT;
    float farT;
    if (!raySphere(rayOrigin, rayDirection, uCropRadius, nearT, farT)) {
      discard;
    }

    vec3 hitPosition;
    float hitGradient;
    if (!findSurface(rayOrigin, rayDirection, nearT, farT, hitPosition, hitGradient)) {
      discard;
    }

    vec3 normal = estimateNormal(hitPosition);
    vec3 viewDir = normalize(rayOrigin - hitPosition);
    if (dot(normal, viewDir) < 0.0) {
      normal = -normal;
    }

    vec3 color = shadeSurface(hitPosition, normal, viewDir, hitGradient);
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function createRaymarchMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    side: THREE.FrontSide,
    transparent: true,
    depthWrite: true,
    uniforms: {
      uCameraPosition: { value: new THREE.Vector3() },
      uPreset: { value: 0 },
      uMorphTarget: { value: 2 },
      uMorphPath: { value: 0 },
      uColorMode: { value: 0 },
      uRaySteps: { value: 288 },
      uMorphAmount: { value: 0 },
      uIsoLevel: { value: 0 },
      uFrequency: { value: 3.1 },
      uCropRadius: { value: 2.08 },
      uTime: { value: 0 },
      uAutoRotationSpeed: { value: 0.22 },
      uWobble: { value: 0.018 },
      uWobbleSpeed: { value: 1.15 },
      uWobbleScale: { value: 4.2 },
      uBreathing: { value: 0.018 },
      uTwist: { value: 0.035 },
      uSurfaceThickness: { value: 0.04 },
      uRimStrength: { value: 1.2 },
    },
  });
}

export function updateRaymarchMaterial(
  material: THREE.ShaderMaterial,
  options: {
    settings: {
      preset: SurfacePreset;
      morphTarget: SurfacePreset;
      morphPath: MorphPath;
      morphAmount: number;
      isoLevel: number;
      frequency: number;
      cropRadius: number;
      shellThickness: number;
    };
    colorMode: ColorMode;
    raySteps: number;
    autoRotationSpeed: number;
    wobbleAmplitude: number;
    wobbleSpeed: number;
    wobbleScale: number;
    breathing: number;
    twist: number;
  },
) {
  const { uniforms } = material;
  const { settings } = options;
  uniforms.uPreset.value = surfaceIndex[settings.preset];
  uniforms.uMorphTarget.value = surfaceIndex[settings.morphTarget];
  uniforms.uMorphPath.value = morphPathIndex[settings.morphPath];
  uniforms.uColorMode.value = colorModeIndex(options.colorMode);
  uniforms.uRaySteps.value = Math.round(options.raySteps);
  uniforms.uMorphAmount.value = settings.morphAmount;
  uniforms.uIsoLevel.value = settings.isoLevel;
  uniforms.uFrequency.value = settings.frequency;
  uniforms.uCropRadius.value = settings.cropRadius;
  uniforms.uAutoRotationSpeed.value = options.autoRotationSpeed;
  uniforms.uWobble.value = options.wobbleAmplitude;
  uniforms.uWobbleSpeed.value = options.wobbleSpeed;
  uniforms.uWobbleScale.value = options.wobbleScale;
  uniforms.uBreathing.value = options.breathing;
  uniforms.uTwist.value = options.twist;
  uniforms.uSurfaceThickness.value = settings.shellThickness;
  uniforms.uRimStrength.value =
    options.colorMode === 'metallic white/gold rim emphasis'
      ? 2.2
      : options.colorMode === 'monochrome porcelain/glass'
        ? 1.55
        : 1.2;
}
