import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { button, folder, Leva, useControls } from 'leva';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { surfacePresets, type SurfacePreset } from '../math/scalarFields';
import type { FilmMaterial, KnotPreset } from '../math/knotGeometry';
import type { WeavePreset, WeaveRenderStyle } from '../math/weaveCurves';
import type { MorphPath } from '../rendering/geometryCache';
import {
  bonnetStripModeIndex,
  geometryOverlayIndex,
  parallelFocalModeIndex,
  screwPhaseIndex,
  type ComplementSide,
  type DeveloperRaymarchSettings,
} from '../rendering/raymarchMaterial';
import { colorModes, type ColorMode } from '../rendering/surfaceMaterial';
import { DeveloperOverlays } from './DeveloperOverlays';
import type { DeveloperOverlaySettings } from './DeveloperOverlays';
import { GpuSurface } from './GpuSurface';
import { KnotModeScene, type KnotRelationshipType } from './KnotModeScene';
import { SurfaceMesh } from './SurfaceMesh';

const presetOptions = Object.fromEntries(surfacePresets.map((preset) => [preset, preset]));
const colorOptions = Object.fromEntries(colorModes.map((mode) => [mode, mode]));
const renderModeOptions = {
  'GPU continuous raymarch': 'GPU continuous raymarch',
  'CPU mesh debug': 'CPU mesh debug',
} as const;
const geometryOverlayOptions: Record<DeveloperOverlaySettings['geometryOverlay'], DeveloperOverlaySettings['geometryOverlay']> = {
  Off: 'Off',
  'Curvature Color': 'Curvature Color',
  'Principal Directions': 'Principal Directions',
  'Asymptotic Directions': 'Asymptotic Directions',
  'Minimality Error': 'Minimality Error',
  'Focal Distance': 'Focal Distance',
};
const ribbonFieldOptions: Record<DeveloperOverlaySettings['ribbonField'], DeveloperOverlaySettings['ribbonField']> = {
  Off: 'Off',
  'Principal e1': 'Principal e1',
  'Principal e2': 'Principal e2',
  'Asymptotic +': 'Asymptotic +',
  'Asymptotic -': 'Asymptotic -',
};
const bonnetStripOptions: Record<DeveloperOverlaySettings['bonnetStripMode'], DeveloperOverlaySettings['bonnetStripMode']> = {
  Off: 'Off',
  'Approx P-G-D Blend': 'Approx P-G-D Blend',
  'Strip Overlay': 'Strip Overlay',
  'Surface Weave': 'Surface Weave',
};
const labyrinthSkeletonOptions: Record<DeveloperOverlaySettings['labyrinthSkeleton'], DeveloperOverlaySettings['labyrinthSkeleton']> = {
  Off: 'Off',
  'Distance Ridge Points': 'Distance Ridge Points',
  'Ribbonized Skeleton': 'Ribbonized Skeleton',
};
const skeletonResolutionOptions: Record<DeveloperOverlaySettings['skeletonResolution'], DeveloperOverlaySettings['skeletonResolution']> = {
  Low: 'Low',
  Medium: 'Medium',
};
const parallelFocalOptions: Record<DeveloperOverlaySettings['parallelFocalMode'], DeveloperOverlaySettings['parallelFocalMode']> = {
  Off: 'Off',
  'Offset Surface': 'Offset Surface',
  'Focal Highlight': 'Focal Highlight',
  'Near-Caustic Shell': 'Near-Caustic Shell',
};
const screwPhaseOptions: Record<DeveloperOverlaySettings['screwPhase'], DeveloperOverlaySettings['screwPhase']> = {
  Off: 'Off',
  'Single Defect': 'Single Defect',
  'Paired Defects': 'Paired Defects',
  'Helical Corkscrew': 'Helical Corkscrew',
  'Spiral Pinch': 'Spiral Pinch',
  'Thorn Crown': 'Thorn Crown',
};
const morphPathOptions: Record<MorphPath, MorphPath> = {
  'No morph': 'No morph',
  'A to B pulse': 'A to B pulse',
  'Cycle all families': 'Cycle all families',
};
const complementSideOptions: Record<ComplementSide, ComplementSide> = {
  'positive labyrinth': 'positive labyrinth',
  'negative labyrinth': 'negative labyrinth',
};
const visualizationModeOptions = {
  'Surface Mode': 'Surface Mode',
  'Knot Mode': 'Knot Mode',
} as const;
const knotRelationshipOptions: Record<KnotRelationshipType, KnotRelationshipType> = {
  'Surface Curves / Weaves': 'Surface Curves / Weaves',
  'Labyrinth Skeletons': 'Labyrinth Skeletons',
  'Knot-Bounded Minimal Film': 'Knot-Bounded Minimal Film',
};
const weavePresetOptions: Record<WeavePreset, WeavePreset> = {
  'clean mathematical ribbon': 'clean mathematical ribbon',
  'fiber-bundle rainbow ribbon': 'fiber-bundle rainbow ribbon',
  'metallic pale ribbon': 'metallic pale ribbon',
  'luminous braided textile': 'luminous braided textile',
};
const weaveStyleOptions: Record<WeaveRenderStyle, WeaveRenderStyle> = {
  line: 'line',
  tube: 'tube',
  ribbon: 'ribbon',
  'fiber-bundle ribbon': 'fiber-bundle ribbon',
};
const knotPresetOptions: Record<KnotPreset, KnotPreset> = {
  Trefoil: 'Trefoil',
  'Figure-eight': 'Figure-eight',
  'Torus knot': 'Torus knot',
};
const filmMaterialOptions: Record<FilmMaterial, FilmMaterial> = {
  'translucent soap film': 'translucent soap film',
  'pearl/porcelain': 'pearl/porcelain',
  'subtle rainbow interference': 'subtle rainbow interference',
};

