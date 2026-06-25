import * as THREE from 'three';
import type { ScalarField } from './scalarFields';

export type WeavePreset =
  | 'clean mathematical ribbon'
  | 'fiber-bundle rainbow ribbon'
  | 'metallic pale ribbon'
  | 'luminous braided textile';

export type WeaveRenderStyle = 'line' | 'tube' | 'ribbon' | 'fiber-bundle ribbon';

export interface WeaveOptions {
  field: ScalarField;
  strandCount: number;
  strandSpacing: number;
  integrationLength: number;
  seedPattern: number;
  frequency: number;
  isoLevel: number;
  cropRadius: number;
}

export interface WeaveFramePoint {
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  normal: THREE.Vector3;
  width: THREE.Vector3;
}

const loopFamilies = [
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
  makeFrame(new THREE.Vector3(1, 1, 1)),
  makeFrame(new THREE.Vector3(1, -1, 1)),
  makeFrame(new THREE.Vector3(-1, 1, 1)),
];

// The weave curves are closed seed loops repeatedly projected onto the active
// implicit level set. They are smooth, continuous, and surface-constrained, but
// they are not exact geodesics or principal-curvature lines.
export function generateSurfaceWeaves(options: WeaveOptions) {
  const loops: THREE.Vector3[][] = [];
  const sampleCount = Math.max(96, Math.round(options.integrationLength * 72));
  const attemptCount = Math.max(options.strandCount * 4, 18);

  for (let attempt = 0; attempt < attemptCount && loops.length < options.strandCount; attempt += 1) {
    const family = loopFamilies[(attempt + options.seedPattern) % loopFamilies.length];
    const lane = Math.floor(attempt / loopFamilies.length);
    const side = lane % 2 === 0 ? 1 : -1;
    const laneDepth = Math.floor(lane / 2);
    const phase = options.seedPattern * 0.47 + attempt * 0.73;
    const offset =
      side *
      Math.min(options.cropRadius * 0.64, (laneDepth + 0.35) * options.strandSpacing * options.cropRadius * 0.42);
    const radius =
      options.cropRadius *
      THREE.MathUtils.clamp(0.42 + ((attempt * 37 + options.seedPattern * 11) % 33) / 100, 0.38, 0.76);
    const windingA = 1 + ((attempt + options.seedPattern) % 2);
    const windingB = Math.max(1, Math.round(options.integrationLength + ((attempt + options.seedPattern) % 3) * 0.5));
    const seed = makeSeedLoop(family, {
      offset,
      phase,
      radius,
      cropRadius: options.cropRadius,
      sampleCount,
      windingA,
      windingB,
    });
    const projected = projectLoop(seed, options);

    if (projected && isContinuousLoop(projected, options.cropRadius)) {
      loops.push(projected);
    }
  }

  return loops;
}

export function frameCurve(
  points: THREE.Vector3[],
  options: { field: ScalarField; frequency: number; isoLevel: number; closed?: boolean },
) {
  const frames: WeaveFramePoint[] = [];
  let previousWidth: THREE.Vector3 | undefined;

  for (let index = 0; index < points.length; index += 1) {
    const previous =
      options.closed && index === 0 ? points[points.length - 1] : points[Math.max(0, index - 1)];
    const next =
      options.closed && index === points.length - 1 ? points[0] : points[Math.min(points.length - 1, index + 1)];
    const tangent = next.clone().sub(previous).normalize();
    const normal = estimateSurfaceGradient(points[index], options).normalize();
    let width = new THREE.Vector3().crossVectors(normal, tangent);

    if (width.lengthSq() < 1e-8) {
      width = stablePerpendicular(tangent);
    } else {
      width.normalize();
    }

    if (previousWidth && width.dot(previousWidth) < 0) {
      width.multiplyScalar(-1);
    }

    frames.push({ position: points[index], tangent, normal, width });
    previousWidth = width;
  }

  return frames;
}

