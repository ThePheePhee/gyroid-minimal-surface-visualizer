import * as THREE from 'three';
import type { ScalarField } from './scalarFields';

export interface SurfaceExtractionOptions {
  field: ScalarField;
  isoLevel: number;
  resolution: number;
  scale: number;
  frequency: number;
  cropRadius: number;
  cropSoftness: number;
  shellThickness: number;
}

const cornerOffsets = [
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [1, 1, 1],
  [0, 1, 1],
] as const;

const tetrahedra = [
  [0, 5, 1, 6],
  [0, 1, 2, 6],
  [0, 2, 3, 6],
  [0, 3, 7, 6],
  [0, 7, 4, 6],
  [0, 4, 5, 6],
] as const;

export function extractImplicitSurface(options: SurfaceExtractionOptions): THREE.BufferGeometry {
  const resolution = Math.max(10, Math.min(84, Math.round(options.resolution)));
  const bounds = options.scale;
  const step = (bounds * 2) / resolution;
  const positions: number[] = [];
  const colors: number[] = [];
  const radii: number[] = [];
  const gradients: number[] = [];

  const sample = (x: number, y: number, z: number): number => {
    const radius = Math.hypot(x, y, z);
    const crop = radius - options.cropRadius;
    if (crop > step * 2 + options.cropSoftness) {
      return Number.POSITIVE_INFINITY;
    }

    const frequency = options.frequency;
    const value = options.field(x * frequency, y * frequency, z * frequency) - options.isoLevel;
    const shell = Math.abs(value) - options.shellThickness;
    const softness = Math.max(0.0001, options.cropSoftness);
    const cropMask = crop / softness;

    return Math.max(shell, cropMask);
  };

  const makePoint = (a: VertexSample, b: VertexSample): VertexSample => {
    const denom = a.value - b.value;
    const t = Math.abs(denom) < 1e-6 ? 0.5 : a.value / denom;
    const clamped = Math.min(1, Math.max(0, t));
    return {
      value: 0,
      position: [
        a.position[0] + (b.position[0] - a.position[0]) * clamped,
        a.position[1] + (b.position[1] - a.position[1]) * clamped,
        a.position[2] + (b.position[2] - a.position[2]) * clamped,
      ],
    };
  };

  const pushTriangle = (a: VertexSample, b: VertexSample, c: VertexSample) => {
    const ax = b.position[0] - a.position[0];
    const ay = b.position[1] - a.position[1];
    const az = b.position[2] - a.position[2];
    const bx = c.position[0] - a.position[0];
    const by = c.position[1] - a.position[1];
    const bz = c.position[2] - a.position[2];
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;
    const winding = nx * a.position[0] + ny * a.position[1] + nz * a.position[2] > 0;
    const triangle = winding ? [a, b, c] : [a, c, b];

    for (const point of triangle) {
      const [x, y, z] = point.position;
      const radius = Math.hypot(x, y, z);
      positions.push(x, y, z);
      radii.push(radius / Math.max(0.001, options.cropRadius));
      gradients.push(sampleGradient(sample, x, y, z, step * 0.55));
      colors.push(0, 0, 0);
    }
  };

  for (let xi = 0; xi < resolution; xi += 1) {
    for (let yi = 0; yi < resolution; yi += 1) {
      for (let zi = 0; zi < resolution; zi += 1) {
        const x = -bounds + xi * step;
        const y = -bounds + yi * step;
        const z = -bounds + zi * step;

        const corners = cornerOffsets.map(([ox, oy, oz]) => {
          const px = x + ox * step;
          const py = y + oy * step;
          const pz = z + oz * step;
          return {
            position: [px, py, pz] as [number, number, number],
            value: sample(px, py, pz),
          };
        });

        for (const tet of tetrahedra) {
          const vertices = tet.map((index) => corners[index]);
          polygonizeTetrahedron(vertices, makePoint, pushTriangle);
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setAttribute('surfaceRadius', new THREE.Float32BufferAttribute(radii, 1));
  geometry.setAttribute('surfaceGradient', new THREE.Float32BufferAttribute(gradients, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

interface VertexSample {
  position: [number, number, number];
  value: number;
}

function polygonizeTetrahedron(
  vertices: VertexSample[],
  makePoint: (a: VertexSample, b: VertexSample) => VertexSample,
  pushTriangle: (a: VertexSample, b: VertexSample, c: VertexSample) => void,
) {
  const inside = vertices.filter((vertex) => vertex.value <= 0);
  const outside = vertices.filter((vertex) => vertex.value > 0);

  if (inside.length === 0 || inside.length === 4) {
    return;
  }

  if (inside.length === 1) {
    const [a] = inside;
    pushTriangle(makePoint(a, outside[0]), makePoint(a, outside[1]), makePoint(a, outside[2]));
    return;
  }

  if (inside.length === 3) {
    const [a] = outside;
    pushTriangle(makePoint(a, inside[2]), makePoint(a, inside[1]), makePoint(a, inside[0]));
    return;
  }

  const [a, b] = inside;
  const [c, d] = outside;
  const ac = makePoint(a, c);
  const ad = makePoint(a, d);
  const bc = makePoint(b, c);
  const bd = makePoint(b, d);
  pushTriangle(ac, bc, bd);
  pushTriangle(ac, bd, ad);
}

function sampleGradient(
  sample: (x: number, y: number, z: number) => number,
  x: number,
  y: number,
  z: number,
  epsilon: number,
) {
  const dx = sample(x + epsilon, y, z) - sample(x - epsilon, y, z);
  const dy = sample(x, y + epsilon, z) - sample(x, y - epsilon, z);
  const dz = sample(x, y, z + epsilon) - sample(x, y, z - epsilon);
  return Math.min(1, Math.hypot(dx, dy, dz) / 2.5);
}
