import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createSurfaceValue, type ScrewPhaseOptions } from '../math/differentialGeometry';
import {
  buildBonnetStripCurves,
  buildLabyrinthSkeletonApproximation,
  buildRibbonGeometryFromCurves,
  traceSurfaceRibbons,
  type BonnetStripMode,
  type GeometryOverlay,
  type LabyrinthSkeletonMode,
  type ParallelFocalMode,
  type RibbonField,
  type SkeletonResolution,
} from '../math/surfaceTracing';
import { buildMorphedField, type SurfaceSettings } from '../rendering/geometryCache';
import { createRibbonMaterial } from '../rendering/ribbonMaterial';

export interface DeveloperOverlaySettings {
  geometryOverlay: GeometryOverlay;
  finiteDifferenceEpsilon: number;
  overlayStrength: number;
  ribbonField: RibbonField;
  seedCount: number;
  traceLength: number;
  ribbonWidth: number;
  surfaceLift: number;
  animatePhase: boolean;
  bonnetStripMode: BonnetStripMode;
  bonnetParameter: number;
  stripPhase: number;
  stripWidth: number;
  baseSurfaceFade: number;
  labyrinthSkeleton: LabyrinthSkeletonMode;
  skeletonResolution: SkeletonResolution;
  skeletonThickness: number;
  skeletonVisibility: number;
  parallelFocalMode: ParallelFocalMode;
  offsetDistance: number;
  causticStrength: number;
  pointinessClamp: number;
  screwPhase: ScrewPhaseOptions['mode'];
  screwStrength: number;
  screwCoreRadius: number;
  screwTurns: number;
  screwPinch: number;
  screwSharpness: number;
  minimalityDiagnostic: boolean;
  complementSide: 'positive labyrinth' | 'negative labyrinth';
  autoRotationSpeed: number;
}

