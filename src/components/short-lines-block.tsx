'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createBrush, seeded, StrokeRenderer } from '@/lib/brush-engine.js'
import styles from './short-lines-block.module.css'

const DASH_WIDTH = 10
const COLUMN_GAP = DASH_WIDTH
const COLUMN_STEP = DASH_WIDTH + COLUMN_GAP
const ROW_SPACING = 5
const TITLE_DRAW_END = .88
const clamp = (value: number) => Math.max(0, Math.min(1, value))
type Stamp = { image: HTMLCanvasElement; dx: number; dy: number; width: number; height: number }
type Mark = { x: number; y: number; variant: number }
type Bounds = { left: number; right: number; top: number; bottom: number }
type MarkField = { full: HTMLCanvasElement; stamps: Stamp[]; marks: (Mark | null)[]; firstX: number; columnCount: number; rowCount: number }

function drawStamp(ctx: CanvasRenderingContext2D, mark: Mark, stamp: Stamp) {
  ctx.drawImage(stamp.image, mark.x + stamp.dx, mark.y + stamp.dy, stamp.width, stamp.height)
}

function createMarks(width: number, height: number, dpr: number, seed: number, exclusion?: Bounds): MarkField {
  const marginX = Math.min(72, Math.max(28, width * .06))
  const marginY = Math.min(56, Math.max(24, height * .06))
  const columnCount = Math.max(1, Math.floor((width - marginX * 2 - DASH_WIDTH) / COLUMN_STEP) + 1)
  const rowCount = Math.max(1, Math.floor((height - marginY * 2) / ROW_SPACING) + 1)
  const firstX = columnCount > 1 ? marginX : (width - DASH_WIDTH) / 2
  const random = seeded(seed)
  const brush = createBrush({
    material: 'fine-pencil',
    color: '#58738e',
    width: 1.9,
    grain: .48,
    edgeRoughness: .13,
    pigment: .78,
    pressure: 'fine',
    endPressure: .76,
  })
  const stamps: Stamp[] = Array.from({ length: 16 }, (_, index) => {
    const stroke = brush.stroke({ path: [[0, 0], [DASH_WIDTH, 0]], seed: seed + index * 31 })
    const renderer = new StrokeRenderer(stroke, dpr)
    return { image: renderer.texture, dx: renderer.x, dy: renderer.y, width: renderer.w, height: renderer.h }
  })
  const full = document.createElement('canvas')
  full.width = Math.round(width * dpr)
  full.height = Math.round(height * dpr)
  const fullCtx = full.getContext('2d')!
  fullCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
  const marks: (Mark | null)[] = []

  for (let column = 0; column < columnCount; column++) {
    const x = firstX + column * COLUMN_STEP
    for (let row = 0; row < rowCount; row++) {
      const mark = { x, y: marginY + row * ROW_SPACING, variant: Math.floor(random() * stamps.length) }
      const overlapsTitle = exclusion && x < exclusion.right && x + DASH_WIDTH > exclusion.left
        && mark.y - 2 < exclusion.bottom && mark.y + 2 > exclusion.top
      marks.push(overlapsTitle ? null : mark)
      if (!overlapsTitle) drawStamp(fullCtx, mark, stamps[mark.variant])
    }
  }

  return { full, stamps, marks, firstX, columnCount, rowCount }
}

