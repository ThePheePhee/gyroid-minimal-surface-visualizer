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
- Surface Curves / Weaves: traces repeatable closed loop families that are projected onto the active TPMS level set and renders them as lines, tubes, ribbons, or fiber-bundle ribbons. This is the main textile-like mode.
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

It also includes a top-level `Developer Mode` toggle. Developer Mode is off by default; when it is off, the experimental differential-geometry overlays are not rendered.

Surface Mode exposes:

- Surface preset selection: Gyroid, Schwarz P, Diamond, Neovius, Lidinoid, Schoen I-WP, Schoen F-RD, Schwarz CLP, Fischer-Koch S, Split P, Double Gyroid
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
- Complement solid toggle for the GPU renderer, showing a chosen clipped labyrinth volume inside the spherical crop
- Complement side selector for switching between the positive and negative field domains
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
- Knot morph target, morph path, morph amount, morph speed, and remesh rate for surface-based Knot Mode views
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

The weave curves are closed by construction. The generator starts from smooth closed seed loops in several orientations, projects them onto the current implicit level set, then alternates smoothing and projection. This keeps the ribbon continuous and much closer to differentiable than the earlier open trace method, while remaining an exploratory approximation rather than an exact geodesic solver.

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

### Developer Mode

Developer Mode exposes a collapsible `Differential Geometry / Ribbon Lab` panel for mathematically grounded experimental overlays. These systems are deliberately conservative first-pass tools rather than polished production renderers.

Developer sections include:

- Differential Diagnostics: finite-difference curvature color, principal/asymptotic direction fields, minimality error, and focal-distance diagnostics.
- Surface-Derived Ribbons: ribbon traces integrated from principal-curvature or asymptotic vector fields and reprojected to the implicit surface after each step.
- Bonnet / Strip Lab: approximate strip overlays intended to explore P/G/D-like organization without claiming an exact Bonnet transform.
- Labyrinth Skeleton: approximate distance-ridge point clouds for the selected complement labyrinth volume.
- Parallel / Focal Pointiness: offset/focal diagnostic point clouds where pointiness comes from curvature and focal-distance behavior.
- Screw Phase: approximate coordinate-domain screw defects with optional minimality diagnostics.

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

### Lidinoid

```txt
f(x,y,z) =
  0.5(sin(2x) cos(y) sin(z)
    + sin(2y) cos(z) sin(x)
    + sin(2z) cos(x) sin(y))
  - 0.5(cos(2x) cos(2y)
    + cos(2y) cos(2z)
    + cos(2z) cos(2x))
  + 0.15
```

### Schoen I-WP

```txt
f(x,y,z) =
  2(cos(x) cos(y) + cos(y) cos(z) + cos(z) cos(x))
  - (cos(2x) + cos(2y) + cos(2z))
```

### Schoen F-RD

```txt
f(x,y,z) =
  4 cos(x) cos(y) cos(z)
  - (cos(2x) cos(2y)
    + cos(2y) cos(2z)
    + cos(2z) cos(2x))
```

### Schwarz CLP

```txt
f(x,y,z) = cos(x) + cos(y) + cos(z) + cos(x) cos(y) cos(z)
```

### Fischer-Koch S

```txt
f(x,y,z) =
  cos(2x) sin(y) cos(z)
  + cos(x) cos(2y) sin(z)
  + sin(x) cos(y) cos(2z)
```

### Split P

```txt
f(x,y,z) =
  1.1(sin(2x) sin(z) cos(y)
    + sin(2y) sin(x) cos(z)
    + sin(2z) sin(y) cos(x))
  - 0.2(cos(2x) cos(2y)
    + cos(2y) cos(2z)
    + cos(2z) cos(2x))
  - 0.4(cos(2x) + cos(2y) + cos(2z))
```

### Double Gyroid

```txt
g(x,y,z) = (sin(x) cos(y) + sin(y) cos(z) + sin(z) cos(x)) / 1.5
f(x,y,z) = g(x,y,z)^2 - 0.18
```

## Implementation Notes

