import * as THREE from 'three';

export function gyroidValue(point: THREE.Vector3, frequency: number, isoLevel: number) {
  const x = point.x * frequency;
  const y = point.y * frequency;
  const z = point.z * frequency;
  return (
    Math.sin(x) * Math.cos(y) +
    Math.sin(y) * Math.cos(z) +
    Math.sin(z) * Math.cos(x)
  ) / 1.5 - isoLevel;
}

export function gyroidGradient(point: THREE.Vector3, frequency: number) {
  const x = point.x * frequency;
  const y = point.y * frequency;
  const z = point.z * frequency;
  return new THREE.Vector3(
    (Math.cos(x) * Math.cos(y) - Math.sin(z) * Math.sin(x)) * frequency,
    (-Math.sin(x) * Math.sin(y) + Math.cos(y) * Math.cos(z)) * frequency,
    (-Math.sin(y) * Math.sin(z) + Math.cos(z) * Math.cos(x)) * frequency,
  ).multiplyScalar(1 / 1.5);
}

export function solveGyroidZ(
  x: number,
  y: number,
  initialZ: number,
  frequency: number,
  isoLevel: number,
  maxZ: number,
) {
  let z = THREE.MathUtils.clamp(initialZ, -maxZ, maxZ);

  for (let i = 0; i < 10; i += 1) {
    const point = new THREE.Vector3(x, y, z);
    const value = gyroidValue(point, frequency, isoLevel);
    const dz = gyroidGradient(point, frequency).z;
    if (Math.abs(dz) < 1e-4) {
      break;
    }
    z = THREE.MathUtils.clamp(z - value / dz, -maxZ, maxZ);
    if (Math.abs(value) < 1e-4) {
      break;
    }
  }

  return z;
}