export default function ShortLinesBlock({ seed, label, title }: { seed: number; label: string; title?: string }) {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const titleSlotRef = useRef<HTMLDivElement>(null)
  const typedRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!section || !canvas || !ctx) return

    let width = 0
    let height = 0
    let pixelRatio = 0
    let reservationKey = ''
    let field: MarkField | null = null
    let frame = 0

    function render() {
      frame = 0
      if (!ctx || !section) return
      const rect = section.getBoundingClientRect()
      if (rect.bottom < 0 || rect.top > window.innerHeight) return
      const travel = section.offsetHeight - window.innerHeight
      const progress = travel > 0 ? clamp(-rect.top / travel) : 1
      ctx.fillStyle = '#f7f7f3'
      ctx.fillRect(0, 0, width, height)
      if (!field) return
      const drawingProgress = title ? clamp(progress / TITLE_DRAW_END) : progress
      const amount = drawingProgress * field.marks.length
      const completed = Math.min(field.marks.length, Math.floor(amount))
      const completeColumns = Math.floor(completed / field.rowCount)
      if (completeColumns >= field.columnCount) {
        ctx.drawImage(field.full, 0, 0, width, height)
        return
      }
      if (completeColumns > 0) {
        const cutoff = field.firstX + completeColumns * COLUMN_STEP - COLUMN_GAP / 2
        ctx.save()
        ctx.beginPath()
        ctx.rect(0, 0, cutoff, height)
        ctx.clip()
        ctx.drawImage(field.full, 0, 0, width, height)
        ctx.restore()
      }
      const firstActive = completeColumns * field.rowCount
      for (let index = firstActive; index < completed; index++) {
        const mark = field.marks[index]
        if (mark) drawStamp(ctx, mark, field.stamps[mark.variant])
      }
      const fraction = amount - completed
      if (fraction > 0 && completed < field.marks.length) {
        const mark = field.marks[completed]
        if (mark) {
          ctx.save()
          ctx.beginPath()
          ctx.rect(mark.x - 4, mark.y - 4, (DASH_WIDTH + 8) * fraction, 8)
          ctx.clip()
          drawStamp(ctx, mark, field.stamps[mark.variant])
          ctx.restore()
        }
      }
    }

    function requestRender() {
      if (!frame) frame = requestAnimationFrame(render)
    }

    function resize() {
      if (!canvas || !ctx) return
      const bounds = canvas.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const titleBounds = titleSlotRef.current?.getBoundingClientRect()
      const exclusion = titleBounds ? {
        left: titleBounds.left - bounds.left - 4,
        right: titleBounds.right - bounds.left + 4,
        top: titleBounds.top - bounds.top - 2,
        bottom: titleBounds.bottom - bounds.top + 2,
      } : undefined
      const nextReservationKey = exclusion
        ? `${exclusion.left.toFixed(1)},${exclusion.right.toFixed(1)},${exclusion.top.toFixed(1)},${exclusion.bottom.toFixed(1)}`
        : ''
      if (bounds.width === width && bounds.height === height && dpr === pixelRatio && nextReservationKey === reservationKey) return
      width = bounds.width
      height = bounds.height
      pixelRatio = dpr
      reservationKey = nextReservationKey
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      field = createMarks(width, height, dpr, seed, exclusion)
      requestRender()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    if (titleSlotRef.current) observer.observe(titleSlotRef.current)
    window.addEventListener('scroll', requestRender, { passive: true })
    let titleTrigger: ScrollTrigger | undefined
    if (title && typedRef.current) {
      const letters = Array.from(title)
      const wordEnds = letters.flatMap((letter, index) =>
        /\p{L}/u.test(letter) && !/\p{L}/u.test(letters[index + 1] ?? '') ? [index + 1] : [],
      )
      const typed = typedRef.current
      let previousCount: number | null = null
      const updateTyped = (progress: number) => {
        const typingProgress = clamp((progress - TITLE_DRAW_END) / (1 - TITLE_DRAW_END))
        const count = Math.floor(typingProgress * letters.length)
        typed.textContent = letters.slice(0, count).join('')
        const priorCount = previousCount
        if (priorCount !== null && count > priorCount && document.visibilityState === 'visible' && typeof navigator.vibrate === 'function') {
          const completedWords = wordEnds.filter((end) => priorCount < end && end <= count).length
          if (completedWords) navigator.vibrate(completedWords === 1 ? 25 : [25, 80, 25])
        }
        previousCount = count
      }
      gsap.registerPlugin(ScrollTrigger)
      titleTrigger = ScrollTrigger.create({
        trigger: section,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (self) => updateTyped(self.progress),
      })
      updateTyped(titleTrigger.progress)
    }
    resize()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('scroll', requestRender)
      titleTrigger?.kill()
    }
  }, [seed, title])

  return <section ref={sectionRef} className={styles.scrollSection} aria-label={label}>
    <div className={styles.sticky}>
      <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label={`${label}, drawn column by column as the page scrolls`} />
      {title ? <div ref={titleSlotRef} className={styles.titleSlot}>
        <h1 className={styles.title} aria-label={title}>
          <span className={styles.titleMeasure} aria-hidden="true">{title}</span>
          <span ref={typedRef} className={styles.titleTyped} aria-hidden="true" />
        </h1>
      </div> : null}
    </div>
  </section>
}
