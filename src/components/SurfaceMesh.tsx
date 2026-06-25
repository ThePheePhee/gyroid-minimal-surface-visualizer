import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { buildSurfaceGeometry, type SurfaceSettings } from '../rendering/geometryCache';
import { colorModeIndex, createSurfaceMaterial, type ColorMode } from '../rendering/surfaceMaterial';

interface SurfaceMeshProps {
  settings: SurfaceSettings;
  colorMode: ColorMode;
  smoothShading: boolean;
  wireframe: boolean;
  autoRotationSpeed: number;
  wobbleAmplitude: number;
  wobbleSpeed: number;
  wobbleScale: number;
  breathing: number;
  twist: number;
}

export function SurfaceMesh({
  settings,
  colorMode,
  smoothShading,
  wireframe,
  autoRotationSpeed,
  wobbleAmplitude,
  wobbleSpeed,
  wobbleScale,
  breathing,
  twist,
}: SurfaceMeshProps) {
  const groupRef = useRef<THREE.Group>(null);
  const material = useMemo(() => createSurfaceMaterial(), []);
  const { camera } = useThree();

  const geometry = useMemo(() => {
    const extracted = buildSurfaceGeometry(settings);
    if (!smoothShading) {
      return extracted;
    }

    const smoothed = mergeVertices(extracted, 1e-3);
    smoothed.computeVertexNormals();
    extracted.dispose();
    return smoothed;
  }, [settings, smoothShading]);

  useEffect(() => {
    material.uniforms.uColorMode.value = colorModeIndex(colorMode);
    material.uniforms.uRimStrength.value =
      colorMode === 'metallic white/gold rim emphasis' ? 2.2 : colorMode === 'monochrome porcelain/glass' ? 1.55 : 1.2;
  }, [colorMode, material]);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * autoRotationSpeed;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.22) * autoRotationSpeed * 0.08;
    }

    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uWobble.value = wobbleAmplitude;
    material.uniforms.uWobbleSpeed.value = wobbleSpeed;
    material.uniforms.uWobbleScale.value = wobbleScale;
    material.uniforms.uBreathing.value = breathing;
    material.uniforms.uTwist.value = twist;
    material.uniforms.uSurfaceThickness.value = settings.shellThickness;
    material.uniforms.uCameraPosition.value.copy(camera.position);
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometry} material={material} />
      {wireframe && (
        <mesh geometry={geometry}>
          <meshBasicMaterial color="#d6f8ff" wireframe transparent opacity={0.16} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}
