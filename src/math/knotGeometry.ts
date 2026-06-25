import * as THREE from 'three';

export type KnotPreset = 'Trefoil' | 'Figure-eight' | 'Torus knot';
export type FilmMaterial = 'translucent soap film' | 'pearl/porcelain' | 'subtle rainbow interference';

export function sampleKnotCurve(
  preset: KnotPreset,
  options: { scale: number; samples: number; p: number; q: number },
) {
  const points: THREE.Vector3[] = [];
  const samples = Math.max(96, options.samples);
  for (let i = 0; i <= samples; i += 1) {
    const t = (i / samples) * Math.PI * 2;
    points.push(sampleKnotPoint(preset, t, options).multiplyScalar(options.scale));
  }
  return points;
}

function sampleKnotPoint(
  preset: KnotPreset,
  t: number,
  options: { p: number; q: number },
) {
  if (preset === 'Figure-eight') {
    return new THREE.Vector3(
      (2 + Math.cos(2 * t)) * Math.cos(3 * t),
      (2 + Math.cos(2 * t)) * Math.sin(3 * t),
      Math.sin(4 * t),
    ).multiplyScalar(0.42);
  }

  if (preset === 'Torus knot') {
    const p = Math.max(1, Math.round(options.p));
    const q = Math.max(1, Math.round(options.q));
    return new THREE.Vector3(
      (2 + Math.cos(q * t)) * Math.cos(p * t),
      (2 + Math.cos(q * t)) * Math.sin(p * t),
      Math.sin(q * t),
    ).multiplyScalar(0.42);
  }

  return new THREE.Vector3(
    (2 + Math.cos(3 * t)) * Math.cos(2 * t),
    (2 + Math.cos(3 * t)) * Math.sin(2 * t),
    Math.sin(3 * t),
  ).multiplyScalar(0.42);
}

// Soap-film approximation: span the knot with radial strips, then Laplacian
// relax only interior vertices while keeping the knot boundary fixed. This is
// a stable visual approximation, not a Plateau-problem solver.
export function buildRelaxedFilmGeometry(
  boundary: THREE.Vector3[],
  options: { radialSegments: number; iterations: number; thickness: number },
) {
  const rings = Math.max(4, options.radialSegments);
  const columns = boundary.length;
  const vertices: THREE.Vector3[] = [];
  const indices: number[] = [];

  for (let ring = 0; ring <= rings; ring += 1) {
    const amount = ring / rings;
    for (const point of boundary) {
      const inner = point.clone().multiplyScalar(0.08);
      vertices.push(inner.lerp(point, amount));
    }
  }

  for (let ring = 0; ring < rings; ring += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = ring * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  for (let iteration = 0; iteration < options.iterations; iteration += 1) {
    const next = vertices.map((vertex) => vertex.clone());
    for (let ring = 1; ring < rings; ring += 1) {
      for (let column = 0; column < columns - 1; column += 1) {
        const index = ring * columns + column;
        const left = ring * columns + ((column - 1 + columns - 1) % (columns - 1));
        const right = ring * columns + ((column + 1) % (columns - 1));
        const inner = (ring - 1) * columns + column;
        const outer = (ring + 1) * columns + column;
        next[index]
          .copy(vertices[left])
          .add(vertices[right])
          .add(vertices[inner])
          .add(vertices[outer])
          .multiplyScalar(0.25);
      }
    }
    vertices.forEach((vertex, index) => vertex.copy(next[index]));
  }

  const positions: number[] = [];
  for (const vertex of vertices) {
    positions.push(vertex.x, vertex.y, vertex.z + options.thickness * 0.002);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

