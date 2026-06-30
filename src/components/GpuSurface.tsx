import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
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
  const material = useMemo(
    () =>
      createRaymarchMaterial({
        preset: settings.preset,
        morphTarget: settings.morphTarget,
        morphPath: settings.morphPath,
        developerShaderMode: 'live',
      }),
    [settings.morphPath, settings.morphTarget, settings.preset],
  );
  const warmupFrames = useRef(0);
  const adaptiveScale = useRef(1);
  const slowFrames = useRef(0);
  const fastFrames = useRef(0);
  const developerWasEnabled = useRef(false);
  const contextLost = useRef(false);
  const { camera, gl } = useThree();

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

  useEffect(() => {
    const canvas = gl.domElement;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      contextLost.current = true;
      material.uniforms.uDeveloperMode.value = 0;
    };
    const handleContextRestored = () => {
      contextLost.current = false;
      warmupFrames.current = 0;
      adaptiveScale.current = 0.7;
    };
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored, false);
    };
  }, [gl, material]);

  useEffect(() => () => material.dispose(), [material]);

  useFrame((state, delta) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uCameraPosition.value.copy(camera.position);
    material.uniforms.uDeveloperMode.value = developer.enabled && !contextLost.current ? 1 : 0;

    if (developer.enabled !== developerWasEnabled.current) {
      developerWasEnabled.current = developer.enabled;
      warmupFrames.current = 0;
      slowFrames.current = 0;
      fastFrames.current = 0;
      if (!developer.enabled) adaptiveScale.current = 1;
    }

    if (!developer.enabled) {
      material.uniforms.uRaySteps.value = raySteps;
      return;
    }

    warmupFrames.current = Math.min(48, warmupFrames.current + 1);
    if (delta >= 0.15) {
      adaptiveScale.current = Math.max(0.25, adaptiveScale.current - 0.16);
      slowFrames.current = 0;
      fastFrames.current = 0;
    } else if (delta > 1 / 25) {
      slowFrames.current += 1;
      fastFrames.current = 0;
      if (slowFrames.current >= 5) {
        adaptiveScale.current = Math.max(0.25, adaptiveScale.current - 0.08);
        slowFrames.current = 0;
      }
    } else if (delta < 1 / 48) {
      fastFrames.current += 1;
      slowFrames.current = 0;
      if (fastFrames.current >= 90) {
        adaptiveScale.current = Math.min(1, adaptiveScale.current + 0.04);
        fastFrames.current = 0;
      }
    } else {
      slowFrames.current = Math.max(0, slowFrames.current - 1);
      fastFrames.current = 0;
    }

    const warmupProgress = warmupFrames.current / 48;
    const warmupSteps = 64 + (raySteps - 64) * warmupProgress;
    const adaptiveSteps = raySteps * adaptiveScale.current;
    material.uniforms.uRaySteps.value = Math.min(
      raySteps,
      Math.max(64, Math.round(Math.min(warmupSteps, adaptiveSteps) / 8) * 8),
    );
  });

  return (
    <mesh material={material}>
      <sphereGeometry args={[settings.cropRadius, 96, 48]} />
    </mesh>
  );
}
