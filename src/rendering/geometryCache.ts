import { blendFields, getScalarField, type SurfacePreset } from '../math/scalarFields';
import { extractImplicitSurface } from '../math/marchingTetrahedra';

export interface SurfaceSettings {
  preset: SurfacePreset;
  morphTarget: SurfacePreset;
  morphAmount: number;
  isoLevel: number;
  resolution: number;
  scale: number;
  frequency: number;
  cropRadius: number;
  cropSoftness: number;
  shellThickness: number;
}

export function buildSurfaceGeometry(settings: SurfaceSettings) {
  const baseField = getScalarField(settings.preset);
  const targetField = getScalarField(settings.morphTarget);
  const field = blendFields(baseField, targetField, settings.morphAmount);

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
