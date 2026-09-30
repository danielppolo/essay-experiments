'use client'

import { useEffect, useRef } from 'react'
import { createBrush, StrokeRenderer } from '@/lib/brush-engine.js'
import styles from './lines-scroll-study.module.css'

const LINE_SPACING = 16
const DRAW_DURATION = 1000
const clamp = (value: number) => Math.max(0, Math.min(1, value))
type BrushRenderer = InstanceType<typeof StrokeRenderer>

function createLines(width: number, height: number, dpr: number): BrushRenderer[] {
  const count = Math.floor(height / LINE_SPACING) + 1
  const brush = createBrush({
    material: 'fine-pencil',
    color: '#5c7790',
    width: 2.5,
    grain: .55,
    edgeRoughness: .16,
    pigment: .47,
    pressure: 'fine',
    endPressure: .72,
  })

  return Array.from({ length: count }, (_, index) => {
    const y = index * LINE_SPACING
    const stroke = brush.stroke({
      path: [[0, y], [width, y]],
      seed: 410 + index * 29,
      delay: index * DRAW_DURATION / count,
      duration: DRAW_DURATION / count,
    })
    return new StrokeRenderer(stroke, dpr)
  })
}

export default function LinesScrollStudy() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!section || !canvas || !ctx) return

    let width = 0
    let height = 0
    let pixelRatio = 0
    let renderers: BrushRenderer[] = []
    let frame = 0

    function render() {
      frame = 0
      if (!ctx || !section) return
      const travel = section.offsetHeight - window.innerHeight
      const progress = travel > 0 ? clamp(-section.getBoundingClientRect().top / travel) : 1
      ctx.fillStyle = '#f7f7f3'
      ctx.fillRect(0, 0, width, height)
      for (const renderer of renderers) renderer.draw(ctx, progress * DRAW_DURATION)
    }

    function requestRender() {
      if (!frame) frame = requestAnimationFrame(render)
    }

    function resize() {
      if (!canvas || !ctx) return
      const bounds = canvas.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      if (bounds.width === width && bounds.height === height && dpr === pixelRatio) return
      width = bounds.width
      height = bounds.height
      pixelRatio = dpr
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      renderers = createLines(width, height, dpr)
      requestRender()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    window.addEventListener('scroll', requestRender, { passive: true })
    resize()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', requestRender)
    }
  }, [])

  return <main className={styles.page}>
    <h1 className={styles.srOnly}>Lines drawn by scrolling</h1>
    <p id="lines-description" className={styles.srOnly}>Scroll down to draw evenly spaced horizontal blue brush lines. Scroll up to erase them.</p>
    <section ref={sectionRef} className={styles.scrollSection} aria-label="Scroll drawing">
      <div className={styles.sticky}>
        <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="Horizontal blue brush lines on pale paper, spaced sixteen pixels apart" aria-describedby="lines-description" />
      </div>
    </section>
  </main>
}
