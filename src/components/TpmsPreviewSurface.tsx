import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { buildSurfaceGeometry, type SurfaceSettings } from '../rendering/geometryCache';

interface TpmsPreviewSurfaceProps {
  settings: SurfaceSettings;
  visible: boolean;
  opacity: number;
  color?: string;
}

export function TpmsPreviewSurface({ settings, visible, opacity, color = '#bdefff' }: TpmsPreviewSurfaceProps) {
  const geometry = useMemo(() => buildSurfaceGeometry(settings), [settings]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  if (!visible) {
    return null;
  }

  return (
    <mesh geometry={geometry}>
      <meshPhysicalMaterial
        color={color}
        transparent
        opacity={opacity}
        roughness={0.28}
        metalness={0.05}
        side={THREE.DoubleSide}
        depthWrite={opacity > 0.55}
      />
    </mesh>
  );
}