export function DeveloperOverlays({
  settings,
  developer,
}: {
  settings: SurfaceSettings;
  developer: DeveloperOverlaySettings;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const field = useMemo(() => buildMorphedField(settings), [settings]);
  const screw = useMemo(
    () => ({
      mode: developer.screwPhase,
      strength: developer.screwStrength,
      coreRadius: developer.screwCoreRadius,
      turns: developer.screwTurns,
      pinch: developer.screwPinch,
      sharpness: developer.screwSharpness,
    }),
    [
      developer.screwCoreRadius,
      developer.screwPhase,
      developer.screwPinch,
      developer.screwSharpness,
      developer.screwStrength,
      developer.screwTurns,
    ],
  );
  const value = useMemo(
    () =>
      createSurfaceValue({
        field,
        frequency: settings.frequency,
        isoLevel: settings.isoLevel,
        screw,
      }),
    [field, settings.frequency, settings.isoLevel, screw],
  );

  const ribbonGeometry = useMemo(() => {
    if (developer.ribbonField === 'Off') return null;
    const curves = traceSurfaceRibbons({
      value,
      field: developer.ribbonField,
      cropRadius: settings.cropRadius,
      seedCount: developer.seedCount,
      traceLength: developer.traceLength,
      ribbonWidth: developer.ribbonWidth,
      lift: developer.surfaceLift,
      epsilon: developer.finiteDifferenceEpsilon,
      phase: developer.stripPhase * Math.PI * 2,
    });
    return buildRibbonGeometryFromCurves(curves, {
      value,
      width: developer.ribbonWidth,
      lift: developer.surfaceLift,
      epsilon: developer.finiteDifferenceEpsilon,
    });
  }, [
    developer.finiteDifferenceEpsilon,
    developer.ribbonField,
    developer.ribbonWidth,
    developer.seedCount,
    developer.surfaceLift,
    developer.stripPhase,
    developer.traceLength,
    settings.cropRadius,
    value,
  ]);

  const stripGeometry = useMemo(() => {
    if (developer.bonnetStripMode === 'Off') return null;
    const curves = buildBonnetStripCurves({
      mode: developer.bonnetStripMode,
      value,
      cropRadius: settings.cropRadius,
      epsilon: developer.finiteDifferenceEpsilon,
      phase: developer.stripPhase,
      width: developer.stripWidth,
      parameter: developer.bonnetParameter,
    });
    if (curves.length === 0) return null;
    return buildRibbonGeometryFromCurves(curves, {
      value,
      width: developer.stripWidth * (developer.bonnetStripMode === 'Surface Weave' ? 0.62 : 1),
      lift: developer.bonnetStripMode === 'Surface Weave' ? Math.max(0.014, developer.surfaceLift) : 0.026,
      epsilon: developer.finiteDifferenceEpsilon,
      closed: developer.bonnetStripMode === 'Surface Weave',
    });
  }, [
    developer.bonnetParameter,
    developer.bonnetStripMode,
    developer.finiteDifferenceEpsilon,
    developer.surfaceLift,
    developer.stripPhase,
    developer.stripWidth,
    settings.cropRadius,
    value,
  ]);

  const skeletonGeometry = useMemo(() => {
    if (developer.labyrinthSkeleton === 'Off') return null;
    return buildLabyrinthSkeletonApproximation({
      value,
      side: developer.complementSide === 'negative labyrinth' ? -1 : 1,
      cropRadius: settings.cropRadius,
      epsilon: developer.finiteDifferenceEpsilon,
      resolution: developer.skeletonResolution,
    });
  }, [
    developer.complementSide,
    developer.finiteDifferenceEpsilon,
    developer.labyrinthSkeleton,
    developer.skeletonResolution,
    settings.cropRadius,
    value,
  ]);

  const ribbonMaterial = useMemo(
    () => {
      const material = createRibbonMaterial({
        look: 1,
        rainbowIntensity: 0.95,
        oilSlickIntensity: 0.72,
        fiberDensity: 32,
      });
      material.depthTest = true;
      material.depthWrite = false;
      return material;
    },
    [],
  );
  const stripMaterial = useMemo(
    () => {
      const material = createRibbonMaterial({
        look: 3,
        rainbowIntensity: 0.65,
        oilSlickIntensity: 0.45,
        fiberDensity: 18,
      });
      material.depthTest = true;
      material.depthWrite = false;
      material.polygonOffset = true;
      material.polygonOffsetFactor = -1;
      return material;
    },
    [],
  );

  useEffect(
    () => () => {
      ribbonGeometry?.dispose();
      stripGeometry?.dispose();
      skeletonGeometry?.dispose();
    },
    [ribbonGeometry, skeletonGeometry, stripGeometry],
  );
  useEffect(() => () => ribbonMaterial.dispose(), [ribbonMaterial]);
  useEffect(() => () => stripMaterial.dispose(), [stripMaterial]);

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * developer.autoRotationSpeed;
      if (developer.animatePhase) {
        groupRef.current.rotation.z += delta * 0.12;
      }
    }
    ribbonMaterial.uniforms.uCameraPosition.value.copy(camera.position);
    stripMaterial.uniforms.uCameraPosition.value.copy(camera.position);
  });

  return (
    <group ref={groupRef}>
      {ribbonGeometry && <mesh geometry={ribbonGeometry} material={ribbonMaterial} renderOrder={40} />}
      {stripGeometry && <mesh geometry={stripGeometry} material={stripMaterial} renderOrder={41} />}
      {skeletonGeometry && developer.labyrinthSkeleton === 'Distance Ridge Points' && (
        <points geometry={skeletonGeometry} renderOrder={42}>
          <pointsMaterial
            size={developer.skeletonThickness}
            vertexColors
            transparent
            opacity={developer.skeletonVisibility}
            depthTest={false}
          />
        </points>
      )}
      {skeletonGeometry && developer.labyrinthSkeleton === 'Ribbonized Skeleton' && (
        <points geometry={skeletonGeometry} renderOrder={42}>
          <pointsMaterial
            size={developer.skeletonThickness * 1.8}
            color="#a9fbff"
            transparent
            opacity={developer.skeletonVisibility}
            depthTest={false}
          />
        </points>
      )}
    </group>
  );
}
