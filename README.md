# Gyroid Minimal Surface Visualizer

A browser-based visual instrument for exploring gyroid-like triply periodic minimal surfaces (TPMS) and related implicit mathematical surfaces. It renders a spherical crop of a continuous implicit membrane with repeating tunnel openings, saddle regions, contour-like psychedelic bands, glossy highlights, and pale metallic rim emphasis on a high-contrast black background.

The app is built with Vite, React, TypeScript, Three.js, React Three Fiber, Drei, and Leva.

## What Are TPMS Surfaces?

Triply periodic minimal surfaces are surfaces that repeat in three independent spatial directions and locally minimize area. Classic examples such as the gyroid, Schwarz P, diamond, and Neovius surfaces form continuous saddle-like membranes that divide space into interwoven tunnel networks. This app treats those families as implicit scalar fields and extracts visible shell geometry from them for real-time exploration.

## Visualization Modes

### Surface Mode

Surface Mode is the original TPMS visualizer and remains the default on launch. It shows a continuous GPU-rendered implicit surface cropped inside a sphere, with optional CPU mesh debugging, surface-family morphing, wobble, breathing, and psychedelic color bands.

### Knot Mode

Knot Mode is a second top-level instrument for exploring relationships between knots, weave curves, and TPMS-like surfaces. It has three relationship types:

- Labyrinth Skeletons: shows the TPMS membrane between two contrasting skeletal tube networks. The first version uses a procedural gyroid-inspired approximation, not an exact medial-axis extraction.
- Surface Curves / Weaves: traces repeatable curve families that are projected onto the gyroid level set and renders them as lines, tubes, ribbons, or fiber-bundle ribbons. This is the main textile-like mode.
- Knot-Bounded Minimal Film: renders knot boundaries such as a trefoil and spans them with a relaxed soap-film-like mesh. This is a stable visual approximation, not a full Plateau-problem solver.

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

The Leva panel starts with a top-level `Visualization Mode` selector:

- `Surface Mode`
- `Knot Mode`

Surface Mode exposes:

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

Knot Mode exposes `Knot Relationship Type`:

- Labyrinth Skeletons
- Surface Curves / Weaves
- Knot-Bounded Minimal Film

Shared Knot Mode controls include:

- Surface preset for the translucent TPMS reference surface
- Iso-level
- Resolution
- Field frequency
- Spherical crop radius
- Show/hide reference surface
- Reference surface opacity
- Auto-rotation speed

Labyrinth Skeleton controls include:

- Show/hide skeleton A
- Show/hide skeleton B
- Skeleton tube radius
- Skeleton animation speed

Surface Curves / Weaves controls include:

- Weave preset: clean mathematical ribbon, fiber-bundle rainbow ribbon, metallic pale ribbon, luminous braided textile
- Render style: line, tube, ribbon, fiber-bundle ribbon
- Strand count
- Strand spacing
- Strand thickness
- Ribbon width
- Ribbon thickness
- Curve integration length
- Seed pattern
- Rainbow intensity
- Oil-slick intensity
- Fiber texture density
- Weave breathing

Knot-Bounded Minimal Film controls include:

- Knot preset: Trefoil, Figure-eight, Torus knot
- Knot scale
- Boundary tube radius
- Show/hide boundary knot
- Show/hide film
- Film opacity
- Film smoothing iterations
- Film thickness
- Film material: translucent soap film, pearl/porcelain, subtle rainbow interference
- Torus knot `p` and `q` values

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
- `src/math/gyroidAnalysis.ts` provides gyroid value, gradient, and Newton projection helpers for surface-constrained weave curves.
- `src/math/weaveCurves.ts` generates the first curve families for Surface Curves / Weaves. The current method traces x-directed seeded paths and solves for `z` on the gyroid level set, so the curves ride on the surface without pretending to be exact geodesics.
- `src/math/labyrinthSkeletons.ts` creates procedural gyroid-labyrinth skeleton approximations. These are phase-shifted periodic tube networks tuned for legibility rather than exact medial-axis skeletons.
- `src/math/knotGeometry.ts` samples knot boundaries and builds a relaxed radial film mesh with fixed boundary vertices and Laplacian-smoothed interiors.
- `src/rendering/surfaceMaterial.ts` contains the custom GLSL shader for rainbow bands, normal/radial coloring, fake glossy lighting, Fresnel glow, and crop-rim emphasis.
- `src/rendering/raymarchMaterial.ts` contains the continuous GPU implicit renderer.
- `src/rendering/ribbonMaterial.ts` contains the fiber-bundle ribbon shader. Ribbon geometry stores local `ribbonAcross` and `ribbonAlong` attributes; the shader maps rainbow hue and fine fiber striping primarily through `ribbonAcross`, so the color bands run across the ribbon width instead of scrolling along the curve.
- `src/components/Scene.tsx` wires the React Three Fiber scene, Leva controls, lighting, orbit controls, and animation.

## Mathematical Status

- Exact implicit fields: gyroid, Schwarz P, diamond, and Neovius equations are implemented directly as scalar fields.
- Continuous TPMS rendering: the default Surface Mode renderer is GPU raymarching of the implicit field inside the crop sphere.
- Surface morphing: morphs blend normalized scalar fields. They are useful exploratory transitions, not canonical mathematical deformations.
- Surface curves / weaves: first-pass gyroid-constrained curves are generated by projection onto the gyroid level set and are intentionally documented as heuristic.
- Labyrinth skeletons: first-pass networks are procedural gyroid-inspired skeletons, not computed medial axes.
- Knot films: first-pass films are relaxed spanning meshes, not guaranteed minimal surfaces.

## Screenshots

The `screenshots/` folder is included as a placeholder. The browser verification environment loaded the app and controls successfully, but automated screenshot capture timed out there; run the app locally and save favorite views into that folder.

## TODOs

- Add explicit boundary-loop extraction and tube geometry for cleaner metallic crop rims.
- Move more curve, skeleton, and mesh generation into GPU or worker pipelines for very high resolutions.
- Add exact or sampled medial-axis extraction for labyrinth skeletons.
- Add geodesic or principal-direction tracing for stronger surface-curve families.
- Branch out the deferred precalculated morph-path editor as a separate feature.
- Add export to `.glb` / `.obj`.
- Add saved presets for specific gyroid, Schwarz P, diamond, and Neovius looks.
- Add curvature estimation instead of the current gradient/band approximation.
