import * as THREE from 'three';
import { colorModeIndex, type ColorMode } from './surfaceMaterial';
import type { MorphPath } from './geometryCache';
import type { SurfacePreset } from '../math/scalarFields';

export type ComplementSide = 'positive labyrinth' | 'negative labyrinth';
export type DeveloperShaderMode = 'off' | 'live';

export type DeveloperRaymarchSettings = {
  enabled: boolean;
  shaderMode: DeveloperShaderMode;
  geometryOverlay: number;
  overlayStrength: number;
  finiteDifferenceEpsilon: number;
  bonnetStripMode: number;
  bonnetParameter: number;
  stripPhase: number;
  stripWidth: number;
  baseSurfaceFade: number;
  parallelFocalMode: number;
  offsetDistance: number;
  causticStrength: number;
  pointinessClamp: number;
  screwPhase: number;
  screwStrength: number;
  screwCoreRadius: number;
  screwTurns: number;
  screwPinch: number;
  screwSharpness: number;
  minimalityDiagnostic: boolean;
};

type RaymarchShaderSettings = {
  preset: SurfacePreset;
  morphTarget: SurfacePreset;
  morphPath: MorphPath;
  developerShaderMode: DeveloperShaderMode;
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

export const geometryOverlayIndex: Record<string, number> = {
  Off: 0,
  'Curvature Color': 1,
  'Principal Directions': 2,
  'Asymptotic Directions': 3,
  'Minimality Error': 4,
  'Focal Distance': 5,
};

export const bonnetStripModeIndex: Record<string, number> = {
  Off: 0,
  'Approx P-G-D Blend': 1,
  'Strip Overlay': 2,
};

export const parallelFocalModeIndex: Record<string, number> = {
  Off: 0,
  'Offset Surface': 1,
  'Focal Highlight': 2,
  'Near-Caustic Shell': 3,
};

export const screwPhaseIndex: Record<string, number> = {
  Off: 0,
  'Single Defect': 1,
  'Paired Defects': 2,
  'Helical Corkscrew': 3,
  'Spiral Pinch': 4,
  'Thorn Crown': 5,
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
  uniform int uDeveloperMode;
  uniform int uDevGeometryOverlay;
  uniform float uDevOverlayStrength;
  uniform float uDevFiniteDifferenceEpsilon;
  uniform int uDevBonnetMode;
  uniform float uDevBonnetParameter;
  uniform float uDevStripPhase;
  uniform float uDevStripWidth;
  uniform float uDevBaseSurfaceFade;
  uniform int uDevParallelMode;
  uniform float uDevOffsetDistance;
  uniform float uDevCausticStrength;
  uniform float uDevPointinessClamp;
  uniform int uDevScrewMode;
  uniform float uDevScrewStrength;
  uniform float uDevScrewCoreRadius;
  uniform float uDevScrewTurns;
  uniform float uDevScrewPinch;
  uniform float uDevScrewSharpness;
  uniform int uDevMinimalityDiagnostic;

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

  vec3 developerDomain(vec3 p) {
    p = animatedDomain(p);
    if (
      uDeveloperMode == 1 &&
      uDevScrewMode != 0 &&
      (abs(uDevScrewStrength) > 0.0001 || abs(uDevScrewPinch) > 0.0001)
    ) {
      float core = max(0.05, uDevScrewCoreRadius);
      int defectCount = uDevScrewMode == 5 ? 6 : (uDevScrewMode == 2 ? 2 : 1);
      float sharpness = clamp(uDevScrewSharpness, 1.0, 8.0);
      float turns = max(0.05, uDevScrewTurns);

      for (int i = 0; i < 6; i++) {
        if (i >= defectCount) break;
        vec2 center = vec2(0.0);
        float defectSign = 1.0;
        float defectPhase = float(i) * 1.2566371;
        if (uDevScrewMode == 2) {
          center = i == 0 ? vec2(-core, 0.0) : vec2(core, 0.0);
          defectSign = i == 0 ? 1.0 : -1.0;
          defectPhase = i == 0 ? 0.0 : 3.1415926;
        } else if (uDevScrewMode == 5) {
          float crownAngle = 6.2831853 * float(i) / 6.0 + uDevStripPhase * 6.2831853;
          center = vec2(cos(crownAngle), sin(crownAngle)) * core * 1.25;
          defectSign = mod(float(i), 2.0) < 0.5 ? 1.0 : -1.0;
          defectPhase = crownAngle;
        }

        vec2 delta = p.xy - center;
        float r = length(delta);
        float focus = exp(-pow(max(r / max(core, 0.001), 0.0), sharpness));
        float helicalPhase =
          p.z * turns * 6.2831853 +
          uDevStripPhase * 6.2831853 +
          defectPhase;
        bool helicalMode = uDevScrewMode == 3 || uDevScrewMode == 4 || uDevScrewMode == 5;
        float helicalMix = helicalMode ? 0.55 + 0.45 * sin(helicalPhase) : 1.0;
        float angle = defectSign * uDevScrewStrength * focus * (1.15 + helicalMix);
        vec2 rotated = rotate2d(angle) * delta;
        float pinchWave = 0.65 + 0.35 * cos(helicalPhase);
        float pinchGain = (uDevScrewMode == 4 || uDevScrewMode == 5) ? 0.62 : 0.22;
        float radialScale = max(0.06, 1.0 - uDevScrewPinch * focus * pinchGain * pinchWave);
        p.xy = center + rotated * radialScale;
        p.z +=
          defectSign * uDevScrewStrength * focus * 0.08 * sin(helicalPhase) +
          uDevScrewPinch * focus * 0.06 * cos(helicalPhase);
      }
    }
    return p;
  }

  float morphedBaseValue(vec3 q) {
    if (uDeveloperMode == 1 && uDevBonnetMode == 1) {
      float t = smootherstep(uDevBonnetParameter);
      float pField = schwarzP(q);
      float gField = gyroid(q);
      float dField = diamond(q);
      return t < 0.5
        ? mix(pField, gField, smootherstep(t * 2.0))
        : mix(gField, dField, smootherstep((t - 0.5) * 2.0));
    }

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
    return value;
  }

  float basicMorphedField(vec3 p) {
    vec3 q = developerDomain(p) * uFrequency;
    return morphedBaseValue(q) - uIsoLevel;
  }

  vec3 estimateBasicGradient(vec3 p) {
    float eps = max(0.0035, 0.012 / max(0.8, uFrequency));
    vec2 e = vec2(eps, 0.0);
    return vec3(
      basicMorphedField(p + e.xyy) - basicMorphedField(p - e.xyy),
      basicMorphedField(p + e.yxy) - basicMorphedField(p - e.yxy),
      basicMorphedField(p + e.yyx) - basicMorphedField(p - e.yyx)
    ) / (2.0 * eps);
  }

  float curvaturePointinessProxy(vec3 p) {
    float eps = max(0.006, uDevFiniteDifferenceEpsilon);
    vec3 g = estimateBasicGradient(p);
    float gm = max(length(g), 0.0001);
    vec3 n = g / gm;
    vec3 gp = estimateBasicGradient(p + n * eps);
    vec3 gm2 = estimateBasicGradient(p - n * eps);
    return clamp(length(gp - gm2) / max(0.0001, 2.0 * eps * gm), 0.0, 8.0);
  }

  float morphedField(vec3 p) {
    float base = basicMorphedField(p);
    if (uDeveloperMode == 1 && (uDevParallelMode == 1 || uDevParallelMode == 3)) {
      float gradNorm = clamp(length(estimateBasicGradient(p)), 0.12, 6.0);
      float offset = uDevOffsetDistance;
      if (uDevParallelMode == 3) {
        float focal = curvaturePointinessProxy(p);
        float caustic = smoothstep(0.25, max(0.3, uDevPointinessClamp * 5.0), focal);
        offset += sign(uDevOffsetDistance + 0.0001) * uDevCausticStrength * caustic * 0.16;
      }
      return base - offset * gradNorm;
    }
    return base;
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

  void curvatureDiagnostics(vec3 p, out float meanError, out float gaussian, out float curvatureMagnitude, out float focalDistance) {
    float eps = clamp(uDevFiniteDifferenceEpsilon, 0.001, 0.04);
    float f = morphedField(p);
    float xp = morphedField(p + vec3(eps, 0.0, 0.0));
    float xm = morphedField(p - vec3(eps, 0.0, 0.0));
    float yp = morphedField(p + vec3(0.0, eps, 0.0));
    float ym = morphedField(p - vec3(0.0, eps, 0.0));
    float zp = morphedField(p + vec3(0.0, 0.0, eps));
    float zm = morphedField(p - vec3(0.0, 0.0, eps));

    vec3 g = vec3(xp - xm, yp - ym, zp - zm) / (2.0 * eps);
    float g2 = max(dot(g, g), 0.000001);
    float gLen = sqrt(g2);
    float fxx = (xp - 2.0 * f + xm) / (eps * eps);
    float fyy = (yp - 2.0 * f + ym) / (eps * eps);
    float fzz = (zp - 2.0 * f + zm) / (eps * eps);
    float fxy = (
      morphedField(p + vec3(eps, eps, 0.0)) -
      morphedField(p + vec3(eps, -eps, 0.0)) -
      morphedField(p + vec3(-eps, eps, 0.0)) +
      morphedField(p + vec3(-eps, -eps, 0.0))
    ) / (4.0 * eps * eps);
    float fxz = (
      morphedField(p + vec3(eps, 0.0, eps)) -
      morphedField(p + vec3(eps, 0.0, -eps)) -
      morphedField(p + vec3(-eps, 0.0, eps)) +
      morphedField(p + vec3(-eps, 0.0, -eps))
    ) / (4.0 * eps * eps);
    float fyz = (
      morphedField(p + vec3(0.0, eps, eps)) -
      morphedField(p + vec3(0.0, eps, -eps)) -
      morphedField(p + vec3(0.0, -eps, eps)) +
      morphedField(p + vec3(0.0, -eps, -eps))
    ) / (4.0 * eps * eps);

    mat3 h = mat3(
      fxx, fxy, fxz,
      fxy, fyy, fyz,
      fxz, fyz, fzz
    );
    vec3 hg = h * g;
    float traceH = fxx + fyy + fzz;
    float mean = (g2 * traceH - dot(g, hg)) / max(0.000001, 2.0 * g2 * gLen);
    float cxx = fyy * fzz - fyz * fyz;
    float cxy = fxz * fyz - fxy * fzz;
    float cxz = fxy * fyz - fxz * fyy;
    float cyy = fxx * fzz - fxz * fxz;
    float cyz = fxy * fxz - fxx * fyz;
    float czz = fxx * fyy - fxy * fxy;
    float cofactorQuadratic =
      g.x * (cxx * g.x + cxy * g.y + cxz * g.z) +
      g.y * (cxy * g.x + cyy * g.y + cyz * g.z) +
      g.z * (cxz * g.x + cyz * g.y + czz * g.z);
    gaussian = cofactorQuadratic / max(0.000001, g2 * g2);
    meanError = abs(mean);
    curvatureMagnitude = clamp(sqrt(max(0.0, mean * mean - gaussian)), 0.0, 8.0);
    focalDistance = 1.0 / max(0.035, curvatureMagnitude);
  }

  vec3 developerHeat(float t) {
    t = clamp(t, 0.0, 1.0);
    return mix(vec3(0.05, 0.25, 1.0), mix(vec3(0.0, 1.0, 0.72), vec3(1.0, 0.15, 0.03), smoothstep(0.35, 1.0, t)), smoothstep(0.0, 0.85, t));
  }

  vec3 applyDeveloperSurfaceColor(vec3 color, vec3 position, vec3 normal) {
    if (uDeveloperMode != 1) {
      return color;
    }

    float meanError;
    float gaussian;
    float curvatureMagnitude;
    float focalDistance;
    bool needsCurvature =
      uDevGeometryOverlay != 0 ||
      uDevParallelMode == 2 ||
      uDevParallelMode == 3 ||
      uDevMinimalityDiagnostic == 1;
    if (needsCurvature) {
      curvatureDiagnostics(position, meanError, gaussian, curvatureMagnitude, focalDistance);
    }

    vec3 devColor = color;
    if (uDevGeometryOverlay == 1) {
      devColor = developerHeat(curvatureMagnitude * 0.65);
    } else if (uDevGeometryOverlay == 2) {
      float bands = 0.5 + 0.5 * sin((position.x * normal.y - position.y * normal.x + position.z * 0.23) * 42.0);
      devColor = mix(vec3(0.0, 0.9, 1.0), vec3(1.0, 0.1, 0.85), smoothstep(0.38, 0.62, bands));
    } else if (uDevGeometryOverlay == 3) {
      float bands = 0.5 + 0.5 * sin((position.x + position.y - position.z + dot(normal, vec3(0.7, -0.2, 0.4))) * 34.0);
      devColor = mix(vec3(0.1, 1.0, 0.58), vec3(1.0, 0.75, 0.08), smoothstep(0.42, 0.6, bands));
    } else if (uDevGeometryOverlay == 4 || (uDevMinimalityDiagnostic == 1 && uDevScrewMode != 0)) {
      devColor = developerHeat(meanError * 10.0);
    } else if (uDevGeometryOverlay == 5) {
      devColor = developerHeat(1.0 - smoothstep(0.2, 2.8, focalDistance));
    }

    if (uDevBonnetMode != 0) {
      float phase =
        position.x * 2.2 +
        position.y * 1.3 -
        position.z * 1.7 +
        uDevStripPhase * 6.2831853 +
        uDevBonnetParameter * 3.1415926;
      float stripe = smoothstep(0.5 - uDevStripWidth, 0.5, 0.5 + 0.5 * sin(phase * 6.0));
      vec3 stripColor = mix(vec3(0.04, 0.95, 1.0), vec3(1.0, 0.86, 0.26), stripe);
      color *= mix(0.28, 1.0, clamp(uDevBaseSurfaceFade, 0.0, 1.0));
      devColor = mix(color, stripColor, 0.62 + 0.24 * stripe);
    }

    if (uDevParallelMode == 2 || uDevParallelMode == 3) {
      float nearFocal = smoothstep(0.0, max(0.08, uDevPointinessClamp), curvatureMagnitude);
      vec3 caustic = mix(vec3(0.08, 0.85, 1.0), vec3(1.0, 0.95, 0.38), nearFocal);
      devColor = mix(devColor, caustic, uDevCausticStrength * (0.35 + nearFocal * 0.4));
    }

    return mix(color, devColor, clamp(uDevOverlayStrength, 0.0, 1.0));
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
    color = applyDeveloperSurfaceColor(color, hitPosition, normal);
    gl_FragColor = vec4(color, 1.0);
  }
`;

function buildFragmentShader(settings: RaymarchShaderSettings) {
  if (settings.morphPath === 'Cycle all families') {
    if (settings.developerShaderMode === 'live') {
      return buildLiveFragmentShader(fragmentShader, liveCycleMorphedFieldBlock());
    }
    return buildLeanFragmentShader(fragmentShader, cycleMorphedFieldBlock());
  }

  const requiredPresets = [settings.preset, 'Gyroid' as SurfacePreset, 'Schwarz P' as SurfacePreset, 'Diamond' as SurfacePreset];
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
  const morphedBaseValue =
    settings.morphPath === 'A to B pulse'
      ? /* glsl */ `
  float morphedBaseValue(vec3 q) {
    if (uDeveloperMode == 1 && uDevBonnetMode == 1) {
      float t = smootherstep(uDevBonnetParameter);
      float pField = schwarzP(q);
      float gField = gyroid(q);
      float dField = diamond(q);
      return t < 0.5
        ? mix(pField, gField, smootherstep(t * 2.0))
        : mix(gField, dField, smootherstep((t - 0.5) * 2.0));
    }
    return mix(${presetField}(q), ${targetField}(q), smootherstep(uMorphAmount));
  }

  float basicMorphedField(vec3 p) {
    vec3 q = developerDomain(p) * uFrequency;
    return morphedBaseValue(q) - uIsoLevel;
  }

  vec3 estimateBasicGradient(vec3 p) {
    float eps = max(0.0035, 0.012 / max(0.8, uFrequency));
    vec2 e = vec2(eps, 0.0);
    return vec3(
      basicMorphedField(p + e.xyy) - basicMorphedField(p - e.xyy),
      basicMorphedField(p + e.yxy) - basicMorphedField(p - e.yxy),
      basicMorphedField(p + e.yyx) - basicMorphedField(p - e.yyx)
    ) / (2.0 * eps);
  }

  float curvaturePointinessProxy(vec3 p) {
    float eps = max(0.006, uDevFiniteDifferenceEpsilon);
    vec3 g = estimateBasicGradient(p);
    float gm = max(length(g), 0.0001);
    vec3 n = g / gm;
    vec3 gp = estimateBasicGradient(p + n * eps);
    vec3 gm2 = estimateBasicGradient(p - n * eps);
    return clamp(length(gp - gm2) / max(0.0001, 2.0 * eps * gm), 0.0, 8.0);
  }

  float morphedField(vec3 p) {
    float base = basicMorphedField(p);
    if (uDeveloperMode == 1 && (uDevParallelMode == 1 || uDevParallelMode == 3)) {
      float gradNorm = clamp(length(estimateBasicGradient(p)), 0.12, 6.0);
      float offset = uDevOffsetDistance;
      if (uDevParallelMode == 3) {
        float focal = curvaturePointinessProxy(p);
        float caustic = smoothstep(0.25, max(0.3, uDevPointinessClamp * 5.0), focal);
        offset += sign(uDevOffsetDistance + 0.0001) * uDevCausticStrength * caustic * 0.16;
      }
      return base - offset * gradNorm;
    }
    return base;
  }

  bool raySphere`
      : /* glsl */ `
  float morphedBaseValue(vec3 q) {
    if (uDeveloperMode == 1 && uDevBonnetMode == 1) {
      float t = smootherstep(uDevBonnetParameter);
      float pField = schwarzP(q);
      float gField = gyroid(q);
      float dField = diamond(q);
      return t < 0.5
        ? mix(pField, gField, smootherstep(t * 2.0))
        : mix(gField, dField, smootherstep((t - 0.5) * 2.0));
    }
    return ${presetField}(q);
  }

  float basicMorphedField(vec3 p) {
    vec3 q = developerDomain(p) * uFrequency;
    return morphedBaseValue(q) - uIsoLevel;
  }

  vec3 estimateBasicGradient(vec3 p) {
    float eps = max(0.0035, 0.012 / max(0.8, uFrequency));
    vec2 e = vec2(eps, 0.0);
    return vec3(
      basicMorphedField(p + e.xyy) - basicMorphedField(p - e.xyy),
      basicMorphedField(p + e.yxy) - basicMorphedField(p - e.yxy),
      basicMorphedField(p + e.yyx) - basicMorphedField(p - e.yyx)
    ) / (2.0 * eps);
  }

  float curvaturePointinessProxy(vec3 p) {
    float eps = max(0.006, uDevFiniteDifferenceEpsilon);
    vec3 g = estimateBasicGradient(p);
    float gm = max(length(g), 0.0001);
    vec3 n = g / gm;
    vec3 gp = estimateBasicGradient(p + n * eps);
    vec3 gm2 = estimateBasicGradient(p - n * eps);
    return clamp(length(gp - gm2) / max(0.0001, 2.0 * eps * gm), 0.0, 8.0);
  }

  float morphedField(vec3 p) {
    float base = basicMorphedField(p);
    if (uDeveloperMode == 1 && (uDevParallelMode == 1 || uDevParallelMode == 3)) {
      float gradNorm = clamp(length(estimateBasicGradient(p)), 0.12, 6.0);
      float offset = uDevOffsetDistance;
      if (uDevParallelMode == 3) {
        float focal = curvaturePointinessProxy(p);
        float caustic = smoothstep(0.25, max(0.3, uDevPointinessClamp * 5.0), focal);
        offset += sign(uDevOffsetDistance + 0.0001) * uDevCausticStrength * caustic * 0.16;
      }
      return base - offset * gradNorm;
    }
    return base;
  }

  bool raySphere`;

  const shader = fragmentShader
    .replace(/ {2}float gyroid\(vec3 p\) \{[\s\S]*? {2}vec3 animatedDomain/, fieldSection)
    .replace(/ {2}float morphedBaseValue\(vec3 q\) \{[\s\S]*? {2}bool raySphere/, morphedBaseValue);

  if (settings.developerShaderMode === 'live') {
    return buildLiveFragmentShader(
      shader,
      liveMorphedFieldBlock(settings.morphPath, presetField, targetField),
    );
  }

  const leanMorphedField =
    settings.morphPath === 'A to B pulse'
      ? /* glsl */ `
  float morphedField(vec3 p) {
    vec3 q = animatedDomain(p) * uFrequency;
    return mix(${presetField}(q), ${targetField}(q), smootherstep(uMorphAmount)) - uIsoLevel;
  }

  bool raySphere`
      : /* glsl */ `
  float morphedField(vec3 p) {
    vec3 q = animatedDomain(p) * uFrequency;
    return ${presetField}(q) - uIsoLevel;
  }

  bool raySphere`;

  return buildLeanFragmentShader(shader, leanMorphedField);
}

function cycleMorphedFieldBlock() {
  return /* glsl */ `
  float morphedField(vec3 p) {
    vec3 q = animatedDomain(p) * uFrequency;
    float scaled = fract(uMorphAmount) * SURFACE_COUNT;
    int fromIndex = int(floor(scaled));
    int toIndex = int(mod(float(fromIndex + 1), SURFACE_COUNT));
    float t = smootherstep(fract(scaled));
    return mix(fieldByIndex(fromIndex, q), fieldByIndex(toIndex, q), t) - uIsoLevel;
  }

  bool raySphere`;
}

function liveDeveloperDomainBlock() {
  return /* glsl */ `
  vec2 screwDefectCenter(int index, float core) {
    if (uDevScrewMode == 2) {
      return index == 0 ? vec2(-core, 0.0) : vec2(core, 0.0);
    }
    if (uDevScrewMode == 5) {
      float angle = 6.2831853 * float(index) / 6.0 + uDevStripPhase * 6.2831853;
      return vec2(cos(angle), sin(angle)) * core * 1.25;
    }
    return vec2(0.0);
  }

  float screwDefectSign(int index) {
    if (uDevScrewMode == 2) {
      return index == 0 ? 1.0 : -1.0;
    }
    if (uDevScrewMode == 5) {
      return mod(float(index), 2.0) < 0.5 ? 1.0 : -1.0;
    }
    return 1.0;
  }

  int screwDefectCount() {
    if (uDevScrewMode == 2) return 2;
    if (uDevScrewMode == 5) return 6;
    return 1;
  }

  float screwFocus(float r, float core) {
    float sharpness = clamp(uDevScrewSharpness, 1.0, 8.0);
    return exp(-pow(max(r / max(core, 0.001), 0.0), sharpness));
  }

  vec3 applySmoothScrewDefect(vec3 p, int index, float core) {
    vec2 center = screwDefectCenter(index, core);
    float sign = screwDefectSign(index);
    vec2 delta = p.xy - center;
    float r = length(delta);
    float focus = screwFocus(r, core);
    float turns = max(0.05, uDevScrewTurns);
    float helicalPhase =
      p.z * turns * 6.2831853 +
      uDevStripPhase * 6.2831853 +
      float(index) * 1.2566371;
    bool helicalMode = uDevScrewMode == 3 || uDevScrewMode == 4 || uDevScrewMode == 5;
    float helicalMix = helicalMode ? 0.55 + 0.45 * sin(helicalPhase) : 1.0;
    float angle = sign * uDevScrewStrength * focus * (1.15 + helicalMix);
    vec2 rotated = rotate2d(angle) * delta;
    float pinchWave = 0.65 + 0.35 * cos(helicalPhase);
    float pinchGain = (uDevScrewMode == 4 || uDevScrewMode == 5) ? 0.62 : 0.22;
    float radialScale = max(0.06, 1.0 - uDevScrewPinch * focus * pinchGain * pinchWave);
    p.xy = center + rotated * radialScale;
    p.z +=
      sign * uDevScrewStrength * focus * 0.08 * sin(helicalPhase) +
      uDevScrewPinch * focus * 0.06 * cos(helicalPhase);
    return p;
  }

  vec3 developerDomain(vec3 p) {
    p = animatedDomain(p);
    if (
      uDeveloperMode == 1 &&
      uDevScrewMode != 0 &&
      (abs(uDevScrewStrength) > 0.0001 || abs(uDevScrewPinch) > 0.0001)
    ) {
      float core = max(0.05, uDevScrewCoreRadius);
      int defectCount = screwDefectCount();
      for (int i = 0; i < 6; i++) {
        if (i >= defectCount) break;
        p = applySmoothScrewDefect(p, i, core);
      }
    }
    return p;
  }

  float developerScrewRelief(vec3 p) {
    if (uDeveloperMode != 1 || uDevScrewMode == 0) {
      return 0.0;
    }

    float core = max(0.05, uDevScrewCoreRadius);
    float turns = max(0.05, uDevScrewTurns);
    float relief = 0.0;
    int defectCount = screwDefectCount();
    for (int i = 0; i < 6; i++) {
      if (i >= defectCount) break;
      vec2 center = screwDefectCenter(i, core);
      float sign = screwDefectSign(i);
      vec2 delta = p.xy - center;
      float r = length(delta);
      vec2 direction = delta / max(r, 0.0001);
      float coreFade = smoothstep(0.0, core * 0.16, r);
      float focus = screwFocus(r, core) * coreFade;
      float phase =
        p.z * turns * 6.2831853 +
        uDevStripPhase * 6.2831853 +
        float(i) * 1.2566371;
      vec2 helixDirection = vec2(cos(phase), sin(phase));
      float spiralArm = dot(direction, helixDirection);
      float thorn = pow(max(0.0, 0.5 + 0.5 * spiralArm), clamp(uDevScrewSharpness, 1.0, 8.0));
      float modeGain = (uDevScrewMode == 4 || uDevScrewMode == 5) ? 1.55 : 1.0;
      relief += sign * focus * spiralArm * abs(uDevScrewStrength) * 0.035;
      relief += focus * thorn * uDevScrewPinch * 0.07 * modeGain;
    }
    return relief;
  }
`;
}

function liveCycleMorphedFieldBlock() {
  return /* glsl */ `
${liveDeveloperDomainBlock()}
  float selectedDeveloperBaseField(vec3 q) {
    float scaled = fract(uMorphAmount) * SURFACE_COUNT;
    int fromIndex = int(floor(scaled));
    int toIndex = int(mod(float(fromIndex + 1), SURFACE_COUNT));
    float t = smootherstep(fract(scaled));
    return mix(fieldByIndex(fromIndex, q), fieldByIndex(toIndex, q), t);
  }

  float morphedBaseValue(vec3 q) {
    float base = selectedDeveloperBaseField(q);
    if (uDeveloperMode == 1 && uDevBonnetMode == 1) {
      float t = smootherstep(uDevBonnetParameter);
      float pField = schwarzP(q);
      float gField = gyroid(q);
      float dField = diamond(q);
      base = t < 0.5
        ? mix(pField, gField, smootherstep(t * 2.0))
        : mix(gField, dField, smootherstep((t - 0.5) * 2.0));
    }
    if (uDeveloperMode == 1 && uDevBonnetMode == 2) {
      float phase =
        q.x * 0.7 +
        q.y * 0.42 -
        q.z * 0.55 +
        uDevStripPhase * 6.2831853 +
        uDevBonnetParameter * 3.1415926;
      base += sin(phase * 6.0) * uDevStripWidth * 1.35;
    }
    return base;
  }

  float morphedField(vec3 p) {
    vec3 q = developerDomain(p) * uFrequency;
    float base = morphedBaseValue(q) - uIsoLevel;
    base += developerScrewRelief(p);
    if (uDeveloperMode == 1 && uDevParallelMode == 1) {
      base -= uDevOffsetDistance;
    } else if (uDeveloperMode == 1 && uDevParallelMode == 3) {
      float shell =
        sin(q.x * 1.7 + q.y * 1.1 - q.z * 1.4 + uTime * 0.18) *
        sin(q.y * 1.3 + q.z * 0.9 + uDevBonnetParameter * 6.2831853);
      base -= uDevOffsetDistance + shell * uDevCausticStrength * 0.055;
    }
    return base;
  }

  bool raySphere`;
}

function liveMorphedFieldBlock(morphPath: MorphPath, presetField: string, targetField: string) {
  const selectedField =
    morphPath === 'A to B pulse'
      ? `mix(${presetField}(q), ${targetField}(q), smootherstep(uMorphAmount))`
      : `${presetField}(q)`;

  return /* glsl */ `
${liveDeveloperDomainBlock()}
  float selectedDeveloperBaseField(vec3 q) {
    return ${selectedField};
  }

  float morphedBaseValue(vec3 q) {
    float base = selectedDeveloperBaseField(q);
    if (uDeveloperMode == 1 && uDevBonnetMode == 1) {
      float t = smootherstep(uDevBonnetParameter);
      float pField = schwarzP(q);
      float gField = gyroid(q);
      float dField = diamond(q);
      base = t < 0.5
        ? mix(pField, gField, smootherstep(t * 2.0))
        : mix(gField, dField, smootherstep((t - 0.5) * 2.0));
    }
    if (uDeveloperMode == 1 && uDevBonnetMode == 2) {
      float phase =
        q.x * 0.7 +
        q.y * 0.42 -
        q.z * 0.55 +
        uDevStripPhase * 6.2831853 +
        uDevBonnetParameter * 3.1415926;
      base += sin(phase * 6.0) * uDevStripWidth * 1.35;
    }
    return base;
  }

  float morphedField(vec3 p) {
    vec3 q = developerDomain(p) * uFrequency;
    float base = morphedBaseValue(q) - uIsoLevel;
    base += developerScrewRelief(p);
    if (uDeveloperMode == 1 && uDevParallelMode == 1) {
      base -= uDevOffsetDistance;
    } else if (uDeveloperMode == 1 && uDevParallelMode == 3) {
      float shell =
        sin(q.x * 1.7 + q.y * 1.1 - q.z * 1.4 + uTime * 0.18) *
        sin(q.y * 1.3 + q.z * 0.9 + uDevBonnetParameter * 6.2831853);
      base -= uDevOffsetDistance + shell * uDevCausticStrength * 0.055;
    }
    return base;
  }

  bool raySphere`;
}

function liveDeveloperColorBlock() {
  return /* glsl */ `
  vec3 developerHeat(float t) {
    t = clamp(t, 0.0, 1.0);
    return mix(vec3(0.05, 0.25, 1.0), mix(vec3(0.0, 1.0, 0.72), vec3(1.0, 0.15, 0.03), smoothstep(0.35, 1.0, t)), smoothstep(0.0, 0.85, t));
  }

  vec3 applyDeveloperSurfaceColor(vec3 color, vec3 position, vec3 normal) {
    if (uDeveloperMode != 1) {
      return color;
    }

    float radius = length(position) / max(0.001, uCropRadius);
    float pseudoCurvature = abs(sin(position.x * 3.7 + position.y * 2.3 - position.z * 2.9));
    pseudoCurvature *= 0.55 + 0.45 * abs(dot(normal, normalize(position + vec3(0.17, -0.11, 0.23))));
    float principalBands = 0.5 + 0.5 * sin((position.x * normal.y - position.y * normal.x + position.z * 0.23) * 42.0);
    float asymptoticBands = 0.5 + 0.5 * sin((position.x + position.y - position.z + dot(normal, vec3(0.7, -0.2, 0.4))) * 34.0);

    vec3 devColor = color;
    if (uDevGeometryOverlay == 1) {
      devColor = developerHeat(pseudoCurvature);
    } else if (uDevGeometryOverlay == 2) {
      devColor = mix(vec3(0.0, 0.9, 1.0), vec3(1.0, 0.1, 0.85), smoothstep(0.38, 0.62, principalBands));
    } else if (uDevGeometryOverlay == 3) {
      devColor = mix(vec3(0.1, 1.0, 0.58), vec3(1.0, 0.75, 0.08), smoothstep(0.42, 0.6, asymptoticBands));
    } else if (uDevGeometryOverlay == 4 || (uDevMinimalityDiagnostic == 1 && uDevScrewMode != 0)) {
      devColor = developerHeat(abs(sin(radius * 18.0 + position.x * 2.0 - position.z * 1.5)));
    } else if (uDevGeometryOverlay == 5) {
      devColor = developerHeat(1.0 - smoothstep(0.12, 0.88, abs(dot(normal, normalize(position + vec3(0.01, -0.02, 0.03))))));
    }

    if (uDevBonnetMode != 0) {
      float phase =
        position.x * 2.2 +
        position.y * 1.3 -
        position.z * 1.7 +
        uDevStripPhase * 6.2831853 +
        uDevBonnetParameter * 3.1415926;
      float stripe = smoothstep(0.5 - uDevStripWidth, 0.5, 0.5 + 0.5 * sin(phase * 6.0));
      vec3 stripColor = mix(vec3(0.04, 0.95, 1.0), vec3(1.0, 0.86, 0.26), stripe);
      color *= mix(0.28, 1.0, clamp(uDevBaseSurfaceFade, 0.0, 1.0));
      devColor = mix(color, stripColor, 0.62 + 0.24 * stripe);
    }

    if (uDevParallelMode == 2 || uDevParallelMode == 3) {
      float causticPhase = 0.5 + 0.5 * sin(position.x * 9.0 - position.y * 6.0 + position.z * 7.0);
      vec3 caustic = mix(vec3(0.08, 0.85, 1.0), vec3(1.0, 0.95, 0.38), causticPhase);
      devColor = mix(devColor, caustic, uDevCausticStrength * (0.25 + causticPhase * 0.45));
    }

    return mix(color, devColor, clamp(uDevOverlayStrength, 0.0, 1.0));
  }

  bool findSurface`;
}

function buildLiveFragmentShader(shader: string, morphedFieldBlock: string) {
  return shader
    .replace(
      / {2}vec3 developerDomain\(vec3 p\) \{[\s\S]*? {2}bool raySphere/,
      morphedFieldBlock,
    )
    .replace(
      / {2}void curvatureDiagnostics\(vec3 p, out float meanError, out float gaussian, out float curvatureMagnitude, out float focalDistance\) \{[\s\S]*? {2}bool findSurface/,
      liveDeveloperColorBlock(),
    );
}

function buildLeanFragmentShader(shader: string, morphedFieldBlock: string) {
  return shader
    .replace(
      / {2}uniform int uDeveloperMode;[\s\S]*? {2}uniform int uDevMinimalityDiagnostic;\n/,
      '',
    )
    .replace(
      / {2}vec3 developerDomain\(vec3 p\) \{[\s\S]*? {2}bool raySphere/,
      morphedFieldBlock,
    )
    .replace(
      / {2}void curvatureDiagnostics\(vec3 p, out float meanError, out float gaussian, out float curvatureMagnitude, out float focalDistance\) \{[\s\S]*? {2}bool findSurface/,
      /* glsl */ `
  vec3 applyDeveloperSurfaceColor(vec3 color, vec3 position, vec3 normal) {
    return color;
  }

  bool findSurface`,
    );
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
      uDeveloperMode: { value: 0 },
      uDevGeometryOverlay: { value: 0 },
      uDevOverlayStrength: { value: 0.5 },
      uDevFiniteDifferenceEpsilon: { value: 0.006 },
      uDevBonnetMode: { value: 0 },
      uDevBonnetParameter: { value: 0.5 },
      uDevStripPhase: { value: 0 },
      uDevStripWidth: { value: 0.055 },
      uDevBaseSurfaceFade: { value: 1 },
      uDevParallelMode: { value: 0 },
      uDevOffsetDistance: { value: 0.08 },
      uDevCausticStrength: { value: 0.5 },
      uDevPointinessClamp: { value: 0.28 },
      uDevScrewMode: { value: 0 },
      uDevScrewStrength: { value: 0 },
      uDevScrewCoreRadius: { value: 0.7 },
      uDevScrewTurns: { value: 2.6 },
      uDevScrewPinch: { value: 0.25 },
      uDevScrewSharpness: { value: 3.2 },
      uDevMinimalityDiagnostic: { value: 1 },
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
    developer: DeveloperRaymarchSettings;
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
  if (uniforms.uDeveloperMode) {
    uniforms.uDeveloperMode.value = options.developer.enabled ? 1 : 0;
    uniforms.uDevGeometryOverlay.value = options.developer.geometryOverlay;
    uniforms.uDevOverlayStrength.value = options.developer.overlayStrength;
    uniforms.uDevFiniteDifferenceEpsilon.value = options.developer.finiteDifferenceEpsilon;
    uniforms.uDevBonnetMode.value = options.developer.bonnetStripMode;
    uniforms.uDevBonnetParameter.value = options.developer.bonnetParameter;
    uniforms.uDevStripPhase.value = options.developer.stripPhase;
    uniforms.uDevStripWidth.value = options.developer.stripWidth;
    uniforms.uDevBaseSurfaceFade.value = options.developer.baseSurfaceFade;
    uniforms.uDevParallelMode.value = options.developer.parallelFocalMode;
    uniforms.uDevOffsetDistance.value = options.developer.offsetDistance;
    uniforms.uDevCausticStrength.value = options.developer.causticStrength;
    uniforms.uDevPointinessClamp.value = options.developer.pointinessClamp;
    uniforms.uDevScrewMode.value = options.developer.screwPhase;
    uniforms.uDevScrewStrength.value = options.developer.screwStrength;
    uniforms.uDevScrewCoreRadius.value = options.developer.screwCoreRadius;
    uniforms.uDevScrewTurns.value = options.developer.screwTurns;
    uniforms.uDevScrewPinch.value = options.developer.screwPinch;
    uniforms.uDevScrewSharpness.value = options.developer.screwSharpness;
    uniforms.uDevMinimalityDiagnostic.value = options.developer.minimalityDiagnostic ? 1 : 0;
  }
  uniforms.uRimStrength.value =
    options.colorMode === 'metallic white/gold rim emphasis'
      ? 2.2
      : options.colorMode === 'monochrome porcelain/glass'
        ? 1.55
        : 1.2;
}