const developerLabControls = folder(
  {
    'Differential Diagnostics': folder(
      {
        'Geometry Overlay': {
          value: 'Off' as DeveloperOverlaySettings['geometryOverlay'],
          options: geometryOverlayOptions,
        },
        'Finite Difference Epsilon': { value: 0.006, min: 0.001, max: 0.03, step: 0.001 },
        'Overlay Strength': { value: 0.5, min: 0, max: 1, step: 0.01 },
      },
      { collapsed: false },
    ),
    'Surface-Derived Ribbons': folder(
      {
        'Ribbon Field': {
          value: 'Off' as DeveloperOverlaySettings['ribbonField'],
          options: ribbonFieldOptions,
        },
        'Seed Count': { value: 24, min: 4, max: 72, step: 1 },
        'Trace Length': { value: 1.8, min: 0.3, max: 5, step: 0.05 },
        'Developer Ribbon Width': { value: 0.035, min: 0.006, max: 0.16, step: 0.002 },
        'Surface Lift': { value: 0.018, min: 0, max: 0.08, step: 0.002 },
        'Animate Phase': false,
      },
      { collapsed: true },
    ),
    'Bonnet / Strip Lab': folder(
      {
        'Bonnet Strip Mode': {
          value: 'Off' as DeveloperOverlaySettings['bonnetStripMode'],
          options: bonnetStripOptions,
        },
        'Bonnet Parameter': { value: 0.5, min: 0, max: 1, step: 0.01 },
        'Strip Phase': { value: 0, min: 0, max: 1, step: 0.01 },
        'Strip Width': { value: 0.055, min: 0.01, max: 0.22, step: 0.005 },
        'Base Surface Fade': { value: 0.62, min: 0, max: 1, step: 0.01 },
      },
      { collapsed: true },
    ),
    'Labyrinth Skeleton': folder(
      {
        'Labyrinth Skeleton Mode': {
          value: 'Off' as DeveloperOverlaySettings['labyrinthSkeleton'],
          options: labyrinthSkeletonOptions,
        },
        'Skeleton Resolution': {
          value: 'Low' as DeveloperOverlaySettings['skeletonResolution'],
          options: skeletonResolutionOptions,
        },
        'Developer Skeleton Thickness': { value: 0.035, min: 0.006, max: 0.12, step: 0.002 },
        'Skeleton Visibility': { value: 0.6, min: 0, max: 1, step: 0.01 },
      },
      { collapsed: true },
    ),
    'Parallel / Focal Pointiness': folder(
      {
        'Parallel / Focal Mode': {
          value: 'Off' as DeveloperOverlaySettings['parallelFocalMode'],
          options: parallelFocalOptions,
        },
        'Offset Distance': { value: 0.08, min: -0.35, max: 0.35, step: 0.005 },
        'Caustic Strength': { value: 0.5, min: 0, max: 1, step: 0.01 },
        'Pointiness Clamp': { value: 0.28, min: 0.05, max: 1.2, step: 0.01 },
      },
      { collapsed: true },
    ),
    'Screw Phase': folder(
      {
        'Screw Phase Mode': {
          value: 'Off' as DeveloperOverlaySettings['screwPhase'],
          options: screwPhaseOptions,
        },
        'Screw Strength': { value: 0, min: -2.5, max: 2.5, step: 0.01 },
        'Screw Core Radius': { value: 0.7, min: 0.05, max: 2, step: 0.01 },
        'Screw Turns': { value: 2.6, min: 0.2, max: 9, step: 0.05 },
        'Screw Pinch': { value: 0.25, min: -0.5, max: 1.8, step: 0.01 },
        'Screw Sharpness': { value: 3.2, min: 1, max: 8, step: 0.05 },
        'Minimality Diagnostic': true,
      },
      { collapsed: true },
    ),
  },
  { collapsed: false },
);

