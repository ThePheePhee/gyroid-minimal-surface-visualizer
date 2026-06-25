import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { ScalarField } from '../math/scalarFields';
import { buildRibbonGeometry, generateSurfaceWeaves, type WeavePreset, type WeaveRenderStyle } from '../math/weaveCurves';
import { buildMorphedField, type SurfaceSettings } from '../rendering/geometryCache';
import { createRibbonMaterial } from '../rendering/ribbonMaterial';
import { TpmsPreviewSurface } from './TpmsPreviewSurface';

interface SurfaceWeavesProps {
  showSurface: boolean;
  surfaceOpacity: number;
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
  autoRotationSpeed: number;
  breathing: number;
  settings: SurfaceSettings;
}

export function SurfaceWeaves(props: SurfaceWeavesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const field = useMemo(() => buildMorphedField(props.settings), [props.settings]);
  const strands = useMemo(
    () =>
      generateSurfaceWeaves({
        field,
        strandCount: props.strandCount,
        strandSpacing: props.strandSpacing,
        integrationLength: props.integrationLength,
        seedPattern: props.seedPattern,
        frequency: props.settings.frequency,
        isoLevel: props.settings.isoLevel,
        cropRadius: props.settings.cropRadius,
      }),
    [
      field,
      props.integrationLength,
      props.seedPattern,
      props.settings.cropRadius,
      props.settings.frequency,
      props.settings.isoLevel,
      props.strandCount,
      props.strandSpacing,
    ],
  );

  const ribbonLook = props.weavePreset === 'fiber-bundle rainbow ribbon' ? 1 : props.weavePreset === 'metallic pale ribbon' ? 2 : props.weavePreset === 'luminous braided textile' ? 3 : 0;
  const ribbonMaterial = useMemo(
    () =>
      createRibbonMaterial({
        look: ribbonLook,
        rainbowIntensity: props.rainbowIntensity,
        oilSlickIntensity: props.oilSlickIntensity,
        fiberDensity: props.fiberDensity,
      }),
    [props.fiberDensity, props.oilSlickIntensity, props.rainbowIntensity, ribbonLook],
  );

  useEffect(() => () => ribbonMaterial.dispose(), [ribbonMaterial]);

  useFrame((state, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * props.autoRotationSpeed;
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 0.7) * props.breathing;
      groupRef.current.scale.setScalar(pulse);
    }
    ribbonMaterial.uniforms.uCameraPosition.value.copy(camera.position);
  });

  return (
    <group ref={groupRef}>
      <TpmsPreviewSurface settings={props.settings} visible={props.showSurface} opacity={props.surfaceOpacity} color="#7cdcff" />
      {strands.map((points, index) => (
        <WeaveStrand
          key={index}
          points={points}
          renderStyle={props.renderStyle}
          tubeRadius={props.strandThickness}
          ribbonWidth={props.ribbonWidth}
          ribbonThickness={props.ribbonThickness}
          field={field}
          frequency={props.settings.frequency}
          isoLevel={props.settings.isoLevel}
          material={ribbonMaterial}
        />
      ))}
    </group>
  );
}

function WeaveStrand({
  points,
  renderStyle,
  tubeRadius,
  ribbonWidth,
  ribbonThickness,
  field,
  frequency,
  isoLevel,
  material,
}: {
  points: THREE.Vector3[];
  renderStyle: WeaveRenderStyle;
  tubeRadius: number;
  ribbonWidth: number;
  ribbonThickness: number;
  field: ScalarField;
  frequency: number;
  isoLevel: number;
  material: THREE.ShaderMaterial;
}) {
  const geometry = useMemo(() => {
    if (renderStyle === 'ribbon' || renderStyle === 'fiber-bundle ribbon') {
      return buildRibbonGeometry(points, {
        width: ribbonWidth,
        thickness: ribbonThickness,
        field,
        frequency,
        isoLevel,
        fiberColumns: renderStyle === 'fiber-bundle ribbon' ? 18 : 2,
        closed: true,
      });
    }
    if (renderStyle === 'tube') {
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), Math.max(32, points.length * 2), tubeRadius, 10, true);
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), Math.max(32, points.length * 2), Math.max(0.002, tubeRadius * 0.32), 6, true);
  }, [field, frequency, isoLevel, points, renderStyle, ribbonThickness, ribbonWidth, tubeRadius]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  if (renderStyle === 'line') {
    return (
      <mesh geometry={geometry}>
        <meshBasicMaterial color="#9ff9ff" />
      </mesh>
    );
  }

  if (renderStyle === 'tube') {
    return (
      <mesh geometry={geometry}>
        <meshStandardMaterial color="#8ef7ff" emissive="#1397ff" emissiveIntensity={0.45} roughness={0.18} metalness={0.2} />
      </mesh>
    );
  }

  return <mesh geometry={geometry} material={material} />;
}
