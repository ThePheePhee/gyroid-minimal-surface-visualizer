import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import type { SurfaceSettings } from '../rendering/geometryCache';
import { createRaymarchMaterial, updateRaymarchMaterial } from '../rendering/raymarchMaterial';
import type { ComplementSide, DeveloperRaymarchSettings } from '../rendering/raymarchMaterial';
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
  complementSide: ComplementSide;
  developer: DeveloperRaymarchSettings;
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
  complementSide,
  developer,
}: GpuSurfaceProps) {
  const shaderSettings = useMemo(
    () => ({
      preset: settings.preset,
      morphTarget: settings.morphTarget,
      morphPath: settings.morphPath,
      developerEnabled: developer.enabled,
    }),
    [developer.enabled, settings.morphPath, settings.morphTarget, settings.preset],
  );
  const material = useMemo(() => createRaymarchMaterial(shaderSettings), [shaderSettings]);
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
      complementSide,
      developer,
    });
  }, [
    autoRotationSpeed,
    breathing,
    colorMode,
    complementSolid,
    complementSide,
    developer,
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
