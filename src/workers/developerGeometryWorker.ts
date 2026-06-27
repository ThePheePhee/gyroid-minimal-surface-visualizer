import * as THREE from 'three';
import { createSurfaceValue } from '../math/differentialGeometry';
import {
  buildBonnetStripCurves,
  buildLabyrinthSkeletonApproximation,
  buildRibbonGeometryFromCurves,
  traceSurfaceRibbons,
} from '../math/surfaceTracing';
import { buildMorphedField, type SurfaceSettings } from '../rendering/geometryCache';
import type { ScrewPhaseOptions } from '../math/differentialGeometry';
import type {
  BonnetStripMode,
  LabyrinthSkeletonMode,
  RibbonField,
  SkeletonResolution,
} from '../math/surfaceTracing';

export type SerializedGeometry = {
  attributes: Record<string, { array: Float32Array; itemSize: number }>;
  index: Uint32Array | null;
};

export type DeveloperGeometryRequest = {
  id: number;
  settings: SurfaceSettings;
  developer: DeveloperGeometrySettings;
};

export type DeveloperGeometrySettings = {
  finiteDifferenceEpsilon: number;
  ribbonField: RibbonField;
  seedCount: number;
  traceLength: number;
  ribbonWidth: number;
  surfaceLift: number;
  bonnetStripMode: BonnetStripMode;
  bonnetParameter: number;
  stripPhase: number;
  stripWidth: number;
  labyrinthSkeleton: LabyrinthSkeletonMode;
  skeletonResolution: SkeletonResolution;
  complementSide: 'positive labyrinth' | 'negative labyrinth';
  screwPhase: ScrewPhaseOptions['mode'];
  screwStrength: number;
  screwCoreRadius: number;
  screwTurns: number;
  screwPinch: number;
  screwSharpness: number;
};

export type DeveloperGeometryResponse = {
  id: number;
  ribbon: SerializedGeometry | null;
  strip: SerializedGeometry | null;
  skeleton: SerializedGeometry | null;
  error?: string;
};

type WorkerScope = {
  onmessage: ((event: MessageEvent<DeveloperGeometryRequest>) => void) | null;
  postMessage: (message: DeveloperGeometryResponse, transfer: Transferable[]) => void;
};

const workerScope = self as unknown as WorkerScope;

workerScope.onmessage = ({ data }) => {
  try {
    const field = buildMorphedField(data.settings);
    const value = createSurfaceValue({
      field,
      frequency: data.settings.frequency,
      isoLevel: data.settings.isoLevel,
      screw: {
        mode: data.developer.screwPhase,
        strength: data.developer.screwStrength,
        coreRadius: data.developer.screwCoreRadius,
        turns: data.developer.screwTurns,
        pinch: data.developer.screwPinch,
        sharpness: data.developer.screwSharpness,
        phase: data.developer.stripPhase,
      },
    });

    const ribbon = buildRibbon(data.settings, data.developer, value);
    const strip = buildStrip(data.settings, data.developer, value);
    const skeleton = buildSkeleton(data.settings, data.developer, value);
    const response: DeveloperGeometryResponse = {
      id: data.id,
      ribbon: serializeGeometry(ribbon),
      strip: serializeGeometry(strip),
      skeleton: serializeGeometry(skeleton),
    };
    const transfer = collectTransferables(response);
    ribbon?.dispose();
    strip?.dispose();
    skeleton?.dispose();
    workerScope.postMessage(response, transfer);
  } catch (error) {
    workerScope.postMessage(
      {
        id: data.id,
        ribbon: null,
        strip: null,
        skeleton: null,
        error: error instanceof Error ? error.message : 'Developer geometry generation failed',
      },
      [],
    );
  }
};

function buildRibbon(
  settings: SurfaceSettings,
  developer: DeveloperGeometrySettings,
  value: ReturnType<typeof createSurfaceValue>,
) {
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
}

function buildStrip(
  settings: SurfaceSettings,
  developer: DeveloperGeometrySettings,
  value: ReturnType<typeof createSurfaceValue>,
) {
  if (developer.bonnetStripMode !== 'Surface Weave') return null;
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
    width: developer.stripWidth * 0.62,
    lift: Math.max(0.014, developer.surfaceLift),
    epsilon: developer.finiteDifferenceEpsilon,
    closed: true,
  });
}

function buildSkeleton(
  settings: SurfaceSettings,
  developer: DeveloperGeometrySettings,
  value: ReturnType<typeof createSurfaceValue>,
) {
  if (developer.labyrinthSkeleton === 'Off') return null;
  return buildLabyrinthSkeletonApproximation({
    value,
    side: developer.complementSide === 'negative labyrinth' ? -1 : 1,
    cropRadius: settings.cropRadius,
    epsilon: developer.finiteDifferenceEpsilon,
    resolution: developer.skeletonResolution,
  });
}

function serializeGeometry(geometry: THREE.BufferGeometry | null): SerializedGeometry | null {
  if (!geometry) return null;
  const attributes: SerializedGeometry['attributes'] = {};
  for (const [name, attribute] of Object.entries(geometry.attributes)) {
    attributes[name] = {
      array: Float32Array.from(attribute.array as ArrayLike<number>),
      itemSize: attribute.itemSize,
    };
  }
  const sourceIndex = geometry.getIndex();
  return {
    attributes,
    index: sourceIndex ? Uint32Array.from(sourceIndex.array as ArrayLike<number>) : null,
  };
}

function collectTransferables(response: DeveloperGeometryResponse) {
  const transfer: Transferable[] = [];
  for (const geometry of [response.ribbon, response.strip, response.skeleton]) {
    if (!geometry) continue;
    for (const attribute of Object.values(geometry.attributes)) {
      transfer.push(attribute.array.buffer as ArrayBuffer);
    }
    if (geometry.index) transfer.push(geometry.index.buffer as ArrayBuffer);
  }
  return transfer;
}
