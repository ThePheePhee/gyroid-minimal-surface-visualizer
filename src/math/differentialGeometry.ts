import * as THREE from 'three';
import type { ScalarField } from './scalarFields';

export type SurfaceJet = {
  f: number;
  grad: THREE.Vector3;
  hessian: THREE.Matrix3;
  normal: THREE.Vector3;
  tangentBasis: [THREE.Vector3, THREE.Vector3];
  shapeOperator2D: [number, number, number, number];
  meanCurvature: number;
  gaussianCurvature: number;
  principalCurvatures: [number, number];
  principalDirections: [THREE.Vector3, THREE.Vector3];
  asymptoticDirections: [THREE.Vector3, THREE.Vector3];
  gradNorm: number;
};

export type SurfaceValue = (p: THREE.Vector3) => number;

export function createSurfaceValue(options: {
  field: ScalarField;
  frequency: number;
  isoLevel: number;
  screw?: ScrewPhaseOptions;
}) {
  return (p: THREE.Vector3) => {
    const q = applyScrewPhase(p, options.screw).multiplyScalar(options.frequency);
    return options.field(q.x, q.y, q.z) - options.isoLevel;
  };
}

export type ScrewPhaseOptions = {
  mode: 'Off' | 'Single Defect' | 'Paired Defects' | 'Helical Corkscrew' | 'Spiral Pinch' | 'Thorn Crown';
  strength: number;
  coreRadius: number;
  turns?: number;
  pinch?: number;
  sharpness?: number;
  phase?: number;
};

// Smooth coordinate-domain vortex deformation. It avoids direct angular phase
// offsets, so the map has no theta branch cut even at high screw strengths.
export function applyScrewPhase(p: THREE.Vector3, options?: ScrewPhaseOptions) {
  const q = p.clone();
  if (!options || options.mode === 'Off') {
    return q;
  }

  const core = Math.max(0.05, options.coreRadius);
  const turns = Math.max(0.05, options.turns ?? 2.6);
  const pinch = options.pinch ?? 0.25;
  if (Math.abs(options.strength) < 1e-6 && Math.abs(pinch) < 1e-6) {
    return q;
  }
  const sharpness = Math.max(1, options.sharpness ?? 3.2);
  const phase = (options.phase ?? 0) * Math.PI * 2;

  if (options.mode === 'Paired Defects') {
    applyLocalScrew(q, options, core, turns, pinch, sharpness, -core, 0, 1, phase);
    applyLocalScrew(q, options, core, turns, pinch, sharpness, core, 0, -1, phase + Math.PI);
  } else if (options.mode === 'Thorn Crown') {
    applyCrownScrew(q, options, core, turns, pinch, sharpness, phase);
  } else {
    applyLocalScrew(q, options, core, turns, pinch, sharpness, 0, 0, 1, phase);
  }

  return q;
}

function applyLocalScrew(
  q: THREE.Vector3,
  options: ScrewPhaseOptions,
  core: number,
  turns: number,
  pinch: number,
  sharpness: number,
  centerX: number,
  centerY: number,
  sign: number,
  phaseOffset: number,
) {
  const dx = q.x - centerX;
  const dy = q.y - centerY;
  const r = Math.hypot(dx, dy);
  const focus = Math.exp(-Math.pow(r / core, sharpness));
  const helixPhase = q.z * turns * Math.PI * 2 + phaseOffset;
  const helical = options.mode === 'Helical Corkscrew' || options.mode === 'Spiral Pinch';
  const helicalMix = helical ? 0.55 + 0.45 * Math.sin(helixPhase) : 1;
  const angle = sign * options.strength * focus * (1.15 + helicalMix);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const pinchWave = 0.65 + 0.35 * Math.cos(helixPhase);
  const pinchGain = options.mode === 'Spiral Pinch' ? 0.62 : 0.22;
  const radialScale = Math.max(0.06, 1 - pinch * focus * pinchGain * pinchWave);
  q.x = centerX + (cos * dx - sin * dy) * radialScale;
  q.y = centerY + (sin * dx + cos * dy) * radialScale;
  q.z += sign * options.strength * focus * 0.08 * Math.sin(helixPhase) + pinch * focus * 0.06 * Math.cos(helixPhase);
}

