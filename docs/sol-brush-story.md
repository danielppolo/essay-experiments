# Sol Brush Story — design decisions

`/sol-brush-story` is a scroll-directed composition built from the Sol grid and the dry-pastel brush engine. It is a separate route from `/sol-brush`, so its narrative timing can change without changing the original study.

## Core idea

Scroll position is the drawing's clock, not an instruction to start a free-running animation. Every frame is reconstructed from normalized section progress (`0–1`), so scrolling backward undraws marks, untypes words, and reverses the camera movement. The scene is deterministic for a given viewport size.

The work has three layers of meaning:

- The square grid is the rule or field. It begins drawing immediately and is complete before the greeting.
- Sparse textured strokes are events on that field. Each passage uses one color family from the seeded Sol score, plus a line that meets the text.
- Text is part of the geometry. It occupies a measured, grid-aligned region; an incoming stroke stops at its boundary, the text types, then the stroke reflects after the text leaves.

The paragraph regions are **virtual**, not painted panels. The grid remains continuous behind them and no background-colored rectangle is drawn over the canvas. Decorative strokes avoid these regions, while the intentional incident stroke touches an edge. This prevents empty holes from announcing future text before it appears.

## Scroll score

The sticky viewport shows a canvas about `2.1` viewport heights tall. The surrounding section is `1400vh`, giving the reader time to draw and to travel down the composition. These are normalized progress windows in `src/components/sol-brush-story.tsx`, not seconds:

| Progress | Event |
| --- | --- |
| `0–.07` | Draw the grid, one vertical or horizontal segment at a time. |
| `.08–.22` | Type “hello, reader”, hold it briefly, then remove it. |
| `.21–.46` | First line group approaches the first text region; paragraph types and leaves; the incident line reflects. |
| `.46–.55` | Move the view down by `.55` viewport height, revealing more of the canvas. |
| `.47–.70` | Second line group, paragraph, and reflection. |
| `.70–.79` | Move down another `.55` viewport height. |
| `.71–.935` | Third line group, paragraph, and reflection. |
| `.935–.965` | Move the remaining viewport height so the drawing clears the screen. |
| `.965–1` | Type “Thank you, reader”, then the date. |

Some drawing and camera windows intentionally overlap. Marks in the next region can begin arriving while the view travels toward them. A longer page changes the amount of physical scrolling for each event; changing the progress windows changes their relative pacing.

## Geometry and typography

`generateSolScore` supplies the square-grid proportions and seeded line families. For the story, each family is generated in a viewport-sized local score, then shifted down into one of three regions of the tall canvas. This keeps each group visible when the camera reaches it rather than leaving all anchors in the first viewport.

The three paragraphs are positioned near selected grid coordinates, then measured in the DOM. An invisible copy of each full paragraph holds its final width and height stable while a separate visible span types character by character. This stable rectangle supplies the collision edge even before the first letter appears. All visible copy uses 14px Georgia/serif.

For an incident stroke, the target is the left or right edge of its paragraph rectangle. After the text disappears, the outgoing stroke begins at that same point. Its horizontal component reverses while its vertical component continues: a simple reflection against a vertical boundary, not a continuation through the text. The existing brush engine textures each fragment once; scroll progress reveals those fixed textures instead of regenerating random grain every frame.

## Implementation boundaries

- `src/app/sol-brush-story/page.tsx` owns route metadata and supplies the date.
- `src/components/sol-brush-story.tsx` owns the scroll score, camera, canvas rendering, text typing, and collision geometry.
- `src/components/sol-brush-story.module.css` owns the sticky viewport, tall drawing layer, transparent text layout, and typography.
- `src/lib/sol-score.ts` and `src/lib/brush-engine.js` remain shared with the other studies.

GSAP `ScrollTrigger` supplies section progress. `requestAnimationFrame` batches canvas and DOM updates; `ResizeObserver` rebuilds the score, measured boxes, and brush renderers when the drawing size changes. The typed strings and line reveals are derived from absolute progress rather than accumulated state, which is why reversing the scroll works without a separate undo operation.

## Editing the composition

Change `lineWindows`, `paragraphWindows`, and `reflectionWindows` together when retiming an act: the incoming line must finish **before** typing begins, and reflection must begin **after** the paragraph leaves. Keep the grid's completion before `.08`, where the greeting starts. If the canvas height or camera distances change, update the three paragraph world positions and the shifted line-family offsets together so each collision remains in the visible region. The paragraph text can change without manually resizing a box because the hidden full-text copy is measured during layout.
