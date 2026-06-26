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
  mode: 'Off' | 'Single Defect' | 'Paired Defects';
  strength: number;
  coreRadius: number;
};

// approximate: this is a coordinate-domain phase defect, not a minimal-surface deformation.
export function applyScrewPhase(p: THREE.Vector3, options?: ScrewPhaseOptions) {
  const q = p.clone();
  if (!options || options.mode === 'Off' || Math.abs(options.strength) < 1e-6) {
    return q;
  }

  const core = Math.max(0.05, options.coreRadius);
  const defects =
    options.mode === 'Paired Defects'
      ? [
          { x: -core, y: 0, sign: 1 },
          { x: core, y: 0, sign: -1 },
        ]
      : [{ x: 0, y: 0, sign: 1 }];

  let phase = 0;
  for (const defect of defects) {
    const dx = q.x - defect.x;
    const dy = q.y - defect.y;
    const falloff = 1 - Math.exp(-(dx * dx + dy * dy) / (core * core));
    phase += defect.sign * Math.atan2(dy, dx) * falloff;
  }

  q.x += options.strength * phase;
  q.z += options.strength * 0.35 * Math.sin(phase);
  return q;
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

export function jetScalar(jet: SurfaceJet, mode: 'gaussian' | 'minimality' | 'curvatureMagnitude' | 'focalDistance') {
  const magnitude = Math.max(Math.abs(jet.principalCurvatures[0]), Math.abs(jet.principalCurvatures[1]));
  if (mode === 'gaussian') return jet.gaussianCurvature;
  if (mode === 'minimality') return Math.abs(jet.meanCurvature);
  if (mode === 'focalDistance') return 1 / Math.max(0.03, magnitude);
  return magnitude;
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
