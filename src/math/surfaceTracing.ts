import * as THREE from 'three';
import {
  evaluateSurfaceJet,
  jetScalar,
  projectToSurface,
  type SurfaceValue,
} from './differentialGeometry';

export type RibbonField = 'Off' | 'Principal e1' | 'Principal e2' | 'Asymptotic +' | 'Asymptotic -';
export type GeometryOverlay =
  | 'Off'
  | 'Curvature Color'
  | 'Principal Directions'
  | 'Asymptotic Directions'
  | 'Minimality Error'
  | 'Focal Distance';
export type BonnetStripMode = 'Off' | 'Approx P-G-D Blend' | 'Strip Overlay';
export type LabyrinthSkeletonMode = 'Off' | 'Distance Ridge Points' | 'Ribbonized Skeleton';
export type SkeletonResolution = 'Low' | 'Medium';
export type ParallelFocalMode = 'Off' | 'Offset Surface' | 'Focal Highlight' | 'Near-Caustic Shell';

export function makeSurfaceSeeds(options: {
  value: SurfaceValue;
  cropRadius: number;
  count: number;
  epsilon: number;
  phase?: number;
}) {
  const seeds: THREE.Vector3[] = [];
  const total = Math.max(1, options.count);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < total * 4 && seeds.length < total; i++) {
    const t = (i + 0.5) / (total * 4);
    const y = 1 - 2 * t;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = i * golden + (options.phase ?? 0);
    const candidate = new THREE.Vector3(
      Math.cos(theta) * r,
      y,
      Math.sin(theta) * r,
    ).multiplyScalar(options.cropRadius * 0.86);
    const projected = projectToSurface(options.value, candidate, options.epsilon);
    if (projected.length() <= options.cropRadius * 0.985) {
      seeds.push(projected);
    }
  }
  return seeds;
}

export function traceSurfaceRibbons(options: {
  value: SurfaceValue;
  field: RibbonField;
  cropRadius: number;
  seedCount: number;
  traceLength: number;
  ribbonWidth: number;
  lift: number;
  epsilon: number;
  phase: number;
}) {
  if (options.field === 'Off') return [];
  const seeds = makeSurfaceSeeds({
    value: options.value,
    cropRadius: options.cropRadius,
    count: options.seedCount,
    epsilon: options.epsilon,
    phase: options.phase,
  });
  return seeds
    .map((seed, index) =>
      traceOneRibbon({
        ...options,
        seed,
        sign: index % 2 === 0 ? 1 : -1,
      }),
    )
    .filter((points) => points.length > 3);
}