- `src/math/scalarFields.ts` defines reusable implicit scalar fields.
- `src/math/implicitSurface.ts` samples the field, extracts shared-vertex triangle geometry with a face-consistent tetrahedral decomposition, and clips triangles to the spherical crop.
- `src/math/weaveCurves.ts` generates closed loop families for Surface Curves / Weaves. The current method projects closed seed curves onto the active implicit level set, smooths them, and projects again so the loops stay continuous while riding on morphed surfaces.
- `src/math/differentialGeometry.ts` evaluates finite-difference implicit-surface jets: field value, gradient, Hessian, normal, shape operator, principal curvatures/directions, asymptotic directions, and focal-distance diagnostics.
- `src/math/surfaceTracing.ts` builds Developer Mode diagnostics, principal/asymptotic ribbon traces, approximate Bonnet/strip curves, complement-labyrinth distance-ridge points, and focal/offset point clouds.
- `src/math/labyrinthSkeletons.ts` creates procedural gyroid-labyrinth skeleton approximations. These are phase-shifted periodic tube networks tuned for legibility rather than exact medial-axis skeletons.
- `src/math/knotGeometry.ts` samples knot boundaries and builds a relaxed radial film mesh with fixed boundary vertices and Laplacian-smoothed interiors.
- `src/rendering/surfaceMaterial.ts` contains the custom GLSL shader for rainbow bands, normal/radial coloring, fake glossy lighting, Fresnel glow, and crop-rim emphasis.
- `src/rendering/raymarchMaterial.ts` contains the continuous GPU implicit renderer and the complement-solid raymarch mode for one clipped labyrinth domain.
- `src/rendering/ribbonMaterial.ts` contains the fiber-bundle ribbon shader. Ribbon geometry stores local `ribbonAcross` and `ribbonAlong` attributes; the shader maps rainbow hue and fine fiber striping primarily through `ribbonAcross`, so the color bands run across the ribbon width instead of scrolling along the curve.
- `src/components/Scene.tsx` wires the React Three Fiber scene, Leva controls, lighting, orbit controls, and animation.

## Mathematical Status

- Exact or standard implicit approximants: gyroid, Schwarz P, diamond, and Neovius are implemented directly as the classic trigonometric approximants.
- Additional nodal/Fourier approximants: Lidinoid, Schoen I-WP, Schoen F-RD, Schwarz CLP, Fischer-Koch S, Split P, and Double Gyroid are included as visually useful TPMS-style level-set fields. They are exploratory scalar-field approximations, not exact Weierstrass parameterizations.
- Continuous TPMS rendering: the default Surface Mode renderer is GPU raymarching of the implicit field inside the crop sphere.
- Developer differential geometry: the finite-difference gradient/Hessian evaluator and its projected shape operator are mathematically grounded diagnostics for implicit level sets. They are numerical approximations, not symbolic analytic derivatives.
- Surface morphing: morphs blend normalized scalar fields. They are useful exploratory transitions, not canonical mathematical deformations.
- Surface curves / weaves: first-pass closed loops are generated by projection onto the active morphed level set and are intentionally documented as heuristic, not exact geodesics.
- Developer ribbons: first-pass curves integrate principal or asymptotic fields from the numerical shape operator and are reprojected to the level set after each step. They are surface-derived, but not guaranteed geodesics or globally closed field lines.
- Developer Bonnet/strip mode: approximate and visualization-only. It explores coherent strip organization near the P/G/D family but is not an exact Bonnet transformation.
- Developer skeleton mode: approximate distance-ridge point extraction for a selected labyrinth volume, not an exact medial-axis graph.
- Developer focal/pointiness mode: diagnostic offset/focal point clouds based on principal curvature and focal-distance proxies.
- Developer screw phase: approximate coordinate-domain phase defects; minimality diagnostics are provided because this generally moves the surface away from exact minimality.
- Complement solid: the GPU renderer can show either of the two clipped labyrinth volumes inside the spherical crop. Mathematically, it renders the bounded solid region `side * (f - iso) >= 0`, whose visible boundary is the TPMS interface together with the crop-sphere wall.
- Labyrinth skeletons: first-pass networks are procedural gyroid-inspired skeletons, not computed medial axes.
- Knot films: first-pass films are relaxed spanning meshes, not guaranteed minimal surfaces.

## References

- Triply periodic minimal surface overview: <https://en.wikipedia.org/wiki/Triply_periodic_minimal_surface>
- Schwarz P and Schwarz D implicit approximants: <https://en.wikipedia.org/wiki/Schwarz_minimal_surface>
- Gyroid background and trigonometric approximant: <https://en.wikipedia.org/wiki/Gyroid>
- Lidinoid background and level-set approximant: <https://en.wikipedia.org/wiki/Lidinoid>

## Screenshots

The `screenshots/` folder is included as a placeholder. The browser verification environment loaded the app and controls successfully, but automated screenshot capture timed out there; run the app locally and save favorite views into that folder.

## TODOs

- Add explicit boundary-loop extraction and tube geometry for cleaner metallic crop rims.
- Move more curve, skeleton, and mesh generation into GPU or worker pipelines for very high resolutions.
- Add exact or sampled medial-axis extraction for labyrinth skeletons.
- Add geodesic or principal-direction tracing for stronger surface-curve families.
- Move Developer Mode curvature diagnostics and focal highlights into shader-side derivative paths where practical.
- Replace approximate Bonnet strip overlays with a more rigorous P/G/D associated-family model.
- Add translucency controls for complement-solid rendering.
- Branch out the deferred precalculated morph-path editor as a separate feature.
- Add export to `.glb` / `.obj`.
- Add saved presets for specific gyroid, Schwarz P, diamond, and Neovius looks.
- Add curvature estimation instead of the current gradient/band approximation.
