# Gyroid Minimal Surface Visualizer

A browser-based visual instrument for exploring gyroid-like triply periodic minimal surfaces (TPMS) and related implicit mathematical surfaces. It renders a spherical crop of a continuous implicit membrane with repeating tunnel openings, saddle regions, contour-like psychedelic bands, glossy highlights, and pale metallic rim emphasis on a high-contrast black background.

This first version is built with Vite, React, TypeScript, Three.js, React Three Fiber, Drei, and Leva.

## What Are TPMS Surfaces?

Triply periodic minimal surfaces are surfaces that repeat in three independent spatial directions and locally minimize area. Classic examples such as the gyroid, Schwarz P, diamond, and Neovius surfaces form continuous saddle-like membranes that divide space into interwoven tunnel networks. This app treats those families as implicit scalar fields and extracts visible shell geometry from them for real-time exploration.

## Run Locally

```sh
npm install
npm run dev
```

Then open the local URL printed by Vite, usually:

```txt
http://127.0.0.1:5173/
```

For a production build:

```sh
npm run build
npm run preview
```

## Controls

The Leva panel exposes:

- Surface preset selection: Gyroid, Schwarz P, Diamond, Neovius
- Render mode:
  - GPU continuous raymarch
  - CPU mesh debug
- GPU ray steps
- Optional morph target, morph path, morph amount, morph speed, and remesh rate
- Morph path modes:
  - no morph
  - animated A-to-B pulse
  - cyclic morphing through all surface families
- Iso-level / threshold
- Resolution
- Scale
- Number of periods / spatial frequency
- Spherical crop radius
- Crop softness
- Visual shell thickness
- Wireframe toggle
- Smooth shading toggle
- Color mode:
  - rainbow curvature-like bands
  - radial rainbow bands
  - normal-based coloring
  - monochrome porcelain/glass
  - metallic white/gold rim emphasis
- Black background toggle
- Auto-rotation speed
- Wobble amplitude, speed, spatial scale, whole-object breathing, and psychedelic twist

Orbit controls are enabled, so drag to rotate, scroll to zoom, and pan with the usual pointer gesture for your device.

## Implemented Equations

The default renderer is GPU raymarching inside the spherical bounding volume. Each pixel traces a ray through the crop sphere and solves for the first zero crossing of the normalized implicit TPMS field. This avoids polygonal cracks and makes continuity the primary rendering contract.

The CPU mesh debug renderer still samples the scalar fields as implicit surfaces and extracts shared-vertex marching-tetrahedra geometry. The TPMS level set is generated first, then triangles are clipped against the spherical crop. The crop sphere is not mixed into the scalar field, which keeps the membrane continuous instead of turning the boundary into a second competing implicit surface. Marching tetrahedra is used here because TPMS saddle fields trigger many ambiguous marching-cubes cases.

### Gyroid

```txt
f(x,y,z) = sin(x) cos(y) + sin(y) cos(z) + sin(z) cos(x)
```

### Schwarz P

```txt
f(x,y,z) = cos(x) + cos(y) + cos(z)
```

### Diamond

```txt
f(x,y,z) =
  sin(x) sin(y) sin(z)
  + sin(x) cos(y) cos(z)
  + cos(x) sin(y) cos(z)
  + cos(x) cos(y) sin(z)
```

### Neovius

```txt
f(x,y,z) = 3(cos(x) + cos(y) + cos(z)) + 4 cos(x) cos(y) cos(z)
```

## Implementation Notes

- `src/math/scalarFields.ts` defines reusable implicit scalar fields.
- `src/math/implicitSurface.ts` samples the field, extracts shared-vertex triangle geometry with a face-consistent tetrahedral decomposition, and clips triangles to the spherical crop.
- `src/rendering/surfaceMaterial.ts` contains the custom GLSL shader for rainbow bands, normal/radial coloring, fake glossy lighting, Fresnel glow, and crop-rim emphasis.
- `src/rendering/raymarchMaterial.ts` contains the continuous GPU implicit renderer.
- `src/components/Scene.tsx` wires the React Three Fiber scene, Leva controls, lighting, orbit controls, and animation.

## Screenshots

The `screenshots/` folder is included as a placeholder. The browser verification environment loaded the app and controls successfully, but automated screenshot capture timed out there; run the app locally and save favorite views into that folder.

## TODOs

- Add explicit boundary-loop extraction and tube geometry for cleaner metallic crop rims.
- Add GPU-side field sampling or web-worker extraction for very high resolutions.
- Add export to `.glb` / `.obj`.
- Add saved presets for specific gyroid, Schwarz P, diamond, and Neovius looks.
- Add curvature estimation instead of the current gradient/band approximation.