function applyCrownScrew(
  q: THREE.Vector3,
  options: ScrewPhaseOptions,
  core: number,
  turns: number,
  pinch: number,
  sharpness: number,
  phaseOffset: number,
) {
  const r = Math.hypot(q.x, q.y);
  const ux = q.x / Math.max(r, 1e-7);
  const uy = q.y / Math.max(r, 1e-7);
  const squaredX = ux * ux - uy * uy;
  const squaredY = 2 * ux * uy;
  const cubedX = squaredX * ux - squaredY * uy;
  const cubedY = squaredX * uy + squaredY * ux;
  const harmonicX = cubedX * cubedX - cubedY * cubedY;
  const harmonicY = 2 * cubedX * cubedY;
  const phase = q.z * turns * Math.PI * 2 + phaseOffset;
  const spiral = harmonicX * Math.cos(phase) + harmonicY * Math.sin(phase);
  const ringCoordinate = Math.abs(r - core * 1.25) / Math.max(0.08, core * 0.58);
  const centerFade = smoothstep(0, Math.max(0.04, core * 0.18), r);
  const focus = Math.exp(-Math.pow(ringCoordinate, sharpness)) * centerFade;
  const angle = options.strength * focus * (1.05 + 0.72 * spiral);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const radialScale = Math.max(0.08, 1 - pinch * focus * 0.48 * (0.72 + 0.28 * spiral));
  const x = q.x;
  const y = q.y;
  q.x = (cos * x - sin * y) * radialScale;
  q.y = (sin * x + cos * y) * radialScale;
  q.z += focus * (
    options.strength * 0.07 * spiral +
    pinch * 0.055 * (-harmonicX * Math.sin(phase) + harmonicY * Math.cos(phase))
  );
}