export function buildDiagnosticGeometry(options: {
  value: SurfaceValue;
  cropRadius: number;
  overlay: GeometryOverlay;
  epsilon: number;
  strength: number;
}) {
  const points = makeSurfaceSeeds({
    value: options.value,
    cropRadius: options.cropRadius,
    count: options.overlay.includes('Directions') ? 90 : 420,
    epsilon: options.epsilon,
  });

  if (options.overlay === 'Principal Directions' || options.overlay === 'Asymptotic Directions') {
    const positions: number[] = [];
    const colors: number[] = [];
    const cyan = new THREE.Color('#28f5ff');
    const magenta = new THREE.Color('#ff49d8');
    const length = 0.08 + options.strength * 0.12;
    for (const p of points) {
      const jet = evaluateSurfaceJet(options.value, p, options.epsilon);
      const directions =
        options.overlay === 'Principal Directions' ? jet.principalDirections : jet.asymptoticDirections;
      addSegment(positions, colors, p, directions[0], length, cyan);
      addSegment(positions, colors, p, directions[1], length, magenta);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    return { kind: 'lines' as const, geometry };
  }

  const positions: number[] = [];
  const colors: number[] = [];
  for (const p of points) {
    const jet = evaluateSurfaceJet(options.value, p, options.epsilon);
    const scalar =
      options.overlay === 'Minimality Error'
        ? jetScalar(jet, 'minimality')
        : options.overlay === 'Focal Distance'
          ? jetScalar(jet, 'focalDistance')
          : jetScalar(jet, 'curvatureMagnitude');
    const color = diagnosticColor(scalar, options.overlay);
    const lifted = p.clone().addScaledVector(jet.normal, 0.012);
    positions.push(lifted.x, lifted.y, lifted.z);
    colors.push(color.r, color.g, color.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return { kind: 'points' as const, geometry };
}

export function buildRibbonGeometryFromCurves(curves: THREE.Vector3[][], options: {
  value: SurfaceValue;
  width: number;
  lift: number;
  epsilon: number;
}) {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const across: number[] = [];
  const along: number[] = [];
  let vertexOffset = 0;

  for (const curve of curves) {
    if (curve.length < 2) continue;
    for (let i = 0; i < curve.length; i++) {
      const point = curve[i];
      const prev = curve[Math.max(0, i - 1)];
      const next = curve[Math.min(curve.length - 1, i + 1)];
      const tangent = next.clone().sub(prev).normalize();
      const jet = evaluateSurfaceJet(options.value, point, options.epsilon);
      const widthDirection = jet.normal.clone().cross(tangent).normalize();
      const left = point.clone().addScaledVector(widthDirection, -options.width).addScaledVector(jet.normal, options.lift);
      const right = point.clone().addScaledVector(widthDirection, options.width).addScaledVector(jet.normal, options.lift);
      positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
      normals.push(jet.normal.x, jet.normal.y, jet.normal.z, jet.normal.x, jet.normal.y, jet.normal.z);
      across.push(-1, 1);
      along.push(i / Math.max(1, curve.length - 1), i / Math.max(1, curve.length - 1));
      if (i < curve.length - 1) {
        const a = vertexOffset + i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    vertexOffset += curve.length * 2;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('ribbonAcross', new THREE.Float32BufferAttribute(across, 1));
  geometry.setAttribute('ribbonAlong', new THREE.Float32BufferAttribute(along, 1));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

export function buildBonnetStripCurves(options: {
  value: SurfaceValue;
  cropRadius: number;
  epsilon: number;
  phase: number;
  width: number;
  parameter: number;
}) {
  const seeds = makeSurfaceSeeds({
    value: options.value,
    cropRadius: options.cropRadius,
    count: 18,
    epsilon: options.epsilon,
    phase: options.phase * Math.PI * 2,
  });
  return seeds.map((seed, index) =>
    traceOneRibbon({
      value: options.value,
      field: index % 2 === 0 ? 'Asymptotic +' : 'Asymptotic -',
      seed,
      sign: Math.sign(Math.sin(index + options.parameter * Math.PI * 2)) || 1,
      cropRadius: options.cropRadius,
      traceLength: 1.4 + options.parameter * 1.4,
      ribbonWidth: options.width,
      lift: 0.02,
      epsilon: options.epsilon,
      phase: options.phase,
    }),
  );
}

export function buildLabyrinthSkeletonApproximation(options: {
  value: SurfaceValue;
  side: 1 | -1;
  cropRadius: number;
  epsilon: number;
  resolution: SkeletonResolution;
}) {
  const steps = options.resolution === 'Low' ? 18 : 24;
  const spacing = (options.cropRadius * 2) / (steps - 1);
  const candidates: Array<{ p: THREE.Vector3; d: number }> = [];
  for (let ix = 0; ix < steps; ix++) {
    for (let iy = 0; iy < steps; iy++) {
      for (let iz = 0; iz < steps; iz++) {
        const p = new THREE.Vector3(
          -options.cropRadius + ix * spacing,
          -options.cropRadius + iy * spacing,
          -options.cropRadius + iz * spacing,
        );
        if (p.length() > options.cropRadius * 0.96) continue;
        const jet = evaluateSurfaceJet(options.value, p, options.epsilon);
        if (options.side * jet.f < 0 || jet.gradNorm < 1e-5) continue;
        candidates.push({ p, d: Math.abs(jet.f) / jet.gradNorm });
      }
    }
  }

  const positions: number[] = [];
  const colors: number[] = [];
  for (const candidate of candidates) {
    let neighborCount = 0;
    for (const other of candidates) {
      if (other === candidate) continue;
      if (other.p.distanceToSquared(candidate.p) < spacing * spacing * 2.2 && other.d > candidate.d * 1.04) {
        neighborCount++;
      }
      if (neighborCount > 1) break;
    }
    if (neighborCount <= 1 && candidate.d > spacing * 0.45) {
      positions.push(candidate.p.x, candidate.p.y, candidate.p.z);
      const glow = Math.min(1, candidate.d / (spacing * 2));
      colors.push(0.2 + glow * 0.7, 0.95, 1);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

export function buildFocalPointGeometry(options: {
  value: SurfaceValue;
  cropRadius: number;
  epsilon: number;
  mode: ParallelFocalMode;
  offsetDistance: number;
  causticStrength: number;
  pointinessClamp: number;
}) {
  const points = makeSurfaceSeeds({
    value: options.value,
    cropRadius: options.cropRadius,
    count: 360,
    epsilon: options.epsilon,
  });
  const positions: number[] = [];
  const colors: number[] = [];
  for (const p of points) {
    const jet = evaluateSurfaceJet(options.value, p, options.epsilon);
    const curvature = Math.max(Math.abs(jet.principalCurvatures[0]), Math.abs(jet.principalCurvatures[1]));
    const focalDistance = 1 / Math.max(0.03, curvature);
    const nearCaustic = 1 - Math.min(1, Math.abs(focalDistance - Math.abs(options.offsetDistance)) / Math.max(0.05, options.pointinessClamp));
    if (options.mode === 'Focal Highlight' && nearCaustic < 0.35) continue;
    const scalar = options.mode === 'Near-Caustic Shell' ? nearCaustic * options.causticStrength : 0;
    const point = p.clone().addScaledVector(jet.normal, options.offsetDistance + scalar * 0.12);
    positions.push(point.x, point.y, point.z);
    const color = diagnosticColor(nearCaustic, 'Focal Distance');
    colors.push(color.r, color.g, color.b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  return geometry;
}

function traceOneRibbon(options: {
  value: SurfaceValue;
  field: RibbonField;
  seed: THREE.Vector3;
  sign: number;
  cropRadius: number;
  traceLength: number;
  ribbonWidth: number;
  lift: number;
  epsilon: number;
  phase: number;
}) {
  const point = options.seed.clone();
  const points = [point.clone()];
  const step = 0.055;
  const steps = Math.max(8, Math.floor(options.traceLength / step));
  for (let i = 0; i < steps; i++) {
    const jetA = evaluateSurfaceJet(options.value, point, options.epsilon);
    const dirA = selectRibbonDirection(jetA, options.field).multiplyScalar(options.sign);
    const mid = point.clone().addScaledVector(dirA, step * 0.5);
    const midProjected = projectToSurface(options.value, mid, options.epsilon, 3);
    const jetB = evaluateSurfaceJet(options.value, midProjected, options.epsilon);
    const dirB = selectRibbonDirection(jetB, options.field).multiplyScalar(options.sign);
    point.addScaledVector(dirB, step);
    point.copy(projectToSurface(options.value, point, options.epsilon, 3));
    if (point.length() > options.cropRadius * 0.99 || !Number.isFinite(point.x)) break;
    points.push(point.clone());
  }
  return points;
}

function selectRibbonDirection(jet: ReturnType<typeof evaluateSurfaceJet>, field: RibbonField) {
  if (field === 'Principal e2') return jet.principalDirections[1].clone();
  if (field === 'Asymptotic +') return jet.asymptoticDirections[0].clone();
  if (field === 'Asymptotic -') return jet.asymptoticDirections[1].clone();
  return jet.principalDirections[0].clone();
}

function addSegment(
  positions: number[],
  colors: number[],
  center: THREE.Vector3,
  direction: THREE.Vector3,
  length: number,
  color: THREE.Color,
) {
  const a = center.clone().addScaledVector(direction, -length);
  const b = center.clone().addScaledVector(direction, length);
  positions.push(a.x, a.y, a.z, b.x, b.y, b.z);
  colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
}

function diagnosticColor(value: number, mode: GeometryOverlay) {
  if (mode === 'Focal Distance') {
    const t = THREE.MathUtils.clamp(value, 0, 1);
    return new THREE.Color().setHSL(0.62 - t * 0.52, 0.95, 0.48 + t * 0.28);
  }
  if (mode === 'Minimality Error') {
    const t = THREE.MathUtils.clamp(value * 9, 0, 1);
    return new THREE.Color().setHSL(0.55 - t * 0.55, 0.95, 0.45 + t * 0.25);
  }
  const t = THREE.MathUtils.clamp(value * 1.7, 0, 1);
  return new THREE.Color().setHSL(0.7 - t * 0.75, 0.96, 0.52);
}
