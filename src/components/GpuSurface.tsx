import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { SurfaceSettings } from '../rendering/geometryCache';
import { createRaymarchMaterial, updateRaymarchMaterial } from '../rendering/raymarchMaterial';
import type { ColorMode } from '../rendering/surfaceMaterial';

interface GpuSurfaceProps {
  settings: SurfaceSettings;
  colorMode: ColorMode;
  raySteps: number;
  autoRotationSpeed: number;
  wobbleAmplitude: number;
  wobbleSpeed: number;
  wobbleScale: number;
  breathing: number;
  twist: number;
  complementSolid: boolean;
}

export function GpuSurface({
  settings,
  colorMode,
  raySteps,
  autoRotationSpeed,
  wobbleAmplitude,
  wobbleSpeed,
  wobbleScale,
  breathing,
  twist,
  complementSolid,
}: GpuSurfaceProps) {
  const material = useMemo(() => createRaymarchMaterial(), []);
  const { camera } = useThree();

  useEffect(() => {
    updateRaymarchMaterial(material, {
      settings,
      colorMode,
      raySteps,
      autoRotationSpeed,
      wobbleAmplitude,
      wobbleSpeed,
      wobbleScale,
      breathing,
      twist,
      complementSolid,
    });
  }, [
    autoRotationSpeed,
    breathing,
    colorMode,
    complementSolid,
    material,
    raySteps,
    settings,
    twist,
    wobbleAmplitude,
    wobbleScale,
    wobbleSpeed,
  ]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uCameraPosition.value.copy(camera.position);
  });

  return (
    <mesh material={material}>
      <sphereGeometry args={[settings.cropRadius, 128, 64]} />
    </mesh>
  );
}
