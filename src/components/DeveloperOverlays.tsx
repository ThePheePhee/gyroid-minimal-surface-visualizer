import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import type { ScrewPhaseOptions } from '../math/differentialGeometry';
import type {
  BonnetStripMode,
  GeometryOverlay,
  LabyrinthSkeletonMode,
  ParallelFocalMode,
  RibbonField,
  SkeletonResolution,
} from '../math/surfaceTracing';
import type { SurfaceSettings } from '../rendering/geometryCache';
import { createRibbonMaterial } from '../rendering/ribbonMaterial';
import type {
  DeveloperGeometryRequest,
  DeveloperGeometryResponse,
  DeveloperGeometrySettings,
  SerializedGeometry,
} from '../workers/developerGeometryWorker';

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

type GeometryBundle = {
  ribbon: THREE.BufferGeometry | null;
  strip: THREE.BufferGeometry | null;
  skeleton: THREE.BufferGeometry | null;
};

const emptyGeometryBundle = (): GeometryBundle => ({ ribbon: null, strip: null, skeleton: null });

export function DeveloperOverlays({
  settings,
  developer,
  visible,
}: {
  settings: SurfaceSettings;
  developer: DeveloperOverlaySettings;
  visible: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const workerRef = useRef<Worker | null>(null);
  const requestId = useRef(0);
  const geometryRef = useRef<GeometryBundle>(emptyGeometryBundle());
  const [geometry, setGeometry] = useState<GeometryBundle>(emptyGeometryBundle);
  const { camera } = useThree();
  const needsWorkerGeometry =
    developer.ribbonField !== 'Off' ||
    developer.bonnetStripMode === 'Surface Weave' ||
    developer.labyrinthSkeleton !== 'Off';
  const geometryDeveloper = useMemo<DeveloperGeometrySettings>(
    () => ({
      finiteDifferenceEpsilon: developer.finiteDifferenceEpsilon,
      ribbonField: developer.ribbonField,
      seedCount: developer.seedCount,
      traceLength: developer.traceLength,
      ribbonWidth: developer.ribbonWidth,
      surfaceLift: developer.surfaceLift,
      bonnetStripMode: developer.bonnetStripMode,
      bonnetParameter: developer.bonnetParameter,
      stripPhase: developer.stripPhase,
      stripWidth: developer.stripWidth,
      labyrinthSkeleton: developer.labyrinthSkeleton,
      skeletonResolution: developer.skeletonResolution,
      complementSide: developer.complementSide,
      screwPhase: developer.screwPhase,
      screwStrength: developer.screwStrength,
      screwCoreRadius: developer.screwCoreRadius,
      screwTurns: developer.screwTurns,
      screwPinch: developer.screwPinch,
      screwSharpness: developer.screwSharpness,
    }),
    [
      developer.bonnetParameter,
      developer.bonnetStripMode,
      developer.complementSide,
      developer.finiteDifferenceEpsilon,
      developer.labyrinthSkeleton,
      developer.ribbonField,
      developer.ribbonWidth,
      developer.screwCoreRadius,
      developer.screwPhase,
      developer.screwPinch,
      developer.screwSharpness,
      developer.screwStrength,
      developer.screwTurns,
      developer.seedCount,
      developer.skeletonResolution,
      developer.stripPhase,
      developer.stripWidth,
      developer.surfaceLift,
      developer.traceLength,
    ],
  );

  useEffect(() => {
    requestId.current += 1;
    const id = requestId.current;
    workerRef.current?.terminate();
    workerRef.current = null;

    if (!needsWorkerGeometry) {
      const clearTimer = window.setTimeout(() => {
        setGeometry((previous) => {
          disposeGeometryBundle(previous);
          const next = emptyGeometryBundle();
          geometryRef.current = next;
          return next;
        });
      }, 0);
      return () => window.clearTimeout(clearTimer);
    }

    let worker: Worker | null = null;
    const startTimer = window.setTimeout(() => {
      worker = new Worker(new URL('../workers/developerGeometryWorker.ts', import.meta.url), {
        type: 'module',
      });
      workerRef.current = worker;
      worker.onmessage = ({ data }: MessageEvent<DeveloperGeometryResponse>) => {
        if (data.id !== requestId.current || data.error) {
          worker?.terminate();
          if (workerRef.current === worker) workerRef.current = null;
          return;
        }
        const next = {
          ribbon: deserializeGeometry(data.ribbon),
          strip: deserializeGeometry(data.strip),
          skeleton: deserializeGeometry(data.skeleton),
        };
        setGeometry((previous) => {
          disposeGeometryBundle(previous);
          geometryRef.current = next;
          return next;
        });
        worker?.terminate();
        if (workerRef.current === worker) workerRef.current = null;
      };
      worker.onerror = () => {
        worker?.terminate();
        if (workerRef.current === worker) workerRef.current = null;
      };
      const request: DeveloperGeometryRequest = { id, settings, developer: geometryDeveloper };
      worker.postMessage(request);
    }, 120);

    return () => {
      window.clearTimeout(startTimer);
      worker?.terminate();
      if (workerRef.current === worker) workerRef.current = null;
    };
  }, [
    geometryDeveloper,
    needsWorkerGeometry,
    settings,
  ]);

  useEffect(
    () => () => {
      workerRef.current?.terminate();
      disposeGeometryBundle(geometryRef.current);
    },
    [],
  );

  const ribbonMaterial = useMemo(() => {
    const material = createRibbonMaterial({
      look: 1,
      rainbowIntensity: 0.95,
      oilSlickIntensity: 0.72,
      fiberDensity: 32,
    });
    material.depthTest = true;
    material.depthWrite = false;
    return material;
  }, []);
  const stripMaterial = useMemo(() => {
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
  }, []);

  useEffect(() => () => ribbonMaterial.dispose(), [ribbonMaterial]);
  useEffect(() => () => stripMaterial.dispose(), [stripMaterial]);

  useFrame((_, delta) => {
    if (groupRef.current && visible) {
      groupRef.current.rotation.y += delta * developer.autoRotationSpeed;
      if (developer.animatePhase) groupRef.current.rotation.z += delta * 0.12;
    }
    ribbonMaterial.uniforms.uCameraPosition.value.copy(camera.position);
    stripMaterial.uniforms.uCameraPosition.value.copy(camera.position);
  });

  return (
    <group ref={groupRef} visible={visible}>
      {geometry.ribbon && developer.ribbonField !== 'Off' && (
        <mesh geometry={geometry.ribbon} material={ribbonMaterial} renderOrder={40} />
      )}
      {geometry.strip && developer.bonnetStripMode === 'Surface Weave' && (
        <mesh geometry={geometry.strip} material={stripMaterial} renderOrder={41} />
      )}
      {geometry.skeleton && developer.labyrinthSkeleton === 'Distance Ridge Points' && (
        <points geometry={geometry.skeleton} renderOrder={42}>
          <pointsMaterial
            size={developer.skeletonThickness}
            vertexColors
            transparent
            opacity={developer.skeletonVisibility}
            depthTest
            depthWrite={false}
          />
        </points>
      )}
      {geometry.skeleton && developer.labyrinthSkeleton === 'Ribbonized Skeleton' && (
        <points geometry={geometry.skeleton} renderOrder={42}>
          <pointsMaterial
            size={developer.skeletonThickness * 1.8}
            color="#a9fbff"
            transparent
            opacity={developer.skeletonVisibility}
            depthTest
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
}

function deserializeGeometry(serialized: SerializedGeometry | null) {
  if (!serialized) return null;
  const geometry = new THREE.BufferGeometry();
  for (const [name, attribute] of Object.entries(serialized.attributes)) {
    geometry.setAttribute(name, new THREE.BufferAttribute(attribute.array, attribute.itemSize));
  }
  if (serialized.index) geometry.setIndex(new THREE.BufferAttribute(serialized.index, 1));
  geometry.computeBoundingSphere();
  return geometry;
}

function disposeGeometryBundle(bundle: GeometryBundle) {
  bundle.ribbon?.dispose();
  bundle.strip?.dispose();
  bundle.skeleton?.dispose();
}