export function buildRibbonGeometry(
  points: THREE.Vector3[],
  options: {
    width: number;
    thickness: number;
    field: ScalarField;
    frequency: number;
    isoLevel: number;
    fiberColumns?: number;
    closed?: boolean;
  },
) {
  const frames = frameCurve(points, options);
  const columns = Math.max(2, options.fiberColumns ?? 2);
  const positions: number[] = [];
  const normals: number[] = [];
  const across: number[] = [];
  const along: number[] = [];
  const indices: number[] = [];

  for (let i = 0; i < frames.length; i += 1) {
    const frame = frames[i];
    for (let column = 0; column < columns; column += 1) {
      const u = columns === 1 ? 0 : column / (columns - 1);
      const acrossValue = u * 2 - 1;
      const position = frame.position
        .clone()
        .addScaledVector(frame.width, acrossValue * options.width * 0.5)
        .addScaledVector(frame.normal, options.thickness);
      positions.push(position.x, position.y, position.z);
      normals.push(frame.normal.x, frame.normal.y, frame.normal.z);
      across.push(acrossValue);
      along.push(i / Math.max(1, frames.length - (options.closed ? 0 : 1)));
    }
  }

  const rowSegments = options.closed ? frames.length : frames.length - 1;
  for (let i = 0; i < rowSegments; i += 1) {
    const nextRow = (i + 1) % frames.length;
    for (let column = 0; column < columns - 1; column += 1) {
      const a = i * columns + column;
      const b = a + 1;
      const c = nextRow * columns + column;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
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

function makeSeedLoop(
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
  const radialScale = Math.sqrt(Math.max(0.2, 1 - (Math.abs(options.offset) / options.cropRadius) ** 2));
  const radius = options.radius * radialScale;

  for (let i = 0; i < options.sampleCount; i += 1) {
    const t = (i / options.sampleCount) * Math.PI * 2;
    const braid = Math.sin(t * options.windingB + options.phase) * options.cropRadius * 0.08;
    const point = center
      .clone()
      .addScaledVector(frame.u, Math.cos(t * options.windingA + options.phase * 0.23) * radius)
      .addScaledVector(frame.v, Math.sin(t * options.windingA + options.phase * 0.23) * radius)
      .addScaledVector(frame.w, braid);
    points.push(point);
  }

  return points;
}

function projectLoop(points: THREE.Vector3[], options: WeaveOptions) {
  let projected = points.map((point) => projectPointToSurface(point, options));
  if (projected.some((point) => point === null)) {
    return null;
  }

  let loop = projected as THREE.Vector3[];
  for (let iteration = 0; iteration < 8; iteration += 1) {
    const smoothed = loop.map((point, index) => {
      const previous = loop[(index - 1 + loop.length) % loop.length];
      const next = loop[(index + 1) % loop.length];
      return point.clone().multiplyScalar(0.58).addScaledVector(previous, 0.21).addScaledVector(next, 0.21);
    });
    projected = smoothed.map((point) => projectPointToSurface(point, options));
    if (projected.some((point) => point === null)) {
      return null;
    }
    loop = projected as THREE.Vector3[];
  }

  return loop;
}

function projectPointToSurface(seed: THREE.Vector3, options: WeaveOptions) {
  const point = seed.clone();
  const maxRadius = options.cropRadius * 0.965;

  if (point.length() > maxRadius) {
    point.setLength(maxRadius);
  }

  for (let iteration = 0; iteration < 18; iteration += 1) {
    const value = fieldValue(point, options);
    if (Math.abs(value) < 0.0025) {
      return point;
    }

    const gradient = estimateSurfaceGradient(point, options);
    const lengthSq = gradient.lengthSq();
    if (lengthSq < 1e-7) {
      return null;
    }

    const step = THREE.MathUtils.clamp(value / lengthSq, -0.18, 0.18);
    point.addScaledVector(gradient, -step);

    if (point.length() > maxRadius) {
      point.setLength(maxRadius);
    }
  }

  return Math.abs(fieldValue(point, options)) < 0.018 ? point : null;
}

function fieldValue(point: THREE.Vector3, options: Pick<WeaveOptions, 'field' | 'frequency' | 'isoLevel'>) {
  return (
    options.field(point.x * options.frequency, point.y * options.frequency, point.z * options.frequency) -
    options.isoLevel
  );
}

function estimateSurfaceGradient(
  point: THREE.Vector3,
  options: Pick<WeaveOptions, 'field' | 'frequency' | 'isoLevel'>,
) {
  const epsilon = Math.max(0.0025, 0.008 / Math.max(0.8, options.frequency));
  const dx =
    fieldValue(new THREE.Vector3(point.x + epsilon, point.y, point.z), options) -
    fieldValue(new THREE.Vector3(point.x - epsilon, point.y, point.z), options);
  const dy =
    fieldValue(new THREE.Vector3(point.x, point.y + epsilon, point.z), options) -
    fieldValue(new THREE.Vector3(point.x, point.y - epsilon, point.z), options);
  const dz =
    fieldValue(new THREE.Vector3(point.x, point.y, point.z + epsilon), options) -
    fieldValue(new THREE.Vector3(point.x, point.y, point.z - epsilon), options);
  return new THREE.Vector3(dx, dy, dz).divideScalar(2 * epsilon);
}

function isContinuousLoop(points: THREE.Vector3[], cropRadius: number) {
  let maxSegment = 0;
  for (let index = 0; index < points.length; index += 1) {
    const next = points[(index + 1) % points.length];
    maxSegment = Math.max(maxSegment, points[index].distanceTo(next));
  }
  return maxSegment < cropRadius * 0.32;
}

function stablePerpendicular(direction: THREE.Vector3) {
  const axis = Math.abs(direction.y) < 0.8 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
  return new THREE.Vector3().crossVectors(direction, axis).normalize();
}

function makeFrame(normalInput: THREE.Vector3) {
  const w = normalInput.clone().normalize();
  const u = stablePerpendicular(w);
  const v = new THREE.Vector3().crossVectors(w, u).normalize();
  return { u, v, w };
}
