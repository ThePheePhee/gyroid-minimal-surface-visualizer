import { blendFields, getNormalizedScalarField, surfacePresets, type ScalarField, type SurfacePreset } from '../math/scalarFields';
import { extractImplicitSurface } from '../math/implicitSurface';

export type MorphPath = 'No morph' | 'A to B pulse' | 'Cycle all families';

export interface SurfaceSettings {
  preset: SurfacePreset;
  morphTarget: SurfacePreset;
  morphAmount: number;
  morphPath: MorphPath;
  isoLevel: number;
  resolution: number;
  scale: number;
  frequency: number;
  cropRadius: number;
  cropSoftness: number;
  shellThickness: number;
}

export function buildSurfaceGeometry(settings: SurfaceSettings) {
  const field = buildMorphedField(settings);

  return extractImplicitSurface({
    field,
    isoLevel: settings.isoLevel,
    resolution: settings.resolution,
    scale: settings.scale,
    frequency: settings.frequency,
    cropRadius: settings.cropRadius,
    cropSoftness: settings.cropSoftness,
    shellThickness: settings.shellThickness,
  });
}

function buildMorphedField(settings: SurfaceSettings): ScalarField {
  if (settings.morphPath === 'No morph') {
    return getNormalizedScalarField(settings.preset);
  }

  if (settings.morphPath === 'Cycle all families') {
    const scaled = settings.morphAmount * surfacePresets.length;
    const fromIndex = Math.floor(scaled) % surfacePresets.length;
    const toIndex = (fromIndex + 1) % surfacePresets.length;
    const localAmount = scaled - Math.floor(scaled);
    return blendFields(
      getNormalizedScalarField(surfacePresets[fromIndex]),
      getNormalizedScalarField(surfacePresets[toIndex]),
      localAmount,
    );
  }

  return blendFields(getNormalizedScalarField(settings.preset), getNormalizedScalarField(settings.morphTarget), settings.morphAmount);
}
