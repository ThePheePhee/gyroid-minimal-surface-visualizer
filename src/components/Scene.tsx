import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { Leva, useControls } from 'leva';
import { Suspense, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { surfacePresets, type SurfacePreset } from '../math/scalarFields';
import { colorModes, type ColorMode } from '../rendering/surfaceMaterial';
import { SurfaceMesh } from './SurfaceMesh';

const presetOptions = Object.fromEntries(surfacePresets.map((preset) => [preset, preset]));
const colorOptions = Object.fromEntries(colorModes.map((mode) => [mode, mode]));

export function Scene() {
  const controls = useControls({
    'Surface preset': { value: 'Gyroid' as SurfacePreset, options: presetOptions },
    'Morph target': { value: 'Diamond' as SurfacePreset, options: presetOptions },
    'Morph amount': { value: 0, min: 0, max: 1, step: 0.01 },
    'Slow morphing': false,
    'Iso-level / threshold': { value: 0, min: -1.5, max: 1.5, step: 0.01 },
    Resolution: { value: 44, min: 18, max: 72, step: 2 },
    Scale: { value: 2.25, min: 1.2, max: 4, step: 0.05 },
    'Number of periods / spatial frequency': { value: 2.75, min: 0.8, max: 6, step: 0.05 },
    'Spherical crop radius': { value: 2.05, min: 0.6, max: 3.8, step: 0.03 },
    'Crop softness': { value: 0.09, min: 0.01, max: 0.5, step: 0.01 },
    'Visual shell thickness': { value: 0.075, min: 0.015, max: 0.26, step: 0.005 },
    Wireframe: false,
    'Smooth shading': true,
    'Color mode': { value: 'rainbow curvature-like bands' as ColorMode, options: colorOptions },
    'Black background': true,
    'Auto-rotation speed': { value: 0.22, min: 0, max: 1.5, step: 0.01 },
    'Wobble / breathing animation': { value: 0.018, min: 0, max: 0.12, step: 0.002 },
  });

  const [autoMorph, setAutoMorph] = useState(0);

  useEffect(() => {
    if (!controls['Slow morphing']) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setAutoMorph((value) => (value + 0.035) % 1);
    }, 900);

    return () => window.clearInterval(interval);
  }, [controls]);

  const settings = useMemo(
    () => ({
      preset: controls['Surface preset'],
      morphTarget: controls['Morph target'],
      morphAmount: controls['Slow morphing']
        ? 0.5 + 0.5 * Math.sin(autoMorph * Math.PI * 2)
        : controls['Morph amount'],
      isoLevel: controls['Iso-level / threshold'],
      resolution: controls.Resolution,
      scale: controls.Scale,
      frequency: controls['Number of periods / spatial frequency'],
      cropRadius: controls['Spherical crop radius'],
      cropSoftness: controls['Crop softness'],
      shellThickness: controls['Visual shell thickness'],
    }),
    [controls, autoMorph],
  );

  return (
    <div className="app-shell" data-black={controls['Black background']}>
      <Leva collapsed={false} oneLineLabels />
      <Canvas
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
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
          <SurfaceMesh
            settings={settings}
            colorMode={controls['Color mode']}
            smoothShading={controls['Smooth shading']}
            wireframe={controls.Wireframe}
            autoRotationSpeed={controls['Auto-rotation speed']}
            wobble={controls['Wobble / breathing animation']}
          />
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
