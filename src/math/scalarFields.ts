export type SurfacePreset = 'Gyroid' | 'Schwarz P' | 'Diamond' | 'Neovius';

export type ScalarField = (x: number, y: number, z: number) => number;

export const surfacePresets: SurfacePreset[] = ['Gyroid', 'Schwarz P', 'Diamond', 'Neovius'];

const fieldNormalizers: Record<SurfacePreset, number> = {
  Gyroid: 1.5,
  'Schwarz P': 3,
  Diamond: 2,
  Neovius: 13,
};

export function getScalarField(preset: SurfacePreset): ScalarField {
  switch (preset) {
    case 'Schwarz P':
      return (x, y, z) => Math.cos(x) + Math.cos(y) + Math.cos(z);
    case 'Diamond':
      return (x, y, z) =>
        Math.sin(x) * Math.sin(y) * Math.sin(z) +
        Math.sin(x) * Math.cos(y) * Math.cos(z) +
        Math.cos(x) * Math.sin(y) * Math.cos(z) +
        Math.cos(x) * Math.cos(y) * Math.sin(z);
    case 'Neovius':
      return (x, y, z) =>
        3 * (Math.cos(x) + Math.cos(y) + Math.cos(z)) +
        4 * Math.cos(x) * Math.cos(y) * Math.cos(z);
    case 'Gyroid':
    default:
      return (x, y, z) =>
        Math.sin(x) * Math.cos(y) +
        Math.sin(y) * Math.cos(z) +
        Math.sin(z) * Math.cos(x);
  }
}

export function getNormalizedScalarField(preset: SurfacePreset): ScalarField {
  const field = getScalarField(preset);
  const normalizer = fieldNormalizers[preset];
  return (x, y, z) => field(x, y, z) / normalizer;
}

export function blendFields(a: ScalarField, b: ScalarField, amount: number): ScalarField {
  const t = smootherstep(Math.min(1, Math.max(0, amount)));
  return (x, y, z) => a(x, y, z) * (1 - t) + b(x, y, z) * t;
}

function smootherstep(t: number) {
  return t * t * t * (t * (t * 6 - 15) + 10);
}
