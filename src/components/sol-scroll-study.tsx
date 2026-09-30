'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
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
  const introRef = useRef<HTMLDivElement>(null)
  const ruleRef = useRef<HTMLDivElement>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    const intro = introRef.current
    const rule = ruleRef.current
    const result = resultRef.current
    if (!section || !canvas || !ctx || !intro || !rule || !result) return

    gsap.registerPlugin(ScrollTrigger)
    let width = 0
    let height = 0
    let score: SolScore | null = null
    let frame = 0
    let progress = 0
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const offset = reducedMotion ? 0 : 28

    function render() {
      frame = 0
      if (!score || !ctx) return
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

    const timeline = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        scrub: true,
        onUpdate: (self) => {
          progress = self.progress
          requestRender()
        },
      },
    })

    // One normalized timeline controls the HTML copy and the Canvas drawing.
    timeline
      .to({}, { duration: 1 }, 0)
      .fromTo(intro, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -offset, duration: .12 }, .1)
      .fromTo(rule, { autoAlpha: 0, y: offset }, { autoAlpha: 1, y: 0, duration: .12 }, .3)
      .to(rule, { autoAlpha: 0, y: -offset, duration: .12 }, .52)
      .fromTo(result, { autoAlpha: 0, y: offset }, { autoAlpha: 1, y: 0, duration: .12 }, .74)

    resize()
    progress = timeline.scrollTrigger?.progress ?? 0
    requestRender()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('resize', resize)
      timeline.scrollTrigger?.kill()
      timeline.kill()
    }
  }, [])

  return <main className={styles.page}>
    <h1 className={styles.srOnly}>Sol — a drawing made by scrolling</h1>
    <p id="sol-description" className={styles.srOnly}>Scroll down to extend lines from the center, side midpoints, and corners to points on a square grid. Scroll up to retract them.</p>
    <section ref={sectionRef} className={styles.scrollSection} aria-label="Scroll drawing">
      <div className={styles.sticky}>
        <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="A yellow square grid with lines drawn in white, red, and blue as the page scrolls" aria-describedby="sol-description" />
        <div className={styles.textOverlay}>
          <div ref={introRef} className={`${styles.textBlock} ${styles.intro}`}>
            <span className={styles.kicker}>A scroll drawing / 01</span>
            <p>Begin at<br />fixed points.</p>
          </div>
          <div ref={ruleRef} className={`${styles.textBlock} ${styles.rule}`}>
            <span className={styles.kicker}>The instruction / 02</span>
            <p>Extend each line<br />toward the grid.</p>
          </div>
          <div ref={resultRef} className={`${styles.textBlock} ${styles.result}`}>
            <span className={styles.kicker}>The return / 03</span>
            <p>Scroll back.<br />The lines recede.</p>
          </div>
        </div>
      </div>
    </section>
  </main>
}
