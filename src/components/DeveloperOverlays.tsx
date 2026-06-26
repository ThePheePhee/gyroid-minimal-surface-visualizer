import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { createSurfaceValue, type ScrewPhaseOptions } from '../math/differentialGeometry';
import {
  buildBonnetStripCurves,
  buildDiagnosticGeometry,
  buildFocalPointGeometry,
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
import { TpmsPreviewSurface } from './TpmsPreviewSurface';

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
    }),
    [developer.screwCoreRadius, developer.screwPhase, developer.screwStrength],
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

  const diagnostic = useMemo(() => {
    const overlay =
      developer.minimalityDiagnostic && developer.screwPhase !== 'Off'
        ? 'Minimality Error'
        : developer.geometryOverlay;
    if (overlay === 'Off') return null;
    return buildDiagnosticGeometry({
      value,
      cropRadius: settings.cropRadius,
      overlay,
      epsilon: developer.finiteDifferenceEpsilon,
      strength: developer.overlayStrength,
    });
  }, [
    developer.finiteDifferenceEpsilon,
    developer.geometryOverlay,
    developer.minimalityDiagnostic,
    developer.overlayStrength,
    developer.screwPhase,
    settings.cropRadius,
    value,
  ]);

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
      value,
      cropRadius: settings.cropRadius,
      epsilon: developer.finiteDifferenceEpsilon,
      phase: developer.stripPhase,
      width: developer.stripWidth,
      parameter: developer.bonnetParameter,
    });
    return buildRibbonGeometryFromCurves(curves, {
      value,
      width: developer.stripWidth,
      lift: 0.026,
      epsilon: developer.finiteDifferenceEpsilon,
    });
  }, [
    developer.bonnetParameter,
    developer.bonnetStripMode,
    developer.finiteDifferenceEpsilon,
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

  const focalGeometry = useMemo(() => {
    if (developer.parallelFocalMode === 'Off') return null;
    return buildFocalPointGeometry({
      value,
      cropRadius: settings.cropRadius,
      epsilon: developer.finiteDifferenceEpsilon,
      mode: developer.parallelFocalMode,
      offsetDistance: developer.offsetDistance,
      causticStrength: developer.causticStrength,
      pointinessClamp: developer.pointinessClamp,
    });
  }, [
    developer.causticStrength,
    developer.finiteDifferenceEpsilon,
    developer.offsetDistance,
    developer.parallelFocalMode,
    developer.pointinessClamp,
    settings.cropRadius,
    value,
  ]);

  const ribbonMaterial = useMemo(
    () =>
      createRibbonMaterial({
        look: 1,
        rainbowIntensity: 0.95,
        oilSlickIntensity: 0.72,
        fiberDensity: 32,
      }),
    [],
  );
  const stripMaterial = useMemo(
    () =>
      createRibbonMaterial({
        look: 3,
        rainbowIntensity: 0.65,
        oilSlickIntensity: 0.45,
        fiberDensity: 18,
      }),
    [],
  );

  useEffect(
    () => () => {
      diagnostic?.geometry.dispose();
      ribbonGeometry?.dispose();
      stripGeometry?.dispose();
      skeletonGeometry?.dispose();
      focalGeometry?.dispose();
    },
    [diagnostic, focalGeometry, ribbonGeometry, skeletonGeometry, stripGeometry],
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
      {developer.baseSurfaceFade > 0 && developer.bonnetStripMode !== 'Off' && (
        <TpmsPreviewSurface
          settings={settings}
          visible
          opacity={developer.baseSurfaceFade * 0.35}
          color={developer.bonnetStripMode === 'Approx P-G-D Blend' ? '#ffe0a6' : '#94eaff'}
        />
      )}
      {diagnostic && diagnostic.kind === 'points' && (
        <points geometry={diagnostic.geometry}>
          <pointsMaterial size={0.018 + developer.overlayStrength * 0.018} vertexColors transparent opacity={0.86} />
        </points>
      )}
      {diagnostic && diagnostic.kind === 'lines' && (
        <lineSegments geometry={diagnostic.geometry}>
          <lineBasicMaterial vertexColors transparent opacity={0.45 + developer.overlayStrength * 0.45} />
        </lineSegments>
      )}
      {ribbonGeometry && <mesh geometry={ribbonGeometry} material={ribbonMaterial} />}
      {stripGeometry && <mesh geometry={stripGeometry} material={stripMaterial} />}
      {skeletonGeometry && developer.labyrinthSkeleton === 'Distance Ridge Points' && (
        <points geometry={skeletonGeometry}>
          <pointsMaterial
            size={developer.skeletonThickness}
            vertexColors
            transparent
            opacity={developer.skeletonVisibility}
          />
        </points>
      )}
      {skeletonGeometry && developer.labyrinthSkeleton === 'Ribbonized Skeleton' && (
        <points geometry={skeletonGeometry}>
          <pointsMaterial
            size={developer.skeletonThickness * 1.8}
            color="#a9fbff"
            transparent
            opacity={developer.skeletonVisibility}
          />
        </points>
      )}
      {focalGeometry && (
        <points geometry={focalGeometry}>
          <pointsMaterial
            size={developer.parallelFocalMode === 'Offset Surface' ? 0.014 : 0.026}
            vertexColors
            transparent
            opacity={0.5 + developer.causticStrength * 0.35}
          />
        </points>
      )}
    </group>
  );
}
