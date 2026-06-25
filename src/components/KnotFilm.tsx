import { useFrame } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { buildRelaxedFilmGeometry, sampleKnotCurve, type FilmMaterial, type KnotPreset } from '../math/knotGeometry';

interface KnotFilmProps {
  knotPreset: KnotPreset;
  knotScale: number;
  boundaryTubeRadius: number;
  showBoundary: boolean;
  showFilm: boolean;
  filmOpacity: number;
  smoothingIterations: number;
  filmThickness: number;
  filmMaterial: FilmMaterial;
  torusP: number;
  torusQ: number;
  autoRotationSpeed: number;
}

export function KnotFilm(props: KnotFilmProps) {
  const groupRef = useRef<THREE.Group>(null);
  const boundary = useMemo(
    () => sampleKnotCurve(props.knotPreset, { scale: props.knotScale, samples: 220, p: props.torusP, q: props.torusQ }),
    [props.knotPreset, props.knotScale, props.torusP, props.torusQ],
  );
  const boundaryGeometry = useMemo(
    () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(boundary, true), 360, props.boundaryTubeRadius, 14, true),
    [boundary, props.boundaryTubeRadius],
  );
  const filmGeometry = useMemo(
    () =>
      buildRelaxedFilmGeometry(boundary, {
        radialSegments: 28,
        iterations: props.smoothingIterations,
        thickness: props.filmThickness,
      }),
    [boundary, props.filmThickness, props.smoothingIterations],
  );
  useEffect(
    () => () => {
      boundaryGeometry.dispose();
      filmGeometry.dispose();
    },
    [boundaryGeometry, filmGeometry],
  );

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * props.autoRotationSpeed;
      groupRef.current.rotation.x = Math.sin(groupRef.current.rotation.y * 0.35) * 0.12;
    }
  });

  const filmColor = props.filmMaterial === 'pearl/porcelain' ? '#f9f4e8' : props.filmMaterial === 'subtle rainbow interference' ? '#bbf7ff' : '#82d9ff';

  return (
    <group ref={groupRef}>
      {props.showFilm && (
        <mesh geometry={filmGeometry}>
          <meshPhysicalMaterial
            color={filmColor}
            transparent
            opacity={props.filmOpacity}
            roughness={0.12}
            metalness={0.02}
            transmission={props.filmMaterial === 'translucent soap film' ? 0.25 : 0}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}
      {props.showBoundary && (
        <mesh geometry={boundaryGeometry}>
          <meshStandardMaterial color="#fff3c7" emissive="#ffd56a" emissiveIntensity={0.35} roughness={0.16} metalness={0.32} />
        </mesh>
      )}
    </group>
  );
}
