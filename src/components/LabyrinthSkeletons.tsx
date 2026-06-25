import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { generateLabyrinthSkeletons } from '../math/labyrinthSkeletons';
import type { SurfacePreset } from '../math/scalarFields';
import type { SurfaceSettings } from '../rendering/geometryCache';
import { TpmsPreviewSurface } from './TpmsPreviewSurface';

interface LabyrinthSkeletonsProps {
  preset: SurfacePreset;
  isoLevel: number;
  resolution: number;
  fieldFrequency: number;
  cropRadius: number;
  surfaceOpacity: number;
  showSurface: boolean;
  showSkeletonA: boolean;
  showSkeletonB: boolean;
  tubeRadius: number;
  autoRotationSpeed: number;
  animationSpeed: number;
}

export function LabyrinthSkeletons(props: LabyrinthSkeletonsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const settings: SurfaceSettings = useMemo(
    () => ({
      preset: props.preset,
      morphTarget: props.preset,
      morphAmount: 0,
      morphPath: 'No morph',
      isoLevel: props.isoLevel,
      resolution: props.resolution,
      scale: props.cropRadius * 1.05,
      frequency: props.fieldFrequency,
      cropRadius: props.cropRadius,
      cropSoftness: 0.08,
      shellThickness: 0.02,
    }),
    [props.cropRadius, props.fieldFrequency, props.isoLevel, props.preset, props.resolution],
  );

  const skeletons = useMemo(
    () =>
      generateLabyrinthSkeletons({
        cropRadius: props.cropRadius,
        scale: props.fieldFrequency * 0.9,
        density: 2.4,
        phase: props.animationSpeed * 0.15,
      }),
    [props.animationSpeed, props.cropRadius, props.fieldFrequency],
  );

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * props.autoRotationSpeed;
    }
  });

  return (
    <group ref={groupRef}>
      <TpmsPreviewSurface settings={settings} visible={props.showSurface} opacity={props.surfaceOpacity} color="#d8f7ff" />
      {props.showSkeletonA && <SkeletonNetwork curves={skeletons.a} color="#14f1ff" radius={props.tubeRadius} />}
      {props.showSkeletonB && <SkeletonNetwork curves={skeletons.b} color="#ff4bd8" radius={props.tubeRadius} />}
    </group>
  );
}

function SkeletonNetwork({ curves, color, radius }: { curves: THREE.Vector3[][]; color: string; radius: number }) {
  const geometries = useMemo(
    () =>
      curves.map((points) =>
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(12, points.length * 2), radius, 10, false),
      ),
    [curves, radius],
  );
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);

  return (
    <group>
      {geometries.map((geometry, index) => (
        <mesh geometry={geometry} key={index}>
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} roughness={0.24} metalness={0.15} />
        </mesh>
      ))}
    </group>
  );
}
