'use client'

import { useEffect, useRef } from 'react'
import { generateSolScore, type SolScore } from '@/lib/sol-score'
import styles from './sol-scroll-study.module.css'

const clamp = (value: number) => Math.max(0, Math.min(1, value))

function draw(ctx: CanvasRenderingContext2D, width: number, height: number, score: SolScore, progress: number) {
  ctx.fillStyle = '#f4c400'
  ctx.fillRect(0, 0, width, height)

  ctx.beginPath()
  ctx.strokeStyle = 'rgba(91, 76, 38, .17)'
  ctx.lineWidth = .75
  for (const x of score.gridX) {
    ctx.moveTo(x, 0)
    ctx.lineTo(x, height)
  }
  for (const y of score.gridY) {
    ctx.moveTo(0, y)
    ctx.lineTo(width, y)
  }
  ctx.stroke()

  ctx.lineWidth = 1.7
  ctx.lineCap = 'butt'
  for (const line of score.lines) {
    const amount = clamp((progress - line.startsAt) / (line.endsAt - line.startsAt))
    if (amount <= 0) continue
    ctx.beginPath()
    ctx.strokeStyle = line.color
    ctx.moveTo(line.from.x, line.from.y)
    ctx.lineTo(
      line.from.x + (line.to.x - line.from.x) * amount,
      line.from.y + (line.to.y - line.from.y) * amount,
    )
    ctx.stroke()
  }
}

export default function SolScrollStudy() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!section || !canvas || !ctx) return

    let width = 0
    let height = 0
    let score: SolScore | null = null
    let frame = 0

    function render() {
      frame = 0
      if (!score || !ctx || !section) return
      const travel = section.offsetHeight - window.innerHeight
      const progress = travel > 0 ? clamp(-section.getBoundingClientRect().top / travel) : 1
      draw(ctx, width, height, score, progress)
    }

    function requestRender() {
      if (!frame) frame = requestAnimationFrame(render)
    }

    function resize() {
      if (!canvas || !ctx) return
      const bounds = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = bounds.width
      height = bounds.height
      if (!width || !height) return
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      score = generateSolScore(width, height)
      requestRender()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    window.addEventListener('resize', resize)
    window.addEventListener('scroll', requestRender, { passive: true })
    resize()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('scroll', requestRender)
    }
  }, [])

  return <main className={styles.page}>
    <h1 className={styles.srOnly}>Sol — a drawing made by scrolling</h1>
    <p id="sol-description" className={styles.srOnly}>Scroll down to extend lines from the center, side midpoints, and corners to points on a square grid. Scroll up to retract them.</p>
    <section ref={sectionRef} className={styles.scrollSection} aria-label="Scroll drawing">
      <div className={styles.sticky}>
        <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="A yellow square grid with lines drawn in white, red, and blue as the page scrolls" aria-describedby="sol-description" />
      </div>
    </section>
  </main>
}
