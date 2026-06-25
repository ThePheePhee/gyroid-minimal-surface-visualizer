import * as THREE from 'three';

export interface SkeletonOptions {
  cropRadius: number;
  scale: number;
  density: number;
  phase: number;
}

// Procedural gyroid-labyrinth approximation. These are not medial-axis
// skeletons; they are phase-shifted periodic tube networks tuned to sit in
// opposite gyroid labyrinth domains and make the interpenetration legible.
export function generateLabyrinthSkeletons(options: SkeletonOptions) {
  return {
    a: generateNetwork({ ...options, phase: options.phase }),
    b: generateNetwork({ ...options, phase: options.phase + Math.PI }),
  };
}

function generateNetwork(options: SkeletonOptions) {
  const curves: THREE.Vector3[][] = [];
  const count = Math.max(2, Math.round(options.density));
  const amplitude = options.cropRadius * 0.28;
  const samples = 96;

  for (let family = 0; family < 3; family += 1) {
    for (let lane = -count; lane <= count; lane += 1) {
      const offset = (lane / Math.max(1, count)) * options.cropRadius * 0.62;
      const points: THREE.Vector3[] = [];
      for (let i = 0; i <= samples; i += 1) {
        const t = i / samples;
        const axis = THREE.MathUtils.lerp(-options.cropRadius, options.cropRadius, t);
        const wave = axis * options.scale + options.phase + lane * 0.9;
        const a = offset + Math.sin(wave) * amplitude;
        const b = Math.cos(wave * 0.93 + family * 2.1) * amplitude;
        const point =
          family === 0
            ? new THREE.Vector3(axis, a, b)
            : family === 1
              ? new THREE.Vector3(b, axis, a)
              : new THREE.Vector3(a, b, axis);
        if (point.length() <= options.cropRadius * 0.98) {
          points.push(point);
        }
      }
      if (points.length > 6) {
        curves.push(points);
      }
    }
  }

  return curves;
}

