export type SurfacePreset = 'Gyroid' | 'Schwarz P' | 'Diamond' | 'Neovius';

export type ScalarField = (x: number, y: number, z: number) => number;

export const surfacePresets: SurfacePreset[] = ['Gyroid', 'Schwarz P', 'Diamond', 'Neovius'];

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

export function blendFields(a: ScalarField, b: ScalarField, amount: number): ScalarField {
  const t = Math.min(1, Math.max(0, amount));
  return (x, y, z) => a(x, y, z) * (1 - t) + b(x, y, z) * t;
}
