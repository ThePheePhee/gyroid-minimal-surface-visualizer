export type SurfacePreset =
  | 'Gyroid'
  | 'Schwarz P'
  | 'Diamond'
  | 'Neovius'
  | 'Lidinoid'
  | 'Schoen I-WP'
  | 'Schoen F-RD'
  | 'Schwarz CLP'
  | 'Fischer-Koch S'
  | 'Split P'
  | 'Double Gyroid';

export type ScalarField = (x: number, y: number, z: number) => number;

export const surfacePresets: SurfacePreset[] = [
  'Gyroid',
  'Schwarz P',
  'Diamond',
  'Neovius',
  'Lidinoid',
  'Schoen I-WP',
  'Schoen F-RD',
  'Schwarz CLP',
  'Fischer-Koch S',
  'Split P',
  'Double Gyroid',
];

const fieldNormalizers: Record<SurfacePreset, number> = {
  Gyroid: 1.5,
  'Schwarz P': 3,
  Diamond: 2,
  Neovius: 13,
  Lidinoid: 2.2,
  'Schoen I-WP': 6,
  'Schoen F-RD': 7,
  'Schwarz CLP': 4,
  'Fischer-Koch S': 3,
  'Split P': 2.7,
  'Double Gyroid': 1,
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
    case 'Lidinoid':
      return (x, y, z) =>
        0.5 *
          (Math.sin(2 * x) * Math.cos(y) * Math.sin(z) +
            Math.sin(2 * y) * Math.cos(z) * Math.sin(x) +
            Math.sin(2 * z) * Math.cos(x) * Math.sin(y)) -
        0.5 *
          (Math.cos(2 * x) * Math.cos(2 * y) +
            Math.cos(2 * y) * Math.cos(2 * z) +
            Math.cos(2 * z) * Math.cos(2 * x)) +
        0.15;
    case 'Schoen I-WP':
      return (x, y, z) =>
        2 *
          (Math.cos(x) * Math.cos(y) +
            Math.cos(y) * Math.cos(z) +
            Math.cos(z) * Math.cos(x)) -
        (Math.cos(2 * x) + Math.cos(2 * y) + Math.cos(2 * z));
    case 'Schoen F-RD':
      return (x, y, z) =>
        4 * Math.cos(x) * Math.cos(y) * Math.cos(z) -
        (Math.cos(2 * x) * Math.cos(2 * y) +
          Math.cos(2 * y) * Math.cos(2 * z) +
          Math.cos(2 * z) * Math.cos(2 * x));
    case 'Schwarz CLP':
      return (x, y, z) =>
        Math.cos(x) + Math.cos(y) + Math.cos(z) + Math.cos(x) * Math.cos(y) * Math.cos(z);
    case 'Fischer-Koch S':
      return (x, y, z) =>
        Math.cos(2 * x) * Math.sin(y) * Math.cos(z) +
        Math.cos(x) * Math.cos(2 * y) * Math.sin(z) +
        Math.sin(x) * Math.cos(y) * Math.cos(2 * z);
    case 'Split P':
      return (x, y, z) =>
        1.1 *
          (Math.sin(2 * x) * Math.sin(z) * Math.cos(y) +
            Math.sin(2 * y) * Math.sin(x) * Math.cos(z) +
            Math.sin(2 * z) * Math.sin(y) * Math.cos(x)) -
        0.2 *
          (Math.cos(2 * x) * Math.cos(2 * y) +
            Math.cos(2 * y) * Math.cos(2 * z) +
            Math.cos(2 * z) * Math.cos(2 * x)) -
        0.4 * (Math.cos(2 * x) + Math.cos(2 * y) + Math.cos(2 * z));
    case 'Double Gyroid':
      return (x, y, z) => {
        const g =
          (Math.sin(x) * Math.cos(y) +
            Math.sin(y) * Math.cos(z) +
            Math.sin(z) * Math.cos(x)) /
          fieldNormalizers.Gyroid;
        return g * g - 0.18;
      };
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
