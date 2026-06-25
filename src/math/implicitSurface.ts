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

type Vec3Tuple = [number, number, number];

interface GridSample {
  grid: Vec3Tuple;
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
  [1, 1, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [1, 1, 1],
  [0, 1, 1],
] as const;

// Freudenthal decomposition. It is face-consistent across neighboring cubes
// and avoids the ambiguous saddle cases that produce cracks in vanilla MC.
const tetrahedra = [
  [0, 1, 3, 7],
  [0, 1, 5, 7],
  [0, 4, 5, 7],
  [1, 2, 3, 7],
  [1, 2, 6, 7],
  [1, 5, 6, 7],
] as const;

export function extractImplicitSurface(options: SurfaceExtractionOptions): THREE.BufferGeometry {
  const resolution = Math.max(18, Math.min(104, Math.round(options.resolution)));
  const cropRadius = Math.max(0.1, options.cropRadius);
  const bounds = Math.max(options.scale, cropRadius) * 1.03;
  const step = (bounds * 2) / resolution;
  const samplesPerAxis = resolution + 1;
  const samples = new Array<GridSample>(samplesPerAxis ** 3);
  const vertexCache = new Map<string, number>();
  const vertices: MeshVertex[] = [];
  const indices: number[] = [];

  const sampleIndex = (x: number, y: number, z: number) =>
    x + y * samplesPerAxis + z * samplesPerAxis * samplesPerAxis;

  const scalar = (x: number, y: number, z: number) =>
    options.field(x * options.frequency, y * options.frequency, z * options.frequency) - options.isoLevel;

  const gradientMagnitude = (x: number, y: number, z: number) => {
    const epsilon = step * 0.72;
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
          grid: [x, y, z],
          position: [px, py, pz],
          value: scalar(px, py, pz),
        };
      }
    }
  }

  const getVertex = (a: GridSample, b: GridSample) => {
    const cacheId = edgeId(a.grid, b.grid);
    const cached = vertexCache.get(cacheId);
    if (cached !== undefined) {
      return cached;
    }

    const t = interpolateZero(a.value, b.value);
    const position: Vec3Tuple = [
      THREE.MathUtils.lerp(a.position[0], b.position[0], t),
      THREE.MathUtils.lerp(a.position[1], b.position[1], t),
      THREE.MathUtils.lerp(a.position[2], b.position[2], t),
    ];
    const index = vertices.length;
    vertices.push({
      position,
      radius: Math.hypot(...position) / cropRadius,
      gradient: gradientMagnitude(...position),
    });
    vertexCache.set(cacheId, index);
    return index;
  };

  for (let z = 0; z < resolution; z += 1) {
    for (let y = 0; y < resolution; y += 1) {
      for (let x = 0; x < resolution; x += 1) {
        const center = [-bounds + (x + 0.5) * step, -bounds + (y + 0.5) * step, -bounds + (z + 0.5) * step];
        if (Math.hypot(center[0], center[1], center[2]) > cropRadius + step * 1.9) {
          continue;
        }

        const corners = cornerOffsets.map(([ox, oy, oz]) => samples[sampleIndex(x + ox, y + oy, z + oz)]);
        for (const tetra of tetrahedra) {
          polygonizeTetrahedron(
            tetra.map((corner) => corners[corner]),
            getVertex,
            indices,
          );
        }
      }
    }
  }

  return buildClippedGeometry(vertices, indices, cropRadius);
}

function polygonizeTetrahedron(
  samples: GridSample[],
  getVertex: (a: GridSample, b: GridSample) => number,
  indices: number[],
) {
  const inside = samples.filter((sample) => sample.value < 0);
  const outside = samples.filter((sample) => sample.value >= 0);

  if (inside.length === 0 || inside.length === 4) {
    return;
  }

  if (inside.length === 1) {
    const [a] = inside;
    indices.push(getVertex(a, outside[0]), getVertex(a, outside[1]), getVertex(a, outside[2]));
    return;
  }

  if (inside.length === 3) {
    const [a] = outside;
    indices.push(getVertex(a, inside[2]), getVertex(a, inside[1]), getVertex(a, inside[0]));
    return;
  }

  const [a, b] = inside;
  const [c, d] = outside;
  const ac = getVertex(a, c);
  const ad = getVertex(a, d);
  const bc = getVertex(b, c);
  const bd = getVertex(b, d);
  indices.push(ac, bc, bd, ac, bd, ad);
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

function edgeId(a: Vec3Tuple, b: Vec3Tuple) {
  const aKey = `${a[0]}:${a[1]}:${a[2]}`;
  const bKey = `${b[0]}:${b[1]}:${b[2]}`;
  return aKey < bKey ? `${aKey}|${bKey}` : `${bKey}|${aKey}`;
}

function interpolateZero(a: number, b: number) {
  const denominator = a - b;
  if (Math.abs(denominator) < 1e-8) {
    return 0.5;
  }

  return Math.min(1, Math.max(0, a / denominator));
}
