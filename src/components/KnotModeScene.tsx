import type { SurfacePreset } from '../math/scalarFields';
import type { FilmMaterial, KnotPreset } from '../math/knotGeometry';
import type { WeavePreset, WeaveRenderStyle } from '../math/weaveCurves';
import type { MorphPath, SurfaceSettings } from '../rendering/geometryCache';
import { KnotFilm } from './KnotFilm';
import { LabyrinthSkeletons } from './LabyrinthSkeletons';
import { SurfaceWeaves } from './SurfaceWeaves';

export type KnotRelationshipType = 'Labyrinth Skeletons' | 'Surface Curves / Weaves' | 'Knot-Bounded Minimal Film';

interface KnotModeSceneProps {
  relationshipType: KnotRelationshipType;
  surfacePreset: SurfacePreset;
  morphTarget: SurfacePreset;
  morphPath: MorphPath;
  morphAmount: number;
  isoLevel: number;
  resolution: number;
  fieldFrequency: number;
  cropRadius: number;
  surfaceOpacity: number;
  showSurface: boolean;
  showSkeletonA: boolean;
  showSkeletonB: boolean;
  skeletonTubeRadius: number;
  skeletonAnimationSpeed: number;
  weavePreset: WeavePreset;
  strandCount: number;
  strandSpacing: number;
  strandThickness: number;
  ribbonWidth: number;
  ribbonThickness: number;
  integrationLength: number;
  seedPattern: number;
  renderStyle: WeaveRenderStyle;
  rainbowIntensity: number;
  oilSlickIntensity: number;
  fiberDensity: number;
  weaveBreathing: number;
  knotPreset: KnotPreset;
  knotScale: number;
  boundaryTubeRadius: number;
  showBoundary: boolean;
  showFilm: boolean;
  filmOpacity: number;
  smoothingIterations: number;
  filmThickness: number;
  filmMaterial: FilmMaterial;
  torusP: number;
  torusQ: number;
  autoRotationSpeed: number;
}

export function KnotModeScene(props: KnotModeSceneProps) {
  const surfaceSettings: SurfaceSettings = {
    preset: props.surfacePreset,
    morphTarget: props.morphTarget,
    morphPath: props.morphPath,
    morphAmount: props.morphAmount,
    isoLevel: props.isoLevel,
    resolution: props.resolution,
    scale: props.cropRadius * 1.05,
    frequency: props.fieldFrequency,
    cropRadius: props.cropRadius,
    cropSoftness: 0.08,
    shellThickness: 0.02,
  };

  if (props.relationshipType === 'Labyrinth Skeletons') {
    return (
      <LabyrinthSkeletons
        settings={surfaceSettings}
        fieldFrequency={props.fieldFrequency}
        surfaceOpacity={props.surfaceOpacity}
        showSurface={props.showSurface}
        showSkeletonA={props.showSkeletonA}
        showSkeletonB={props.showSkeletonB}
        tubeRadius={props.skeletonTubeRadius}
        autoRotationSpeed={props.autoRotationSpeed}
        animationSpeed={props.skeletonAnimationSpeed}
      />
    );
  }

  if (props.relationshipType === 'Knot-Bounded Minimal Film') {
    return (
      <KnotFilm
        knotPreset={props.knotPreset}
        knotScale={props.knotScale}
        boundaryTubeRadius={props.boundaryTubeRadius}
        showBoundary={props.showBoundary}
        showFilm={props.showFilm}
        filmOpacity={props.filmOpacity}
        smoothingIterations={props.smoothingIterations}
        filmThickness={props.filmThickness}
        filmMaterial={props.filmMaterial}
        torusP={props.torusP}
        torusQ={props.torusQ}
        autoRotationSpeed={props.autoRotationSpeed}
      />
    );
  }

  return (
    <SurfaceWeaves
      showSurface={props.showSurface}
      surfaceOpacity={props.surfaceOpacity}
      weavePreset={props.weavePreset}
      strandCount={props.strandCount}
      strandSpacing={props.strandSpacing}
      strandThickness={props.strandThickness}
      ribbonWidth={props.ribbonWidth}
      ribbonThickness={props.ribbonThickness}
      integrationLength={props.integrationLength}
      seedPattern={props.seedPattern}
      renderStyle={props.renderStyle}
      rainbowIntensity={props.rainbowIntensity}
      oilSlickIntensity={props.oilSlickIntensity}
      fiberDensity={props.fiberDensity}
      autoRotationSpeed={props.autoRotationSpeed}
      breathing={props.weaveBreathing}
      settings={surfaceSettings}
    />
  );
}
