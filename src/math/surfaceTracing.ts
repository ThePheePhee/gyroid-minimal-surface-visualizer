import * as THREE from 'three';
import {
  evaluateSurfaceJet,
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
export type BonnetStripMode = 'Off' | 'Approx P-G-D Blend' | 'Strip Overlay' | 'Surface Weave';
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

export function buildRibbonGeometryFromCurves(curves: THREE.Vector3[][], options: {
  value: SurfaceValue;
  width: number;
  lift: number;
  epsilon: number;
  closed?: boolean;
}) {
  const positions: number[] = [];
  const normals: number[] = [];
  const indices: number[] = [];
  const across: number[] = [];
  const along: number[] = [];
  let vertexOffset = 0;

  for (const curve of curves) {
    if (curve.length < 2) continue;
    const closed = Boolean(options.closed && curve.length > 3);
    let previousWidth: THREE.Vector3 | undefined;

    for (let i = 0; i < curve.length; i++) {
      const point = curve[i];
      const prev = closed ? curve[(i - 1 + curve.length) % curve.length] : curve[Math.max(0, i - 1)];
      const next = closed ? curve[(i + 1) % curve.length] : curve[Math.min(curve.length - 1, i + 1)];
      const tangent = next.clone().sub(prev).normalize();
      const jet = evaluateSurfaceJet(options.value, point, options.epsilon);
      let widthDirection = jet.normal.clone().cross(tangent);
      if (widthDirection.lengthSq() < 1e-8) {
        widthDirection = stablePerpendicular(tangent);
      } else {
        widthDirection.normalize();
      }
      if (previousWidth && widthDirection.dot(previousWidth) < 0) {
        widthDirection.multiplyScalar(-1);
      }
      previousWidth = widthDirection.clone();
      const left = point.clone().addScaledVector(widthDirection, -options.width).addScaledVector(jet.normal, options.lift);
      const right = point.clone().addScaledVector(widthDirection, options.width).addScaledVector(jet.normal, options.lift);
      positions.push(left.x, left.y, left.z, right.x, right.y, right.z);
      normals.push(jet.normal.x, jet.normal.y, jet.normal.z, jet.normal.x, jet.normal.y, jet.normal.z);
      across.push(-1, 1);
      along.push(i / Math.max(1, curve.length - (closed ? 0 : 1)), i / Math.max(1, curve.length - (closed ? 0 : 1)));
      if (i < curve.length - 1 || closed) {
        const a = vertexOffset + i * 2;
        const b = vertexOffset + ((i + 1) % curve.length) * 2;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
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
  mode: BonnetStripMode;
  value: SurfaceValue;
  cropRadius: number;
  epsilon: number;
  phase: number;
  width: number;
  parameter: number;
}) {
  if (options.mode === 'Off' || options.mode === 'Approx P-G-D Blend' || options.mode === 'Strip Overlay') {
    return [];
  }

  if (options.mode === 'Surface Weave') {
    return buildProjectedSurfaceWeave(options);
  }

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

function buildProjectedSurfaceWeave(options: {
  value: SurfaceValue;
  cropRadius: number;
  epsilon: number;
  phase: number;
  width: number;
  parameter: number;
}) {
  const loops: THREE.Vector3[][] = [];
  const sampleCount = 80;
  const attemptCount = 22;
  const targetCount = Math.round(8 + options.parameter * 8);
  const phase = options.phase * Math.PI * 2;

  for (let attempt = 0; attempt < attemptCount && loops.length < targetCount; attempt++) {
    const family = weaveLoopFamilies[(attempt + Math.floor(options.parameter * 7)) % weaveLoopFamilies.length];
    const lane = Math.floor(attempt / weaveLoopFamilies.length);
    const side = lane % 2 === 0 ? 1 : -1;
    const depth = Math.floor(lane / 2);
    const offset = side * Math.min(options.cropRadius * 0.62, (depth + 0.45) * options.width * options.cropRadius * 5.2);
    const radius = options.cropRadius * THREE.MathUtils.clamp(0.46 + ((attempt * 29) % 31) / 100, 0.42, 0.75);
    const windingA = 1 + ((attempt + Math.round(options.parameter * 10)) % 2);
    const windingB = 2 + ((attempt + Math.round(options.phase * 10)) % 3);
    const seed = makeWeaveSeedLoop(family, {
      offset,
      phase: phase + attempt * 0.61,
      radius,
      cropRadius: options.cropRadius,
      sampleCount,
      windingA,
      windingB,
    });
    const projected = projectWeaveLoop(seed, options);
    if (projected && isContinuousLoop(projected, options.cropRadius)) {
      loops.push(projected);
    }
  }

  if (loops.length < Math.max(3, Math.floor(targetCount * 0.5))) {
    const sections = buildPlanarSectionWeave(options, targetCount - loops.length);
    loops.push(...sections);
  }

  return loops.slice(0, targetCount);
}

function buildPlanarSectionWeave(
  options: {
    value: SurfaceValue;
    cropRadius: number;
    epsilon: number;
    phase: number;
    parameter: number;
  },
  requestedCount: number,
) {
  const loops: THREE.Vector3[][] = [];
  const gridSize = 34;
  const extent = options.cropRadius * 0.92;
  const offsets = [-0.48, -0.24, 0, 0.24, 0.48];
  const familyOffset = Math.floor(options.parameter * weaveLoopFamilies.length);

  for (let familyIndex = 0; familyIndex < weaveLoopFamilies.length && loops.length < requestedCount; familyIndex++) {
    const frame = weaveLoopFamilies[(familyIndex + familyOffset) % weaveLoopFamilies.length];
    for (const normalizedOffset of offsets) {
      if (loops.length >= requestedCount) break;
      const planeOffset = normalizedOffset * options.cropRadius;
      const segments = samplePlanarSurfaceSegments(options, frame, planeOffset, extent, gridSize);
      const sectionLoops = stitchClosedSegments(segments, (2 * extent * 0.02) / gridSize);
      for (const section of sectionLoops) {
        const projected = section.map((point) => projectToSurface(options.value, point, options.epsilon, 4));
        if (projected.length >= 12 && isContinuousLoop(projected, options.cropRadius)) {
          loops.push(projected);
          if (loops.length >= requestedCount) break;
        }
      }
    }
  }

  return loops;
}

function samplePlanarSurfaceSegments(
  options: { value: SurfaceValue; cropRadius: number },
  frame: { u: THREE.Vector3; v: THREE.Vector3; w: THREE.Vector3 },
  planeOffset: number,
  extent: number,
  gridSize: number,
) {
  const points: THREE.Vector3[][] = [];
  const values: number[][] = [];
  const maxRadius = options.cropRadius * 0.965;
  for (let yIndex = 0; yIndex <= gridSize; yIndex++) {
    const rowPoints: THREE.Vector3[] = [];
    const rowValues: number[] = [];
    const y = -extent + (2 * extent * yIndex) / gridSize;
    for (let xIndex = 0; xIndex <= gridSize; xIndex++) {
      const x = -extent + (2 * extent * xIndex) / gridSize;
      const point = frame.w
        .clone()
        .multiplyScalar(planeOffset)
        .addScaledVector(frame.u, x)
        .addScaledVector(frame.v, y);
      rowPoints.push(point);
      rowValues.push(point.length() <= maxRadius ? options.value(point) : Number.NaN);
    }
    points.push(rowPoints);
    values.push(rowValues);
  }

  const segments: Array<[THREE.Vector3, THREE.Vector3]> = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const corners = [
        { point: points[y][x], value: values[y][x] },
        { point: points[y][x + 1], value: values[y][x + 1] },
        { point: points[y + 1][x + 1], value: values[y + 1][x + 1] },
        { point: points[y + 1][x], value: values[y + 1][x] },
      ];
      if (corners.some((corner) => !Number.isFinite(corner.value))) continue;
      const crossings: THREE.Vector3[] = [];
      for (let edge = 0; edge < 4; edge++) {
        const a = corners[edge];
        const b = corners[(edge + 1) % 4];
        if ((a.value < 0) === (b.value < 0)) continue;
        const t = a.value / (a.value - b.value);
        crossings.push(a.point.clone().lerp(b.point, t));
      }
      if (crossings.length === 2) {
        segments.push([crossings[0], crossings[1]]);
      } else if (crossings.length === 4) {
        const centerValue = corners.reduce((sum, corner) => sum + corner.value, 0) * 0.25;
        if ((centerValue < 0) === (corners[0].value < 0)) {
          segments.push([crossings[0], crossings[3]], [crossings[1], crossings[2]]);
        } else {
          segments.push([crossings[0], crossings[1]], [crossings[2], crossings[3]]);
        }
      }
    }
  }
  return segments;
}

function stitchClosedSegments(segments: Array<[THREE.Vector3, THREE.Vector3]>, tolerance: number) {
  type Node = { point: THREE.Vector3; neighbors: Set<string> };
  const nodes = new Map<string, Node>();
  const keyFor = (point: THREE.Vector3) =>
    `${Math.round(point.x / tolerance)}:${Math.round(point.y / tolerance)}:${Math.round(point.z / tolerance)}`;

  for (const [a, b] of segments) {
    const aKey = keyFor(a);
    const bKey = keyFor(b);
    if (aKey === bKey) continue;
    const aNode = nodes.get(aKey) ?? { point: a.clone(), neighbors: new Set<string>() };
    const bNode = nodes.get(bKey) ?? { point: b.clone(), neighbors: new Set<string>() };
    aNode.neighbors.add(bKey);
    bNode.neighbors.add(aKey);
    nodes.set(aKey, aNode);
    nodes.set(bKey, bNode);
  }

  const loops: THREE.Vector3[][] = [];
  const visited = new Set<string>();
  for (const [startKey, startNode] of nodes) {
    if (visited.has(startKey) || startNode.neighbors.size !== 2) continue;
    const component: string[] = [];
    let previousKey = '';
    let currentKey = startKey;
    let closed = false;
    while (component.length <= nodes.size) {
      const current = nodes.get(currentKey);
      if (!current || current.neighbors.size !== 2) break;
      component.push(currentKey);
      visited.add(currentKey);
      const nextKey = [...current.neighbors].find((key) => key !== previousKey);
      if (!nextKey) break;
      if (nextKey === startKey) {
        closed = component.length >= 12;
        break;
      }
      if (visited.has(nextKey)) break;
      previousKey = currentKey;
      currentKey = nextKey;
    }
    if (closed) loops.push(component.map((key) => nodes.get(key)!.point.clone()));
  }
  return loops;
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
  const candidates: Array<{ p: THREE.Vector3; d: number; ix: number; iy: number; iz: number }> = [];
  const candidateGrid = new Map<string, Array<(typeof candidates)[number]>>();
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
        const candidate = { p, d: Math.abs(jet.f) / jet.gradNorm, ix, iy, iz };
        candidates.push(candidate);
        const key = `${ix}:${iy}:${iz}`;
        const cell = candidateGrid.get(key);
        if (cell) cell.push(candidate);
        else candidateGrid.set(key, [candidate]);
      }
    }
  }

  const positions: number[] = [];
  const colors: number[] = [];
  for (const candidate of candidates) {
    let neighborCount = 0;
    for (let dx = -1; dx <= 1 && neighborCount <= 1; dx++) {
      for (let dy = -1; dy <= 1 && neighborCount <= 1; dy++) {
        for (let dz = -1; dz <= 1 && neighborCount <= 1; dz++) {
          const cell = candidateGrid.get(`${candidate.ix + dx}:${candidate.iy + dy}:${candidate.iz + dz}`);
          if (!cell) continue;
          for (const other of cell) {
            if (other === candidate) continue;
            if (
              other.p.distanceToSquared(candidate.p) < spacing * spacing * 2.2 &&
              other.d > candidate.d * 1.04
            ) {
              neighborCount++;
            }
            if (neighborCount > 1) break;
          }
        }
      }
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

const weaveLoopFamilies = [
  {
    u: new THREE.Vector3(1, 0, 0),
    v: new THREE.Vector3(0, 1, 0),
    w: new THREE.Vector3(0, 0, 1),
  },
  {
    u: new THREE.Vector3(0, 1, 0),
    v: new THREE.Vector3(0, 0, 1),
    w: new THREE.Vector3(1, 0, 0),
  },
  {
    u: new THREE.Vector3(0, 0, 1),
    v: new THREE.Vector3(1, 0, 0),
    w: new THREE.Vector3(0, 1, 0),
  },
  makeWeaveFrame(new THREE.Vector3(1, 1, 1)),
  makeWeaveFrame(new THREE.Vector3(1, -1, 1)),
  makeWeaveFrame(new THREE.Vector3(-1, 1, 1)),
];

function makeWeaveSeedLoop(
  frame: { u: THREE.Vector3; v: THREE.Vector3; w: THREE.Vector3 },
  options: {
    offset: number;
    phase: number;
    radius: number;
    cropRadius: number;
    sampleCount: number;
    windingA: number;
    windingB: number;
  },
) {
  const points: THREE.Vector3[] = [];
  const center = frame.w.clone().multiplyScalar(options.offset);
  const radialScale = Math.sqrt(Math.max(0.16, 1 - (Math.abs(options.offset) / options.cropRadius) ** 2));
  const radius = options.radius * radialScale;

  for (let i = 0; i < options.sampleCount; i++) {
    const t = (i / options.sampleCount) * Math.PI * 2;
    const braid = Math.sin(t * options.windingB + options.phase) * options.cropRadius * 0.075;
    points.push(
      center
        .clone()
        .addScaledVector(frame.u, Math.cos(t * options.windingA + options.phase * 0.23) * radius)
        .addScaledVector(frame.v, Math.sin(t * options.windingA + options.phase * 0.23) * radius)
        .addScaledVector(frame.w, braid),
    );
  }

  return points;
}

function projectWeaveLoop(
  seed: THREE.Vector3[],
  options: {
    value: SurfaceValue;
    cropRadius: number;
    epsilon: number;
  },
) {
  let loop = seed.map((point) => projectWeavePoint(point, options));
  if (loop.some((point) => point === null)) {
    return null;
  }

  for (let iteration = 0; iteration < 4; iteration++) {
    const points = loop as THREE.Vector3[];
    const smoothed = points.map((point, index) => {
      const previous = points[(index - 1 + points.length) % points.length];
      const next = points[(index + 1) % points.length];
      return point.clone().multiplyScalar(0.64).addScaledVector(previous, 0.18).addScaledVector(next, 0.18);
    });
    loop = smoothed.map((point) => projectWeavePoint(point, options));
    if (loop.some((point) => point === null)) {
      return null;
    }
  }

  return loop as THREE.Vector3[];
}

function projectWeavePoint(
  seed: THREE.Vector3,
  options: {
    value: SurfaceValue;
    cropRadius: number;
    epsilon: number;
  },
) {
  const maxRadius = options.cropRadius * 0.965;
  const point = seed.clone();
  if (point.length() > maxRadius) {
    point.setLength(maxRadius);
  }

  const projected = projectToSurface(options.value, point, options.epsilon, 8);
  if (!Number.isFinite(projected.x) || projected.length() > options.cropRadius * 0.992) {
    return null;
  }

  return Math.abs(options.value(projected)) < Math.max(0.014, options.epsilon * 3.5) ? projected : null;
}

function isContinuousLoop(points: THREE.Vector3[], cropRadius: number) {
  let maxSegment = 0;
  for (let index = 0; index < points.length; index++) {
    const next = points[(index + 1) % points.length];
    maxSegment = Math.max(maxSegment, points[index].distanceTo(next));
  }
  return maxSegment < cropRadius * 0.24;
}

function makeWeaveFrame(normalInput: THREE.Vector3) {
  const w = normalInput.clone().normalize();
  const u = stablePerpendicular(w);
  const v = new THREE.Vector3().crossVectors(w, u).normalize();
  return { u, v, w };
}

function stablePerpendicular(direction: THREE.Vector3) {
  const axis = Math.abs(direction.y) < 0.82 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  return new THREE.Vector3().crossVectors(direction, axis).normalize();
}
