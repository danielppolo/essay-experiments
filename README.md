# Brush Motion Atlas

A Next.js App Router version of the Canvas brush studies. The page lives in `src/components/brush-atlas.tsx`; the reusable rendering and motif engine is in `src/lib/brush-engine.js`.

The `/sol` route is a separate scroll drawing study. A fixed yellow square grid and a seeded score of 72 lines are generated in `src/lib/sol-score.ts`; scrolling extends each line from its anchor toward a grid point, and scrolling back retracts it along the same path. The drawing is rendered by `src/components/sol-scroll-study.tsx`.

## Run it

```sh
npm install
npm run dev
```

Then open http://localhost:3000. Build for production with `npm run build` and run it with `npm start`.

## Engine API

```js
import { createBrush, fragmentStroke, StrokeRenderer, motifs } from '@/lib/brush-engine.js'

const brush = createBrush({ material: 'dry-pastel', width: 6, grain: .74, seed: 42 })
const stem = brush.stroke({
  path: [[40,270],[65,180],[130,90]],
  pressure: [[0,.15],[.2,.85],[.65,.65],[1,.03]], duration: 1100
})
const twig = brush.stroke({
  path: [[65,180],[110,160],[155,120]],
  start: { stroke: stem, at: .45 }, duration: 500
})
const marks = [stem,twig].flatMap(s => fragmentStroke(s, { maxLength: 65, gap: 4, seed: 37 }))
const renderers = marks.map(s => new StrokeRenderer(s, devicePixelRatio))
renderers.forEach(r => r.draw(context, elapsedMilliseconds))
```

`path` contains curve knots and is sampled by arc length. Pressure can be a normalized distance/pressure curve or `taper` / `fine`. Material may be `dry-pastel` or `fine-pencil`. Width is in CSS pixels; grain, pigment, and edge roughness usually range from 0 to 1. A fixed seed reproduces the same bristle placement and pigment gaps. `draw` returns true when the stroke is complete.

Branches use distance-based timing and each has an independent texture/reveal mask. Motif generators return editable stroke definitions:

```js
motifs.branch({depth: 3, spread: .65, seed: 12})
motifs.strata({count: 18, spacing: 10, waviness: .6})
motifs.flow({count: 14, bend: .85, variation: .45})
motifs.burst({count: 22, innerRadius: 23, outerRadius: 130})
```

The paper-height function is a deterministic texture field shared by strokes. This is a controllable pigment-deposition model rather than a wet-paint simulation.

`fragmentStroke` cuts a sampled path by arc length into independently textured marks. Each piece stays at or below `maxLength` CSS pixels and keeps its place in the original drawing timeline; `gap` controls the average space between pieces. The `seed` makes the varied lengths, slight offsets, and pigment changes reproducible. The atlas applies fragmentation to the organic motifs, leaving the typographic underlines continuous.
