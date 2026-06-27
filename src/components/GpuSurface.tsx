import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
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
  prepareDeveloper: boolean;
  onDeveloperReadyChange: (ready: boolean) => void;
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
  prepareDeveloper,
  onDeveloperReadyChange,
}: GpuSurfaceProps) {
  const shaderIdentity = useMemo(
    () => ({
      preset: settings.preset,
      morphTarget: settings.morphTarget,
      morphPath: settings.morphPath,
    }),
    [settings.morphPath, settings.morphTarget, settings.preset],
  );
  const leanMaterial = useMemo(
    () => createRaymarchMaterial({ ...shaderIdentity, developerShaderMode: 'off' }),
    [shaderIdentity],
  );
  const liveMaterial = useMemo(
    () => createRaymarchMaterial({ ...shaderIdentity, developerShaderMode: 'live' }),
    [shaderIdentity],
  );
  const [preparedMaterial, setPreparedMaterial] = useState<THREE.ShaderMaterial | null>(null);
  const [contextAvailable, setContextAvailable] = useState(true);
  const warmupFrames = useRef(0);
  const adaptiveScale = useRef(1);
  const slowFrames = useRef(0);
  const fastFrames = useRef(0);
  const { camera, gl } = useThree();
  const liveRequested = developer.shaderMode === 'live';
  const shouldPrepareDeveloper = prepareDeveloper || liveRequested;
  const liveReady = contextAvailable && preparedMaterial === liveMaterial;
  const material = liveRequested && liveReady ? liveMaterial : leanMaterial;

  useEffect(() => {
    const updateOptions = {
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
    };
    updateRaymarchMaterial(leanMaterial, {
      ...updateOptions,
      developer: { ...developer, enabled: false, shaderMode: 'off' },
    });
    updateRaymarchMaterial(liveMaterial, updateOptions);
  }, [
    autoRotationSpeed,
    breathing,
    colorMode,
    complementSolid,
    complementSide,
    developer,
    leanMaterial,
    liveMaterial,
    raySteps,
    settings,
    twist,
    wobbleAmplitude,
    wobbleScale,
    wobbleSpeed,
  ]);

  useEffect(() => {
    if (!shouldPrepareDeveloper || liveReady || !contextAvailable) {
      return undefined;
    }

    let cancelled = false;
    let geometry: THREE.SphereGeometry | null = null;
    const timer = window.setTimeout(() => {
      geometry = new THREE.SphereGeometry(1, 8, 6);
      const compileScene = new THREE.Scene();
      compileScene.add(new THREE.Mesh(geometry, liveMaterial));

      void gl
        .compileAsync(compileScene, camera)
        .then(() => {
          if (!cancelled) {
            setPreparedMaterial(liveMaterial);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setPreparedMaterial(null);
          }
        })
        .finally(() => geometry?.dispose());
    }, 90);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      geometry?.dispose();
    };
  }, [camera, contextAvailable, gl, liveMaterial, liveReady, shouldPrepareDeveloper]);

  useEffect(() => {
    onDeveloperReadyChange(liveReady);
  }, [liveReady, onDeveloperReadyChange]);

  useEffect(() => {
    warmupFrames.current = 0;
    slowFrames.current = 0;
    fastFrames.current = 0;
  }, [material]);

  useEffect(() => {
    const canvas = gl.domElement;
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      setContextAvailable(false);
      setPreparedMaterial(null);
    };
    const handleContextRestored = () => setContextAvailable(true);
    canvas.addEventListener('webglcontextlost', handleContextLost, false);
    canvas.addEventListener('webglcontextrestored', handleContextRestored, false);
    return () => {
      canvas.removeEventListener('webglcontextlost', handleContextLost, false);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored, false);
    };
  }, [gl]);

  useEffect(
    () => () => {
      leanMaterial.dispose();
      liveMaterial.dispose();
    },
    [leanMaterial, liveMaterial],
  );

  useFrame((state, delta) => {
    leanMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    leanMaterial.uniforms.uCameraPosition.value.copy(camera.position);
    liveMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    liveMaterial.uniforms.uCameraPosition.value.copy(camera.position);

    if (material !== liveMaterial) {
      return;
    }

    warmupFrames.current = Math.min(48, warmupFrames.current + 1);
    if (delta < 0.15 && delta > 1 / 25) {
      slowFrames.current += 1;
      fastFrames.current = 0;
      if (slowFrames.current >= 5) {
        adaptiveScale.current = Math.max(0.52, adaptiveScale.current - 0.08);
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

    const warmup = 0.36 + 0.64 * (warmupFrames.current / 48);
    const scale = Math.min(warmup, adaptiveScale.current);
    const adaptiveSteps = Math.min(raySteps, Math.max(64, Math.round((raySteps * scale) / 8) * 8));
    liveMaterial.uniforms.uRaySteps.value = adaptiveSteps;
  });

  return (
    <mesh material={material}>
      <sphereGeometry args={[settings.cropRadius, 128, 64]} />
    </mesh>
  );
}
