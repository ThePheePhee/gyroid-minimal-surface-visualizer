import * as THREE from 'three';
import { edgeTable as rawEdgeTable, triTable as rawTriTable } from 'three/examples/jsm/objects/MarchingCubes.js';
import type { ScalarField } from './scalarFields';

const edgeTable = rawEdgeTable as unknown as Int32Array;
const triTable = rawTriTable as unknown as Int32Array;

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

type Vec3Tuple = [number, number, number];

interface GridSample {
  position: Vec3Tuple;
  value: number;
}

interface MeshVertex {
  position: Vec3Tuple;
  radius: number;
  gradient: number;
}

interface ClipVertex extends MeshVertex {
  signedDistance: number;
}

const cornerOffsets = [
  [0, 0, 0],
  [1, 0, 0],
  [0, 1, 0],
  [1, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [0, 1, 1],
  [1, 1, 1],
] as const;

const edgeCorners = [
  [0, 1],
  [1, 3],
  [2, 3],
  [0, 2],
  [4, 5],
  [5, 7],
  [6, 7],
  [4, 6],
  [0, 4],
  [1, 5],
  [3, 7],
  [2, 6],
] as const;

const xEdgeId = (x: number, y: number, z: number) => `x:${x}:${y}:${z}`;
const yEdgeId = (x: number, y: number, z: number) => `y:${x}:${y}:${z}`;
const zEdgeId = (x: number, y: number, z: number) => `z:${x}:${y}:${z}`;

const edgeIdFactories = [
  (x: number, y: number, z: number) => xEdgeId(x, y, z),
  (x: number, y: number, z: number) => yEdgeId(x + 1, y, z),
  (x: number, y: number, z: number) => xEdgeId(x, y + 1, z),
  (x: number, y: number, z: number) => yEdgeId(x, y, z),
  (x: number, y: number, z: number) => xEdgeId(x, y, z + 1),
  (x: number, y: number, z: number) => yEdgeId(x + 1, y, z + 1),
  (x: number, y: number, z: number) => xEdgeId(x, y + 1, z + 1),
  (x: number, y: number, z: number) => yEdgeId(x, y, z + 1),
  (x: number, y: number, z: number) => zEdgeId(x, y, z),
  (x: number, y: number, z: number) => zEdgeId(x + 1, y, z),
  (x: number, y: number, z: number) => zEdgeId(x + 1, y + 1, z),
  (x: number, y: number, z: number) => zEdgeId(x, y + 1, z),
] as const;

export function extractImplicitSurface(options: SurfaceExtractionOptions): THREE.BufferGeometry {
  const resolution = Math.max(16, Math.min(96, Math.round(options.resolution)));
  const cropRadius = Math.max(0.1, options.cropRadius);
  const bounds = Math.max(options.scale, cropRadius) * 1.03;
  const step = (bounds * 2) / resolution;
  const samplesPerAxis = resolution + 1;
  const sampleCount = samplesPerAxis ** 3;
  const samples = new Array<GridSample>(sampleCount);
  const vertexCache = new Map<string, number>();
  const meshVertices: MeshVertex[] = [];
  const triangleIndices: number[] = [];

  const sampleIndex = (x: number, y: number, z: number) =>
    x + y * samplesPerAxis + z * samplesPerAxis * samplesPerAxis;

  const scalar = (x: number, y: number, z: number) =>
    options.field(x * options.frequency, y * options.frequency, z * options.frequency) - options.isoLevel;

  const gradientMagnitude = (x: number, y: number, z: number) => {
    const epsilon = step * 0.75;
    const dx = scalar(x + epsilon, y, z) - scalar(x - epsilon, y, z);
    const dy = scalar(x, y + epsilon, z) - scalar(x, y - epsilon, z);
    const dz = scalar(x, y, z + epsilon) - scalar(x, y, z - epsilon);
    return Math.min(1, Math.hypot(dx, dy, dz) / 3.6);
  };

  for (let z = 0; z < samplesPerAxis; z += 1) {
    for (let y = 0; y < samplesPerAxis; y += 1) {
      for (let x = 0; x < samplesPerAxis; x += 1) {
        const px = -bounds + x * step;
        const py = -bounds + y * step;
        const pz = -bounds + z * step;
        samples[sampleIndex(x, y, z)] = {
          position: [px, py, pz],
          value: scalar(px, py, pz),
        };
      }
    }
  }

  const getVertex = (edge: number, x: number, y: number, z: number, corners: GridSample[]) => {
    const cacheId = edgeIdFactories[edge](x, y, z);
    const cached = vertexCache.get(cacheId);
    if (cached !== undefined) {
      return cached;
    }

    const [aIndex, bIndex] = edgeCorners[edge];
    const a = corners[aIndex];
    const b = corners[bIndex];
    const t = interpolateZero(a.value, b.value);
    const position: Vec3Tuple = [
      THREE.MathUtils.lerp(a.position[0], b.position[0], t),
      THREE.MathUtils.lerp(a.position[1], b.position[1], t),
      THREE.MathUtils.lerp(a.position[2], b.position[2], t),
    ];
    const radius = Math.hypot(position[0], position[1], position[2]) / cropRadius;
    const vertexIndex = meshVertices.length;
    meshVertices.push({
      position,
      radius,
      gradient: gradientMagnitude(position[0], position[1], position[2]),
    });
    vertexCache.set(cacheId, vertexIndex);
    return vertexIndex;
  };

  for (let z = 0; z < resolution; z += 1) {
    for (let y = 0; y < resolution; y += 1) {
      for (let x = 0; x < resolution; x += 1) {
        const centerX = -bounds + (x + 0.5) * step;
        const centerY = -bounds + (y + 0.5) * step;
        const centerZ = -bounds + (z + 0.5) * step;
        if (Math.hypot(centerX, centerY, centerZ) > cropRadius + step * 1.75) {
          continue;
        }

        const corners = cornerOffsets.map(([ox, oy, oz]) => samples[sampleIndex(x + ox, y + oy, z + oz)]);
        let cubeIndex = 0;
        if (corners[0].value < 0) cubeIndex |= 1;
        if (corners[1].value < 0) cubeIndex |= 2;
        if (corners[2].value < 0) cubeIndex |= 8;
        if (corners[3].value < 0) cubeIndex |= 4;
        if (corners[4].value < 0) cubeIndex |= 16;
        if (corners[5].value < 0) cubeIndex |= 32;
        if (corners[6].value < 0) cubeIndex |= 128;
        if (corners[7].value < 0) cubeIndex |= 64;

        const bits = edgeTable[cubeIndex];
        if (bits === 0) {
          continue;
        }

        const edgeVertices = new Array<number>(12);
        for (let edge = 0; edge < 12; edge += 1) {
          if (bits & (1 << edge)) {
            edgeVertices[edge] = getVertex(edge, x, y, z, corners);
          }
        }

        const tableOffset = cubeIndex << 4;
        for (let i = 0; triTable[tableOffset + i] !== -1; i += 3) {
          const a = edgeVertices[triTable[tableOffset + i]];
          const b = edgeVertices[triTable[tableOffset + i + 1]];
          const c = edgeVertices[triTable[tableOffset + i + 2]];
          triangleIndices.push(a, b, c);
        }
      }
    }
  }

  return buildClippedGeometry(meshVertices, triangleIndices, cropRadius);
}

function buildClippedGeometry(vertices: MeshVertex[], indices: number[], cropRadius: number) {
  const positions: number[] = [];
  const radii: number[] = [];
  const gradients: number[] = [];

  const pushVertex = (vertex: MeshVertex) => {
    positions.push(...vertex.position);
    radii.push(vertex.radius);
    gradients.push(vertex.gradient);
  };

  for (let i = 0; i < indices.length; i += 3) {
    const triangle = [vertices[indices[i]], vertices[indices[i + 1]], vertices[indices[i + 2]]].map(
      (vertex) => ({
        ...vertex,
        signedDistance: cropRadius - Math.hypot(...vertex.position),
      }),
    );
    const clipped = clipTriangleToSphere(triangle, cropRadius);
    if (clipped.length < 3) {
      continue;
    }

    for (let j = 1; j < clipped.length - 1; j += 1) {
      pushVertex(clipped[0]);
      pushVertex(clipped[j]);
      pushVertex(clipped[j + 1]);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('surfaceRadius', new THREE.Float32BufferAttribute(radii, 1));
  geometry.setAttribute('surfaceGradient', new THREE.Float32BufferAttribute(gradients, 1));
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function clipTriangleToSphere(triangle: ClipVertex[], cropRadius: number) {
  const clipped: ClipVertex[] = [];
  for (let i = 0; i < triangle.length; i += 1) {
    const current = triangle[i];
    const previous = triangle[(i + triangle.length - 1) % triangle.length];
    const currentInside = current.signedDistance >= 0;
    const previousInside = previous.signedDistance >= 0;

    if (currentInside !== previousInside) {
      clipped.push(intersectSphere(previous, current, cropRadius));
    }

    if (currentInside) {
      clipped.push(current);
    }
  }

  return clipped;
}

function intersectSphere(a: ClipVertex, b: ClipVertex, cropRadius: number): ClipVertex {
  const ax = a.position[0];
  const ay = a.position[1];
  const az = a.position[2];
  const dx = b.position[0] - ax;
  const dy = b.position[1] - ay;
  const dz = b.position[2] - az;
  const qa = dx * dx + dy * dy + dz * dz;
  const qb = 2 * (ax * dx + ay * dy + az * dz);
  const qc = ax * ax + ay * ay + az * az - cropRadius * cropRadius;
  const discriminant = Math.max(0, qb * qb - 4 * qa * qc);
  const roots = [(-qb - Math.sqrt(discriminant)) / (2 * qa), (-qb + Math.sqrt(discriminant)) / (2 * qa)];
  const t = roots.find((root) => root >= -1e-5 && root <= 1 + 1e-5) ?? interpolateZero(a.signedDistance, b.signedDistance);
  const clamped = Math.min(1, Math.max(0, t));
  return {
    position: [
      THREE.MathUtils.lerp(a.position[0], b.position[0], clamped),
      THREE.MathUtils.lerp(a.position[1], b.position[1], clamped),
      THREE.MathUtils.lerp(a.position[2], b.position[2], clamped),
    ],
    radius: 1,
    gradient: THREE.MathUtils.lerp(a.gradient, b.gradient, clamped),
    signedDistance: 0,
  };
}

function interpolateZero(a: number, b: number) {
  const denominator = a - b;
  if (Math.abs(denominator) < 1e-8) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, a / denominator));
}