type LevaGet = (path: string) => unknown;
type ControlPage = 'main' | 'developer';

export function Scene() {
  const isOpera = typeof navigator !== 'undefined' && /\bOPR\//.test(navigator.userAgent);
  const maxDevicePixelRatio = isOpera ? 1 : 1.25;
  const defaultRaySteps = isOpera ? 96 : 192;
  const defaultRenderMode = 'GPU continuous raymarch';
  const [controlPage, setControlPage] = useState<ControlPage>('main');
  const [developerActive, setDeveloperActive] = useState(false);
  const whenMain = () => controlPage === 'main';
  const whenSurface = (get: LevaGet) => whenMain() && get('Visualization Mode') === 'Surface Mode';
  const whenSurfaceGpu = (get: LevaGet) =>
    whenSurface(get) && get('Render mode') === 'GPU continuous raymarch';
  const whenComplementSolid = (get: LevaGet) =>
    whenSurfaceGpu(get) && get('Complement solid') === true;
  const whenKnot = (get: LevaGet) => whenMain() && get('Visualization Mode') === 'Knot Mode';
  const whenKnotSurfaceRelation = (get: LevaGet) =>
    whenKnot(get) && get('Knot Relationship Type') !== 'Knot-Bounded Minimal Film';
  const whenKnotType = (type: KnotRelationshipType) => (get: LevaGet) =>
    whenKnot(get) && get('Knot Relationship Type') === type;
  const developerLabLabel = developerActive
    ? 'Developer Lab active ->'
    : 'Developer Lab ->';
  const developerToggleLabel = developerActive
    ? 'Disable live developer geometry'
    : 'Enable live developer geometry';
  const [controls, setControls] = useControls(
    () => ({
      ...(controlPage === 'main'
        ? {
            [developerLabLabel]: button(() => setControlPage('developer')),
          }
        : {
            '<- Main controls': button(() => setControlPage('main')),
            [developerToggleLabel]: button(() => setDeveloperActive((active) => !active)),
          }),
      'Visualization Mode': { value: 'Surface Mode', options: visualizationModeOptions, render: whenMain },
      'Render mode': { value: defaultRenderMode, options: renderModeOptions, render: whenSurface },
      'GPU ray steps': { value: defaultRaySteps, min: 64, max: 384, step: 16, render: whenSurface },
      'Surface preset': { value: 'Gyroid' as SurfacePreset, options: presetOptions, render: whenSurface },
      'Morph target': { value: 'Diamond' as SurfacePreset, options: presetOptions, render: whenSurface },
      'Morph path': { value: 'No morph' as MorphPath, options: morphPathOptions, render: whenSurface },
      'Morph amount': { value: 0, min: 0, max: 1, step: 0.01, render: whenSurface },
      'Animate morph': { value: false, render: whenSurface },
      'Morph speed': { value: 0.08, min: 0.01, max: 0.5, step: 0.01, render: whenSurface },
      'Morph remesh rate': { value: 10, min: 2, max: 20, step: 1, render: whenSurface },
      'Iso-level / threshold': { value: 0, min: -0.7, max: 0.7, step: 0.01, render: whenSurface },
      Resolution: { value: 64, min: 24, max: 96, step: 2, render: whenSurface },
      Scale: { value: 2.25, min: 1.2, max: 4, step: 0.05, render: whenSurface },
      'Number of periods / spatial frequency': { value: 3.1, min: 0.8, max: 6, step: 0.05, render: whenSurface },
      'Spherical crop radius': { value: 2.08, min: 0.6, max: 3.8, step: 0.03, render: whenSurface },
      'Crop softness': { value: 0.09, min: 0.01, max: 0.5, step: 0.01, render: whenSurface },
      'Visual shell thickness': { value: 0.04, min: 0, max: 0.16, step: 0.005, render: whenSurface },
      'Complement solid': { value: false, render: whenSurfaceGpu },
    'Complement side': {
      value: 'positive labyrinth' as ComplementSide,
      options: complementSideOptions,
      render: whenComplementSolid,
    },
    Wireframe: { value: false, render: whenSurface },
    'Smooth shading': { value: true, render: whenSurface },
    'Color mode': { value: 'rainbow curvature-like bands' as ColorMode, options: colorOptions, render: whenSurface },
    'Black background': { value: true, render: whenMain },
    'Auto-rotation speed': { value: 0.22, min: 0, max: 1.5, step: 0.01, render: whenMain },
    'Wobble amplitude': { value: 0.018, min: 0, max: 0.12, step: 0.002, render: whenSurface },
    'Wobble speed': { value: 1.15, min: 0.05, max: 4, step: 0.05, render: whenSurface },
    'Wobble spatial scale': { value: 4.2, min: 0.5, max: 12, step: 0.1, render: whenSurface },
    'Whole-object breathing': { value: 0.018, min: 0, max: 0.12, step: 0.002, render: whenSurface },
    'Psychedelic twist': { value: 0.035, min: 0, max: 0.5, step: 0.005, render: whenSurface },
    'Knot Relationship Type': {
      value: 'Surface Curves / Weaves' as KnotRelationshipType,
      options: knotRelationshipOptions,
      render: whenKnot,
    },
    'Knot surface preset': { value: 'Gyroid' as SurfacePreset, options: presetOptions, render: whenKnot },
    'Knot morph target': { value: 'Lidinoid' as SurfacePreset, options: presetOptions, render: whenKnotSurfaceRelation },
    'Knot morph path': { value: 'No morph' as MorphPath, options: morphPathOptions, render: whenKnotSurfaceRelation },
    'Knot morph amount': { value: 0, min: 0, max: 1, step: 0.01, render: whenKnotSurfaceRelation },
    'Animate knot morph': { value: false, render: whenKnotSurfaceRelation },
    'Knot morph speed': { value: 0.06, min: 0.01, max: 0.5, step: 0.01, render: whenKnotSurfaceRelation },
    'Knot morph remesh rate': { value: 8, min: 2, max: 20, step: 1, render: whenKnotSurfaceRelation },
    'Knot iso-level': { value: 0, min: -0.5, max: 0.5, step: 0.01, render: whenKnot },
    'Knot resolution': { value: 46, min: 20, max: 72, step: 2, render: whenKnot },
    'Knot field frequency': { value: 3.1, min: 1.2, max: 5, step: 0.05, render: whenKnot },
    'Knot crop radius': { value: 2.1, min: 1, max: 3.6, step: 0.05, render: whenKnot },
    'Show knot surface': { value: true, render: whenKnot },
    'Knot surface opacity': { value: 0.22, min: 0, max: 0.75, step: 0.01, render: whenKnot },
    'Show skeleton A': { value: true, render: whenKnotType('Labyrinth Skeletons') },
    'Show skeleton B': { value: true, render: whenKnotType('Labyrinth Skeletons') },
    'Skeleton tube radius': { value: 0.026, min: 0.006, max: 0.09, step: 0.002, render: whenKnotType('Labyrinth Skeletons') },
    'Skeleton animation speed': { value: 0, min: 0, max: 8, step: 0.1, render: whenKnotType('Labyrinth Skeletons') },
    'Weave preset': {
      value: 'fiber-bundle rainbow ribbon' as WeavePreset,
      options: weavePresetOptions,
      render: whenKnotType('Surface Curves / Weaves'),
    },
    'Weave render style': {
      value: 'fiber-bundle ribbon' as WeaveRenderStyle,
      options: weaveStyleOptions,
      render: whenKnotType('Surface Curves / Weaves'),
    },
    'Strand count': { value: 9, min: 2, max: 24, step: 1, render: whenKnotType('Surface Curves / Weaves') },
    'Strand spacing': { value: 0.62, min: 0.18, max: 1.4, step: 0.02, render: whenKnotType('Surface Curves / Weaves') },
    'Strand thickness': { value: 0.018, min: 0.004, max: 0.08, step: 0.002, render: whenKnotType('Surface Curves / Weaves') },
    'Ribbon width': { value: 0.15, min: 0.025, max: 0.42, step: 0.005, render: whenKnotType('Surface Curves / Weaves') },
    'Ribbon thickness': { value: 0.012, min: 0, max: 0.06, step: 0.002, render: whenKnotType('Surface Curves / Weaves') },
    'Curve integration length': { value: 2.1, min: 0.8, max: 4.2, step: 0.05, render: whenKnotType('Surface Curves / Weaves') },
    'Seed pattern': { value: 1, min: 0, max: 12, step: 1, render: whenKnotType('Surface Curves / Weaves') },
    'Rainbow intensity': { value: 0.92, min: 0, max: 1, step: 0.01, render: whenKnotType('Surface Curves / Weaves') },
    'Oil slick intensity': { value: 0.55, min: 0, max: 1, step: 0.01, render: whenKnotType('Surface Curves / Weaves') },
    'Fiber texture density': { value: 34, min: 4, max: 96, step: 1, render: whenKnotType('Surface Curves / Weaves') },
    'Weave breathing': { value: 0.012, min: 0, max: 0.08, step: 0.002, render: whenKnotType('Surface Curves / Weaves') },
    'Knot preset': { value: 'Trefoil' as KnotPreset, options: knotPresetOptions, render: whenKnotType('Knot-Bounded Minimal Film') },
    'Knot scale': { value: 1.2, min: 0.4, max: 2.3, step: 0.04, render: whenKnotType('Knot-Bounded Minimal Film') },
    'Boundary tube radius': { value: 0.035, min: 0.006, max: 0.12, step: 0.002, render: whenKnotType('Knot-Bounded Minimal Film') },
    'Show boundary knot': { value: true, render: whenKnotType('Knot-Bounded Minimal Film') },
    'Show film': { value: true, render: whenKnotType('Knot-Bounded Minimal Film') },
    'Film opacity': { value: 0.48, min: 0, max: 0.9, step: 0.01, render: whenKnotType('Knot-Bounded Minimal Film') },
    'Film smoothing iterations': { value: 28, min: 0, max: 90, step: 1, render: whenKnotType('Knot-Bounded Minimal Film') },
    'Film thickness': { value: 0.01, min: 0, max: 0.08, step: 0.002, render: whenKnotType('Knot-Bounded Minimal Film') },
    'Film material': { value: 'subtle rainbow interference' as FilmMaterial, options: filmMaterialOptions, render: whenKnotType('Knot-Bounded Minimal Film') },
    'Torus p': { value: 2, min: 1, max: 8, step: 1, render: whenKnotType('Knot-Bounded Minimal Film') },
    'Torus q': { value: 3, min: 1, max: 9, step: 1, render: whenKnotType('Knot-Bounded Minimal Film') },
    ...(controlPage === 'developer'
      ? { 'Differential Geometry / Ribbon Lab': developerLabControls }
      : {}),
    }),
    [controlPage, defaultRaySteps, defaultRenderMode, developerActive, developerLabLabel, developerToggleLabel, isOpera],
  );

  const [autoMorph, setAutoMorph] = useState(0);
  const [autoKnotMorph, setAutoKnotMorph] = useState(0);
  const hasAppliedInitialRenderMode = useRef(false);

  useEffect(() => {
    if (hasAppliedInitialRenderMode.current) {
      return;
    }

    setControls({ 'Render mode': 'GPU continuous raymarch' });
    hasAppliedInitialRenderMode.current = true;
  }, [setControls]);

  useEffect(() => {
    if (isOpera && controls['GPU ray steps'] > defaultRaySteps) {
      setControls({ 'GPU ray steps': defaultRaySteps });
    }
  }, [controls, defaultRaySteps, isOpera, setControls]);

  const developerRuntimeEnabled = developerActive;
  const developerShaderMode = developerRuntimeEnabled ? 'live' : 'off';
  const effectiveRaySteps = isOpera
    ? Math.min(controls['GPU ray steps'], defaultRaySteps)
    : controls['GPU ray steps'];

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

  useEffect(() => {
    if (!controls['Animate knot morph'] || controls['Knot morph path'] === 'No morph') {
      return undefined;
    }

    let frameId = 0;
    let phase = autoKnotMorph;
    let lastTime = performance.now();
    let lastRemesh = lastTime;
    const remeshInterval = 1000 / controls['Knot morph remesh rate'];

    const tick = (time: number) => {
      const delta = Math.min(0.1, (time - lastTime) / 1000);
      lastTime = time;
      phase = (phase + delta * controls['Knot morph speed']) % 1;

      if (time - lastRemesh >= remeshInterval) {
        setAutoKnotMorph(phase);
        lastRemesh = time;
      }

      frameId = window.requestAnimationFrame(tick);
    };

    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [autoKnotMorph, controls]);

  const effectiveMorphAmount =
    controls['Morph path'] === 'No morph'
      ? 0
      : controls['Animate morph']
        ? controls['Morph path'] === 'Cycle all families'
          ? autoMorph
          : 0.5 + 0.5 * Math.sin(autoMorph * Math.PI * 2)
        : controls['Morph amount'];

  const effectiveKnotMorphAmount =
    controls['Knot morph path'] === 'No morph'
      ? 0
      : controls['Animate knot morph']
        ? controls['Knot morph path'] === 'Cycle all families'
          ? autoKnotMorph
          : 0.5 + 0.5 * Math.sin(autoKnotMorph * Math.PI * 2)
        : controls['Knot morph amount'];

  const settings = useMemo(
    () => ({
      preset: controls['Surface preset'],
      morphTarget: controls['Morph target'],
      morphPath: controls['Morph path'],
      morphAmount: effectiveMorphAmount,
      isoLevel: controls['Iso-level / threshold'],
      resolution: controls['Resolution'],
      scale: controls['Scale'],
      frequency: controls['Number of periods / spatial frequency'],
      cropRadius: controls['Spherical crop radius'],
      cropSoftness: controls['Crop softness'],
      shellThickness: controls['Visual shell thickness'],
    }),
    [controls, effectiveMorphAmount],
  );

  const developerSettings = useMemo<DeveloperOverlaySettings>(
    () => {
      const read = <T,>(key: string, fallback: T): T => (controls[key] ?? fallback) as T;

      return {
        geometryOverlay: read('Geometry Overlay', 'Off' as DeveloperOverlaySettings['geometryOverlay']),
        finiteDifferenceEpsilon: read('Finite Difference Epsilon', 0.006),
        overlayStrength: read('Overlay Strength', 0.5),
        ribbonField: read('Ribbon Field', 'Off' as DeveloperOverlaySettings['ribbonField']),
        seedCount: read('Seed Count', 24),
        traceLength: read('Trace Length', 1.8),
        ribbonWidth: read('Developer Ribbon Width', 0.035),
        surfaceLift: read('Surface Lift', 0.018),
        animatePhase: read('Animate Phase', false),
        bonnetStripMode: read('Bonnet Strip Mode', 'Off' as DeveloperOverlaySettings['bonnetStripMode']),
        bonnetParameter: read('Bonnet Parameter', 0.5),
        stripPhase: read('Strip Phase', 0),
        stripWidth: read('Strip Width', 0.055),
        baseSurfaceFade: read('Base Surface Fade', 0.62),
        labyrinthSkeleton: read('Labyrinth Skeleton Mode', 'Off' as DeveloperOverlaySettings['labyrinthSkeleton']),
        skeletonResolution: read('Skeleton Resolution', 'Low' as DeveloperOverlaySettings['skeletonResolution']),
        skeletonThickness: read('Developer Skeleton Thickness', 0.035),
        skeletonVisibility: read('Skeleton Visibility', 0.6),
        parallelFocalMode: read('Parallel / Focal Mode', 'Off' as DeveloperOverlaySettings['parallelFocalMode']),
        offsetDistance: read('Offset Distance', 0.08),
        causticStrength: read('Caustic Strength', 0.5),
        pointinessClamp: read('Pointiness Clamp', 0.28),
        screwPhase: read('Screw Phase Mode', 'Off' as DeveloperOverlaySettings['screwPhase']),
        screwStrength: read('Screw Strength', 0),
        screwCoreRadius: read('Screw Core Radius', 0.7),
        screwTurns: read('Screw Turns', 2.6),
        screwPinch: read('Screw Pinch', 0.25),
        screwSharpness: read('Screw Sharpness', 3.2),
        minimalityDiagnostic: read('Minimality Diagnostic', true),
        complementSide: read('Complement side', 'positive labyrinth' as ComplementSide),
        autoRotationSpeed: read('Auto-rotation speed', 0.22),
      };
    },
    [controls],
  );

  const developerRaymarchSettings = useMemo<DeveloperRaymarchSettings>(
    () => ({
      enabled: developerRuntimeEnabled && controls['Visualization Mode'] === 'Surface Mode',
      shaderMode: developerShaderMode,
      geometryOverlay: geometryOverlayIndex[developerSettings.geometryOverlay],
      overlayStrength: developerSettings.overlayStrength,
      finiteDifferenceEpsilon: developerSettings.finiteDifferenceEpsilon,
      bonnetStripMode: bonnetStripModeIndex[developerSettings.bonnetStripMode],
      bonnetParameter: developerSettings.bonnetParameter,
      stripPhase: developerSettings.stripPhase,
      stripWidth: developerSettings.stripWidth,
      baseSurfaceFade: developerSettings.baseSurfaceFade,
      parallelFocalMode: parallelFocalModeIndex[developerSettings.parallelFocalMode],
      offsetDistance: developerSettings.offsetDistance,
      causticStrength: developerSettings.causticStrength,
      pointinessClamp: developerSettings.pointinessClamp,
      screwPhase: screwPhaseIndex[developerSettings.screwPhase],
      screwStrength: developerSettings.screwStrength,
      screwCoreRadius: developerSettings.screwCoreRadius,
      screwTurns: developerSettings.screwTurns,
      screwPinch: developerSettings.screwPinch,
      screwSharpness: developerSettings.screwSharpness,
      minimalityDiagnostic: developerSettings.minimalityDiagnostic,
    }),
    [controls, developerRuntimeEnabled, developerSettings, developerShaderMode],
  );

  return (
    <div className="app-shell" data-black={controls['Black background']}>
      <Leva collapsed={false} oneLineLabels />
      <Canvas
        dpr={[1, maxDevicePixelRatio]}
        gl={{
          antialias: !isOpera,
          outputColorSpace: THREE.SRGBColorSpace,
          powerPreference: 'high-performance',
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
          {controls['Visualization Mode'] === 'Knot Mode' ? (
            <KnotModeScene
              relationshipType={controls['Knot Relationship Type']}
              surfacePreset={controls['Knot surface preset']}
              morphTarget={controls['Knot morph target']}
              morphPath={controls['Knot morph path']}
              morphAmount={effectiveKnotMorphAmount}
              isoLevel={controls['Knot iso-level']}
              resolution={controls['Knot resolution']}
              fieldFrequency={controls['Knot field frequency']}
              cropRadius={controls['Knot crop radius']}
              surfaceOpacity={controls['Knot surface opacity']}
              showSurface={controls['Show knot surface']}
              showSkeletonA={controls['Show skeleton A']}
              showSkeletonB={controls['Show skeleton B']}
              skeletonTubeRadius={controls['Skeleton tube radius']}
              skeletonAnimationSpeed={controls['Skeleton animation speed']}
              weavePreset={controls['Weave preset']}
              strandCount={controls['Strand count']}
              strandSpacing={controls['Strand spacing']}
              strandThickness={controls['Strand thickness']}
              ribbonWidth={controls['Ribbon width']}
              ribbonThickness={controls['Ribbon thickness']}
              integrationLength={controls['Curve integration length']}
              seedPattern={controls['Seed pattern']}
              renderStyle={controls['Weave render style']}
              rainbowIntensity={controls['Rainbow intensity']}
              oilSlickIntensity={controls['Oil slick intensity']}
              fiberDensity={controls['Fiber texture density']}
              weaveBreathing={controls['Weave breathing']}
              knotPreset={controls['Knot preset']}
              knotScale={controls['Knot scale']}
              boundaryTubeRadius={controls['Boundary tube radius']}
              showBoundary={controls['Show boundary knot']}
              showFilm={controls['Show film']}
              filmOpacity={controls['Film opacity']}
              smoothingIterations={controls['Film smoothing iterations']}
              filmThickness={controls['Film thickness']}
              filmMaterial={controls['Film material']}
              torusP={controls['Torus p']}
              torusQ={controls['Torus q']}
              autoRotationSpeed={controls['Auto-rotation speed']}
            />
          ) : controls['Render mode'] === 'GPU continuous raymarch' ? (
            <GpuSurface
              settings={settings}
              colorMode={controls['Color mode']}
              raySteps={effectiveRaySteps}
              autoRotationSpeed={controls['Auto-rotation speed']}
              wobbleAmplitude={controls['Wobble amplitude']}
              wobbleSpeed={controls['Wobble speed']}
              wobbleScale={controls['Wobble spatial scale']}
              breathing={controls['Whole-object breathing']}
              twist={controls['Psychedelic twist']}
              complementSolid={controls['Complement solid']}
              complementSide={controls['Complement side']}
              developer={developerRaymarchSettings}
            />
          ) : (
            <SurfaceMesh
              settings={settings}
              colorMode={controls['Color mode']}
              smoothShading={controls['Smooth shading']}
              wireframe={controls['Wireframe']}
              autoRotationSpeed={controls['Auto-rotation speed']}
              wobbleAmplitude={controls['Wobble amplitude']}
              wobbleSpeed={controls['Wobble speed']}
              wobbleScale={controls['Wobble spatial scale']}
              breathing={controls['Whole-object breathing']}
              twist={controls['Psychedelic twist']}
            />
          )}
          {developerRuntimeEnabled && controls['Visualization Mode'] === 'Surface Mode' && (
            <DeveloperOverlays settings={settings} developer={developerSettings} />
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
