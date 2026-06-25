import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Leva, useControls } from 'leva';
import { Suspense, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { surfacePresets, type SurfacePreset } from '../math/scalarFields';
import type { MorphPath } from '../rendering/geometryCache';
import { colorModes, type ColorMode } from '../rendering/surfaceMaterial';
import { GpuSurface } from './GpuSurface';
import { SurfaceMesh } from './SurfaceMesh';

const presetOptions = Object.fromEntries(surfacePresets.map((preset) => [preset, preset]));
const colorOptions = Object.fromEntries(colorModes.map((mode) => [mode, mode]));
const renderModeOptions = {
  'GPU continuous raymarch': 'GPU continuous raymarch',
  'CPU mesh debug': 'CPU mesh debug',
} as const;
const morphPathOptions: Record<MorphPath, MorphPath> = {
  'No morph': 'No morph',
  'A to B pulse': 'A to B pulse',
  'Cycle all families': 'Cycle all families',
};

export function Scene() {
  const controls = useControls({
    'Render mode': { value: 'GPU continuous raymarch', options: renderModeOptions },
    'GPU ray steps': { value: 288, min: 128, max: 640, step: 16 },
    'Surface preset': { value: 'Gyroid' as SurfacePreset, options: presetOptions },
    'Morph target': { value: 'Diamond' as SurfacePreset, options: presetOptions },
    'Morph path': { value: 'No morph' as MorphPath, options: morphPathOptions },
    'Morph amount': { value: 0, min: 0, max: 1, step: 0.01 },
    'Animate morph': false,
    'Morph speed': { value: 0.08, min: 0.01, max: 0.5, step: 0.01 },
    'Morph remesh rate': { value: 10, min: 2, max: 20, step: 1 },
    'Iso-level / threshold': { value: 0, min: -0.7, max: 0.7, step: 0.01 },
    Resolution: { value: 64, min: 24, max: 96, step: 2 },
    Scale: { value: 2.25, min: 1.2, max: 4, step: 0.05 },
    'Number of periods / spatial frequency': { value: 3.1, min: 0.8, max: 6, step: 0.05 },
    'Spherical crop radius': { value: 2.08, min: 0.6, max: 3.8, step: 0.03 },
    'Crop softness': { value: 0.09, min: 0.01, max: 0.5, step: 0.01 },
    'Visual shell thickness': { value: 0.04, min: 0, max: 0.16, step: 0.005 },
    Wireframe: false,
    'Smooth shading': true,
    'Color mode': { value: 'rainbow curvature-like bands' as ColorMode, options: colorOptions },
    'Black background': true,
    'Auto-rotation speed': { value: 0.22, min: 0, max: 1.5, step: 0.01 },
    'Wobble amplitude': { value: 0.018, min: 0, max: 0.12, step: 0.002 },
    'Wobble speed': { value: 1.15, min: 0.05, max: 4, step: 0.05 },
    'Wobble spatial scale': { value: 4.2, min: 0.5, max: 12, step: 0.1 },
    'Whole-object breathing': { value: 0.018, min: 0, max: 0.12, step: 0.002 },
    'Psychedelic twist': { value: 0.035, min: 0, max: 0.5, step: 0.005 },
  });

  const [autoMorph, setAutoMorph] = useState(0);

  useEffect(() => {
    if (!controls['Animate morph'] || controls['Morph path'] === 'No morph') {
      return undefined;
    }

    let frameId = 0;
    let phase = autoMorph;
    let lastTime = performance.now();
    let lastRemesh = lastTime;
    const remeshInterval = 1000 / controls['Morph remesh rate'];

    const tick = (time: number) => {
      const delta = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;
      phase = (phase + delta * controls['Morph speed']) % 1;

      if (time - lastRemesh >= remeshInterval) {
        setAutoMorph(phase);
        lastRemesh = time;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [autoMorph, controls]);

  const effectiveMorphAmount =
    controls['Morph path'] === 'No morph'
      ? 0
      : controls['Animate morph']
        ? controls['Morph path'] === 'Cycle all families'
          ? autoMorph
          : 0.5 + 0.5 * Math.sin(autoMorph * Math.PI * 2)
        : controls['Morph amount'];

  const settings = useMemo(
    () => ({
      preset: controls['Surface preset'],
      morphTarget: controls['Morph target'],
      morphPath: controls['Morph path'],
      morphAmount: effectiveMorphAmount,
      isoLevel: controls['Iso-level / threshold'],
      resolution: controls.Resolution,
      scale: controls.Scale,
      frequency: controls['Number of periods / spatial frequency'],
      cropRadius: controls['Spherical crop radius'],
      cropSoftness: controls['Crop softness'],
      shellThickness: controls['Visual shell thickness'],
    }),
    [controls, effectiveMorphAmount],
  );

  return (
    <div className="app-shell" data-black={controls['Black background']}>
      <Leva collapsed={false} oneLineLabels />
      <Canvas
        gl={{
          antialias: true,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
      >
        <color
          attach="background"
          args={[controls['Black background'] ? '#000000' : '#eef2f8']}
        />
        <fog attach="fog" args={[controls['Black background'] ? '#000000' : '#eef2f8', 8, 15]} />
        <PerspectiveCamera makeDefault position={[0, 0, 6.2]} fov={42} />
        <ambientLight intensity={0.28} />
        <directionalLight position={[4, 5, 3]} intensity={2.4} color="#f7fbff" />
        <directionalLight position={[-5, -2, -3]} intensity={1.1} color="#36ddff" />
        <pointLight position={[0, 0, 5]} intensity={2.2} color="#ffffff" />
        <Suspense fallback={null}>
          {controls['Render mode'] === 'GPU continuous raymarch' ? (
            <GpuSurface
              settings={settings}
              colorMode={controls['Color mode']}
              raySteps={controls['GPU ray steps']}
              autoRotationSpeed={controls['Auto-rotation speed']}
              wobbleAmplitude={controls['Wobble amplitude']}
              wobbleSpeed={controls['Wobble speed']}
              wobbleScale={controls['Wobble spatial scale']}
              breathing={controls['Whole-object breathing']}
              twist={controls['Psychedelic twist']}
            />
          ) : (
            <SurfaceMesh
              settings={settings}
              colorMode={controls['Color mode']}
              smoothShading={controls['Smooth shading']}
              wireframe={controls.Wireframe}
              autoRotationSpeed={controls['Auto-rotation speed']}
              wobbleAmplitude={controls['Wobble amplitude']}
              wobbleSpeed={controls['Wobble speed']}
              wobbleScale={controls['Wobble spatial scale']}
              breathing={controls['Whole-object breathing']}
              twist={controls['Psychedelic twist']}
            />
          )}
        </Suspense>
        <OrbitControls enableDamping dampingFactor={0.08} minDistance={2.4} maxDistance={10} />
      </Canvas>
      <div className="title-plate">
        <span>TPMS visual instrument</span>
        <strong>Gyroid Minimal Surface Visualizer</strong>
      </div>
    </div>
  );
}
