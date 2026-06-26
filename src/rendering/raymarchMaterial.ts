import * as THREE from 'three';
import { colorModeIndex, type ColorMode } from './surfaceMaterial';
import type { MorphPath } from './geometryCache';
import type { SurfacePreset } from '../math/scalarFields';

export type ComplementSide = 'positive labyrinth' | 'negative labyrinth';

type RaymarchShaderSettings = {
  preset: SurfacePreset;
  morphTarget: SurfacePreset;
  morphPath: MorphPath;
};

const surfaceIndex: Record<SurfacePreset, number> = {
  Gyroid: 0,
  'Schwarz P': 1,
  Diamond: 2,
  Neovius: 3,
  Lidinoid: 4,
  'Schoen I-WP': 5,
  'Schoen F-RD': 6,
  'Schwarz CLP': 7,
  'Fischer-Koch S': 8,
  'Split P': 9,
  'Double Gyroid': 10,
};

const morphPathIndex: Record<MorphPath, number> = {
  'No morph': 0,
  'A to B pulse': 1,
  'Cycle all families': 2,
};

const surfaceFieldSources: Record<SurfacePreset, { fn: string; source: string }> = {
  Gyroid: {
    fn: 'gyroid',
    source: /* glsl */ `
  float gyroid(vec3 p) {
    return (
      sin(p.x) * cos(p.y) +
      sin(p.y) * cos(p.z) +
      sin(p.z) * cos(p.x)
    ) / 1.5;
  }
`,
  },
  'Schwarz P': {
    fn: 'schwarzP',
    source: /* glsl */ `
  float schwarzP(vec3 p) {
    return (cos(p.x) + cos(p.y) + cos(p.z)) / 3.0;
  }
`,
  },
  Diamond: {
    fn: 'diamond',
    source: /* glsl */ `
  float diamond(vec3 p) {
    return (
      sin(p.x) * sin(p.y) * sin(p.z) +
      sin(p.x) * cos(p.y) * cos(p.z) +
      cos(p.x) * sin(p.y) * cos(p.z) +
      cos(p.x) * cos(p.y) * sin(p.z)
    ) / 2.0;
  }
`,
  },
  Neovius: {
    fn: 'neovius',
    source: /* glsl */ `
  float neovius(vec3 p) {
    return (
      3.0 * (cos(p.x) + cos(p.y) + cos(p.z)) +
      4.0 * cos(p.x) * cos(p.y) * cos(p.z)
    ) / 13.0;
  }
`,
  },
  Lidinoid: {
    fn: 'lidinoid',
    source: /* glsl */ `
  float lidinoid(vec3 p) {
    return (
      0.5 * (
        sin(2.0 * p.x) * cos(p.y) * sin(p.z) +
        sin(2.0 * p.y) * cos(p.z) * sin(p.x) +
        sin(2.0 * p.z) * cos(p.x) * sin(p.y)
      ) -
      0.5 * (
        cos(2.0 * p.x) * cos(2.0 * p.y) +
        cos(2.0 * p.y) * cos(2.0 * p.z) +
        cos(2.0 * p.z) * cos(2.0 * p.x)
      ) +
      0.15
    ) / 2.2;
  }
`,
  },
  'Schoen I-WP': {
    fn: 'schoenIwp',
    source: /* glsl */ `
  float schoenIwp(vec3 p) {
    return (
      2.0 * (
        cos(p.x) * cos(p.y) +
        cos(p.y) * cos(p.z) +
        cos(p.z) * cos(p.x)
      ) -
      (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z))
    ) / 6.0;
  }
`,
  },
  'Schoen F-RD': {
    fn: 'schoenFrd',
    source: /* glsl */ `
  float schoenFrd(vec3 p) {
    return (
      4.0 * cos(p.x) * cos(p.y) * cos(p.z) -
      (
        cos(2.0 * p.x) * cos(2.0 * p.y) +
        cos(2.0 * p.y) * cos(2.0 * p.z) +
        cos(2.0 * p.z) * cos(2.0 * p.x)
      )
    ) / 7.0;
  }
`,
  },
  'Schwarz CLP': {
    fn: 'schwarzClp',
    source: /* glsl */ `
  float schwarzClp(vec3 p) {
    return (
      cos(p.x) + cos(p.y) + cos(p.z) +
      cos(p.x) * cos(p.y) * cos(p.z)
    ) / 4.0;
  }
`,
  },
  'Fischer-Koch S': {
    fn: 'fischerKochS',
    source: /* glsl */ `
  float fischerKochS(vec3 p) {
    return (
      cos(2.0 * p.x) * sin(p.y) * cos(p.z) +
      cos(p.x) * cos(2.0 * p.y) * sin(p.z) +
      sin(p.x) * cos(p.y) * cos(2.0 * p.z)
    ) / 3.0;
  }
`,
  },
  'Split P': {
    fn: 'splitP',
    source: /* glsl */ `
  float splitP(vec3 p) {
    return (
      1.1 * (
        sin(2.0 * p.x) * sin(p.z) * cos(p.y) +
        sin(2.0 * p.y) * sin(p.x) * cos(p.z) +
        sin(2.0 * p.z) * sin(p.y) * cos(p.x)
      ) -
      0.2 * (
        cos(2.0 * p.x) * cos(2.0 * p.y) +
        cos(2.0 * p.y) * cos(2.0 * p.z) +
        cos(2.0 * p.z) * cos(2.0 * p.x)
      ) -
      0.4 * (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z))
    ) / 2.7;
  }
`,
  },
  'Double Gyroid': {
    fn: 'doubleGyroid',
    source: /* glsl */ `
  float doubleGyroid(vec3 p) {
    float g = gyroid(p);
    return g * g - 0.18;
  }
`,
  },
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
  uniform int uComplementMode;
  uniform int uComplementSide;

  const int MAX_STEPS = 768;
  const int REFINE_STEPS = 7;
  const float SURFACE_COUNT = 11.0;

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

  float lidinoid(vec3 p) {
    return (
      0.5 * (
        sin(2.0 * p.x) * cos(p.y) * sin(p.z) +
        sin(2.0 * p.y) * cos(p.z) * sin(p.x) +
        sin(2.0 * p.z) * cos(p.x) * sin(p.y)
      ) -
      0.5 * (
        cos(2.0 * p.x) * cos(2.0 * p.y) +
        cos(2.0 * p.y) * cos(2.0 * p.z) +
        cos(2.0 * p.z) * cos(2.0 * p.x)
      ) +
      0.15
    ) / 2.2;
  }

  float schoenIwp(vec3 p) {
    return (
      2.0 * (
        cos(p.x) * cos(p.y) +
        cos(p.y) * cos(p.z) +
        cos(p.z) * cos(p.x)
      ) -
      (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z))
    ) / 6.0;
  }

  float schoenFrd(vec3 p) {
    return (
      4.0 * cos(p.x) * cos(p.y) * cos(p.z) -
      (
        cos(2.0 * p.x) * cos(2.0 * p.y) +
        cos(2.0 * p.y) * cos(2.0 * p.z) +
        cos(2.0 * p.z) * cos(2.0 * p.x)
      )
    ) / 7.0;
  }

  float schwarzClp(vec3 p) {
    return (
      cos(p.x) + cos(p.y) + cos(p.z) +
      cos(p.x) * cos(p.y) * cos(p.z)
    ) / 4.0;
  }

  float fischerKochS(vec3 p) {
    return (
      cos(2.0 * p.x) * sin(p.y) * cos(p.z) +
      cos(p.x) * cos(2.0 * p.y) * sin(p.z) +
      sin(p.x) * cos(p.y) * cos(2.0 * p.z)
    ) / 3.0;
  }

  float splitP(vec3 p) {
    return (
      1.1 * (
        sin(2.0 * p.x) * sin(p.z) * cos(p.y) +
        sin(2.0 * p.y) * sin(p.x) * cos(p.z) +
        sin(2.0 * p.z) * sin(p.y) * cos(p.x)
      ) -
      0.2 * (
        cos(2.0 * p.x) * cos(2.0 * p.y) +
        cos(2.0 * p.y) * cos(2.0 * p.z) +
        cos(2.0 * p.z) * cos(2.0 * p.x)
      ) -
      0.4 * (cos(2.0 * p.x) + cos(2.0 * p.y) + cos(2.0 * p.z))
    ) / 2.7;
  }

  float doubleGyroid(vec3 p) {
    float g = gyroid(p);
    return g * g - 0.18;
  }

  float fieldByIndex(int index, vec3 p) {
    float value = gyroid(p);
    if (index == 1) {
      value = schwarzP(p);
    } else if (index == 2) {
      value = diamond(p);
    } else if (index == 3) {
      value = neovius(p);
    } else if (index == 4) {
      value = lidinoid(p);
    } else if (index == 5) {
      value = schoenIwp(p);
    } else if (index == 6) {
      value = schoenFrd(p);
    } else if (index == 7) {
      value = schwarzClp(p);
    } else if (index == 8) {
      value = fischerKochS(p);
    } else if (index == 9) {
      value = splitP(p);
    } else if (index == 10) {
      value = doubleGyroid(p);
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
    if (uMorphPath == 2) {
      float scaled = fract(uMorphAmount) * SURFACE_COUNT;
      int fromIndex = int(floor(scaled));
      int toIndex = int(mod(float(fromIndex + 1), SURFACE_COUNT));
      float t = smootherstep(fract(scaled));
      value = mix(fieldByIndex(fromIndex, q), fieldByIndex(toIndex, q), t);
    } else if (uMorphPath == 1) {
      value = mix(
        fieldByIndex(uPreset, q),
        fieldByIndex(uMorphTarget, q),
        smootherstep(uMorphAmount)
      );
    } else {
      value = fieldByIndex(uPreset, q);
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

  float complementField(vec3 p) {
    float side = uComplementSide == 1 ? 1.0 : -1.0;
    return morphedField(p) * side;
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

  bool findComplementSolid(vec3 origin, vec3 direction, float nearT, float farT, out vec3 hitPosition, out float hitGradient, out float hitKind) {
    float startT = max(nearT, 0.0);
    float travel = farT - startT;
    float stepSize = travel / float(max(uRaySteps, 1));
    float epsilonT = min(stepSize * 0.25, 0.012);
    float previousT = startT + epsilonT;
    float previousValue = complementField(origin + direction * previousT);

    if (previousValue >= 0.0) {
      hitPosition = origin + direction * startT;
      hitGradient = 0.35;
      hitKind = 1.0;
      return true;
    }

    for (int i = 1; i <= MAX_STEPS; i++) {
      if (i > uRaySteps) break;
      float currentT = startT + stepSize * float(i);
      vec3 p = origin + direction * currentT;
      float currentValue = complementField(p);

      if (previousValue < 0.0 && currentValue >= 0.0) {
        float lo = previousT;
        float hi = currentT;
        for (int j = 0; j < REFINE_STEPS; j++) {
          float mid = 0.5 * (lo + hi);
          float midValue = complementField(origin + direction * mid);
          if (midValue < 0.0) {
            lo = mid;
          } else {
            hi = mid;
          }
        }
        hitPosition = origin + direction * (0.5 * (lo + hi));
        hitGradient = clamp(length(estimateGradient(hitPosition)) * 0.22, 0.0, 1.0);
        hitKind = 0.0;
        return true;
      }

      previousT = currentT;
      previousValue = currentValue;
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

  vec3 shadeComplementSolid(vec3 position, vec3 normal, vec3 viewDir, float hitKind) {
    vec3 n = normalize(normal);
    vec3 lightDir = normalize(vec3(-0.35, 0.75, 0.55));
    vec3 coolLightDir = normalize(vec3(0.65, -0.35, -0.62));
    float diffuse = max(dot(n, lightDir), 0.0);
    float coolDiffuse = max(dot(n, coolLightDir), 0.0);
    float radius = clamp(length(position) / uCropRadius, 0.0, 1.0);
    float cropWall = smoothstep(0.4, 1.0, hitKind);
    float innerWall = 1.0 - cropWall;

    float broadBand = 0.5 + 0.5 * sin(
      position.x * 5.7 +
      position.y * 3.9 -
      position.z * 4.8 +
      radius * 14.0 +
      uTime * 0.18
    );
    float fineBand = 0.5 + 0.5 * sin(
      position.x * 17.0 -
      position.y * 11.0 +
      position.z * 13.0 +
      radius * 31.0
    );

    vec3 pearl = mix(vec3(0.92, 0.87, 1.0), vec3(1.0, 0.96, 0.78), smootherstep(radius));
    vec3 oil = mix(vec3(0.62, 0.18, 0.92), vec3(1.0, 0.34, 0.78), broadBand);
    oil = mix(oil, vec3(1.0, 0.86, 0.38), fineBand * 0.24);

    vec3 base = mix(oil, pearl, 0.48 + cropWall * 0.34);
    if (uColorMode == 2) {
      base = pow(normalize(n) * 0.5 + 0.5, vec3(0.72));
      base = mix(base, pearl, cropWall * 0.45);
    } else if (uColorMode == 3) {
      base = pearl;
    } else if (uColorMode == 4) {
      base = mix(vec3(0.88, 0.84, 0.7), vec3(1.0), smootherstep(radius));
    }

    float fresnel = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
    vec3 halfDir = normalize(lightDir + viewDir);
    float specular = pow(max(dot(n, halfDir), 0.0), 96.0);
    float cropRim = smoothstep(0.88, 1.0, radius);
    vec3 rimColor = mix(vec3(0.88, 0.92, 1.0), vec3(1.0, 0.86, 0.42), 0.45);

    vec3 lit = base * (0.34 + diffuse * 0.74 + coolDiffuse * 0.16);
    lit += vec3(specular) * (0.72 + innerWall * 0.22);
    lit += rimColor * (fresnel * 0.62 + cropRim * cropRim * 0.74) * uRimStrength;
    lit += base * 0.08;
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
    float hitKind = 0.0;
    if (uComplementMode == 1) {
      if (!findComplementSolid(rayOrigin, rayDirection, nearT, farT, hitPosition, hitGradient, hitKind)) {
        discard;
      }
    } else {
      if (!findSurface(rayOrigin, rayDirection, nearT, farT, hitPosition, hitGradient)) {
        discard;
      }
    }

    vec3 viewDir = normalize(rayOrigin - hitPosition);
    vec3 normal = estimateNormal(hitPosition);
    if (uComplementMode == 1) {
      float complementSide = uComplementSide == 1 ? 1.0 : -1.0;
      normal = hitKind > 0.5
        ? normalize(hitPosition)
        : -complementSide * normal;
    }
    if (dot(normal, viewDir) < 0.0) {
      normal = -normal;
    }

    vec3 color = uComplementMode == 1
      ? shadeComplementSolid(hitPosition, normal, viewDir, hitKind)
      : shadeSurface(hitPosition, normal, viewDir, hitGradient);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function buildFragmentShader(settings: RaymarchShaderSettings) {
  if (settings.morphPath === 'Cycle all families') {
    return fragmentShader;
  }

  const requiredPresets = [settings.preset];
  if (settings.morphPath === 'A to B pulse') {
    requiredPresets.push(settings.morphTarget);
  }
  if (requiredPresets.includes('Double Gyroid')) {
    requiredPresets.unshift('Gyroid');
  }

  const uniquePresets = Array.from(new Set(requiredPresets));
  const fieldSection = `${uniquePresets.map((preset) => surfaceFieldSources[preset].source).join('\n')}

  vec3 animatedDomain`;
  const presetField = surfaceFieldSources[settings.preset].fn;
  const targetField = surfaceFieldSources[settings.morphTarget].fn;
  const morphedField =
    settings.morphPath === 'A to B pulse'
      ? /* glsl */ `
  float morphedField(vec3 p) {
    vec3 q = animatedDomain(p) * uFrequency;
    float value = mix(${presetField}(q), ${targetField}(q), smootherstep(uMorphAmount));
    return value - uIsoLevel;
  }

  bool raySphere`
      : /* glsl */ `
  float morphedField(vec3 p) {
    vec3 q = animatedDomain(p) * uFrequency;
    return ${presetField}(q) - uIsoLevel;
  }

  bool raySphere`;

  return fragmentShader
    .replace(/ {2}float gyroid\(vec3 p\) \{[\s\S]*? {2}vec3 animatedDomain/, fieldSection)
    .replace(/ {2}float morphedField\(vec3 p\) \{[\s\S]*? {2}bool raySphere/, morphedField);
}

export function createRaymarchMaterial(settings: RaymarchShaderSettings) {
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader: buildFragmentShader(settings),
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
      uComplementMode: { value: 0 },
      uComplementSide: { value: 1 },
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
    complementSolid: boolean;
    complementSide: ComplementSide;
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
  uniforms.uComplementMode.value = options.complementSolid ? 1 : 0;
  uniforms.uComplementSide.value = options.complementSide === 'negative labyrinth' ? -1 : 1;
  uniforms.uRimStrength.value =
    options.colorMode === 'metallic white/gold rim emphasis'
      ? 2.2
      : options.colorMode === 'monochrome porcelain/glass'
        ? 1.55
        : 1.2;
}