function smoothstep(edge0: number, edge1: number, value: number) {
  const t = THREE.MathUtils.clamp((value - edge0) / Math.max(1e-7, edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

export function evaluateSurfaceJet(value: SurfaceValue, p: THREE.Vector3, epsilon: number): SurfaceJet {
  const eps = Math.max(1e-4, epsilon);
  const f = value(p);
  const xp = value(offset(p, eps, 0, 0));
  const xm = value(offset(p, -eps, 0, 0));
  const yp = value(offset(p, 0, eps, 0));
  const ym = value(offset(p, 0, -eps, 0));
  const zp = value(offset(p, 0, 0, eps));
  const zm = value(offset(p, 0, 0, -eps));

  const grad = new THREE.Vector3(xp - xm, yp - ym, zp - zm).divideScalar(2 * eps);
  const gradNorm = Math.max(grad.length(), 1e-7);
  const normal = grad.clone().divideScalar(gradNorm);

  const fxx = (xp - 2 * f + xm) / (eps * eps);
  const fyy = (yp - 2 * f + ym) / (eps * eps);
  const fzz = (zp - 2 * f + zm) / (eps * eps);
  const fxy = mixedSecond(value, p, eps, 'x', 'y');
  const fxz = mixedSecond(value, p, eps, 'x', 'z');
  const fyz = mixedSecond(value, p, eps, 'y', 'z');
  const hessian = new THREE.Matrix3().set(fxx, fxy, fxz, fxy, fyy, fyz, fxz, fyz, fzz);

  const tangentBasis = makeTangentBasis(normal);
  const [u, v] = tangentBasis;
  const hu = applyHessian(hessian, u);
  const hv = applyHessian(hessian, v);

  // diagnostic approximation: shape operator for F=iso, restricted to tangent basis.
  const a = -u.dot(hu) / gradNorm;
  const b = -u.dot(hv) / gradNorm;
  const c = -v.dot(hu) / gradNorm;
  const d = -v.dot(hv) / gradNorm;
  const symmetricB = 0.5 * (b + c);
  const meanCurvature = 0.5 * (a + d);
  const gaussianCurvature = a * d - symmetricB * symmetricB;
  const [k1, k2, localE1, localE2] = eigenSymmetric2(a, symmetricB, d);
  const principalDirections: [THREE.Vector3, THREE.Vector3] = [
    u.clone().multiplyScalar(localE1.x).addScaledVector(v, localE1.y).normalize(),
    u.clone().multiplyScalar(localE2.x).addScaledVector(v, localE2.y).normalize(),
  ];
  const asymptoticDirections: [THREE.Vector3, THREE.Vector3] = [
    principalDirections[0].clone().add(principalDirections[1]).normalize(),
    principalDirections[0].clone().sub(principalDirections[1]).normalize(),
  ];

  return {
    f,
    grad,
    hessian,
    normal,
    tangentBasis,
    shapeOperator2D: [a, b, c, d],
    meanCurvature,
    gaussianCurvature,
    principalCurvatures: [k1, k2],
    principalDirections,
    asymptoticDirections,
    gradNorm,
  };
}

export function projectToSurface(
  value: SurfaceValue,
  p: THREE.Vector3,
  epsilon: number,
  maxIterations = 6,
) {
  const projected = p.clone();
  for (let i = 0; i < maxIterations; i++) {
    const jet = evaluateSurfaceJet(value, projected, epsilon);
    if (Math.abs(jet.f) < epsilon * 0.5 || jet.gradNorm < 1e-6) {
      break;
    }
    projected.addScaledVector(jet.grad, -jet.f / (jet.gradNorm * jet.gradNorm));
  }
  return projected;
}

function offset(p: THREE.Vector3, x: number, y: number, z: number) {
  return new THREE.Vector3(p.x + x, p.y + y, p.z + z);
}

function mixedSecond(value: SurfaceValue, p: THREE.Vector3, eps: number, a: 'x' | 'y' | 'z', b: 'x' | 'y' | 'z') {
  const pp = p.clone();
  const pm = p.clone();
  const mp = p.clone();
  const mm = p.clone();
  pp[a] += eps;
  pp[b] += eps;
  pm[a] += eps;
  pm[b] -= eps;
  mp[a] -= eps;
  mp[b] += eps;
  mm[a] -= eps;
  mm[b] -= eps;
  return (value(pp) - value(pm) - value(mp) + value(mm)) / (4 * eps * eps);
}

function makeTangentBasis(normal: THREE.Vector3): [THREE.Vector3, THREE.Vector3] {
  const reference = Math.abs(normal.y) < 0.82 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  const u = reference.cross(normal).normalize();
  const v = normal.clone().cross(u).normalize();
  return [u, v];
}

function applyHessian(hessian: THREE.Matrix3, vector: THREE.Vector3) {
  const e = hessian.elements;
  return new THREE.Vector3(
    e[0] * vector.x + e[3] * vector.y + e[6] * vector.z,
    e[1] * vector.x + e[4] * vector.y + e[7] * vector.z,
    e[2] * vector.x + e[5] * vector.y + e[8] * vector.z,
  );
}

function eigenSymmetric2(a: number, b: number, d: number): [number, number, THREE.Vector2, THREE.Vector2] {
  const trace = a + d;
  const delta = Math.sqrt(Math.max(0, (a - d) * (a - d) + 4 * b * b));
  const k1 = 0.5 * (trace + delta);
  const k2 = 0.5 * (trace - delta);
  const e1 = eigenVector(a, b, d, k1);
  const e2 = new THREE.Vector2(-e1.y, e1.x);
  return [k1, k2, e1, e2];
}

function eigenVector(a: number, b: number, d: number, lambda: number) {
  const vector = Math.abs(b) > 1e-7 ? new THREE.Vector2(b, lambda - a) : new THREE.Vector2(1, 0);
  if (vector.lengthSq() < 1e-10) {
    return Math.abs(a - lambda) < Math.abs(d - lambda) ? new THREE.Vector2(1, 0) : new THREE.Vector2(0, 1);
  }
  return vector.normalize();
}
