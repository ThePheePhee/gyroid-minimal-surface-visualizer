import * as THREE from 'three';
import { gyroidGradient, gyroidValue, solveGyroidZ } from './gyroidAnalysis';

export type WeavePreset =
  | 'clean mathematical ribbon'
  | 'fiber-bundle rainbow ribbon'
  | 'metallic pale ribbon'
  | 'luminous braided textile';

export type WeaveRenderStyle = 'line' | 'tube' | 'ribbon' | 'fiber-bundle ribbon';

export interface WeaveOptions {
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

// Heuristic v1: trace x-directed paths, then solve z with Newton iteration so
// each point rides on the gyroid level set. The paths are not exact geodesics.
export function generateGyroidWeaves(options: WeaveOptions) {
  const strands: THREE.Vector3[][] = [];
  const halfCount = Math.max(1, (options.strandCount - 1) / 2);
  const stepCount = Math.max(80, Math.round(options.integrationLength * 56));

  for (let strand = 0; strand < options.strandCount; strand += 1) {
    const normalized = (strand - halfCount) / Math.max(1, halfCount);
    const yBase = normalized * options.strandSpacing * options.cropRadius;
    const phase = options.seedPattern * 0.71 + strand * 1.37;
    const points: THREE.Vector3[] = [];
    let previousZ = Math.sin(phase) * options.cropRadius * 0.35;

    for (let i = 0; i <= stepCount; i += 1) {
      const t = i / stepCount;
      const x = THREE.MathUtils.lerp(-options.cropRadius * 0.92, options.cropRadius * 0.92, t);
      const y =
        yBase +
        Math.sin(t * Math.PI * 4 + phase) * options.cropRadius * 0.13 +
        Math.sin(t * Math.PI * 9 + phase * 0.4) * options.cropRadius * 0.035;
      const maxZ = Math.sqrt(Math.max(0, options.cropRadius ** 2 - x ** 2 - y ** 2));
      if (maxZ <= 0.04) {
        continue;
      }

      const z = solveGyroidZ(x, y, previousZ, options.frequency, options.isoLevel, maxZ);
      const point = new THREE.Vector3(x, y, z);
      if (point.length() <= options.cropRadius * 0.985 && Math.abs(gyroidValue(point, options.frequency, options.isoLevel)) < 0.04) {
        points.push(point);
        previousZ = z;
      }
    }

    if (points.length > 8) {
      strands.push(points);
    }
  }

  return strands;
}

export function frameCurve(points: THREE.Vector3[], frequency: number) {
  return points.map((position, index): WeaveFramePoint => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tangent = next.clone().sub(previous).normalize();
    const normal = gyroidGradient(position, frequency).normalize();
    const width = new THREE.Vector3().crossVectors(normal, tangent).normalize();
    return { position, tangent, normal, width };
  });
}

export function buildRibbonGeometry(
  points: THREE.Vector3[],
  options: { width: number; thickness: number; frequency: number; fiberColumns?: number },
) {
  const frames = frameCurve(points, options.frequency);
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
      along.push(i / Math.max(1, frames.length - 1));
    }
  }

  for (let i = 0; i < frames.length - 1; i += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = i * columns + column;
      const b = a + 1;
      const c = a + columns;
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

