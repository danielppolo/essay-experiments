'use client'

import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createBrush, fragmentStroke, StrokeRenderer } from '@/lib/brush-engine.js'
import { generateSolScore, type SolLine, type SolScore } from '@/lib/sol-score'
import { drawStoryGraphite, hasNativeHaptics, playStoryHaptic, stopStoryGraphite, typeStoryCharacters, type StoryHaptic } from '@/lib/story-haptics'
import styles from './sol-brush-story.module.css'

const clamp = (value: number) => Math.max(0, Math.min(1, value))
const range = (value: number, start: number, end: number) => clamp((value - start) / (end - start))
const passages = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
]
const lineWindows = [[.21, .30], [.47, .55], [.71, .79]] as const
const paragraphWindows = [[.31, .37, .41], [.56, .62, .66], [.80, .86, .90]] as const
const reflectionWindows = [[.415, .46], [.665, .70], [.905, .935]] as const
type HapticMoment = { at: number; kind: StoryHaptic; priority: number }

const hapticMoments: HapticMoment[] = [
  ...lineWindows.map((window): HapticMoment => ({ at: window[1], kind: 'collision', priority: 3 })),
  ...reflectionWindows.map((window): HapticMoment => ({ at: window[0], kind: 'reflection', priority: 2 })),
  { at: 1, kind: 'ending', priority: 4 },
]
hapticMoments.sort((a, b) => a.at - b.at)
const drawingWindows = [[0, .07], ...lineWindows, ...reflectionWindows] as readonly (readonly [number, number])[]
const initialHapticSettings = { letter: .24, graphite: .58, grain: .42, sharpness: .28 }

function newlyTyped(value: string, from: number, to: number, start: number, end: number) {
  const length = Array.from(value).length
  return Math.max(0, Math.floor(range(to, start, end) * length) - Math.floor(range(from, start, end) * length))
}
type BrushRenderer = InstanceType<typeof StrokeRenderer>
type DrawnLine = { renderers: BrushRenderer[]; start: number; end: number }
type Box = { left: number; right: number; top: number; bottom: number }

function intersectsBox(line: SolLine, box: Box) {
  // Liang–Barsky clipping: even a diagonal line must leave the text's space empty.
  const dx = line.to.x - line.from.x
  const dy = line.to.y - line.from.y
  const p = [-dx, dx, -dy, dy]
  const q = [line.from.x - box.left, box.right - line.from.x, line.from.y - box.top, box.bottom - line.from.y]
  let enter = 0
  let exit = 1
  for (let index = 0; index < 4; index++) {
    if (p[index] === 0) {
      if (q[index] < 0) return false
    } else {
      const t = q[index] / p[index]
      if (p[index] < 0) enter = Math.max(enter, t)
      else exit = Math.min(exit, t)
      if (enter > exit) return false
    }
  }
  return true
}

function makeDrawnLines(score: SolScore, localScore: SolScore, boxes: Box[], width: number, height: number, viewportHeight: number, dpr: number): DrawnLine[] {
  const brush = createBrush({
    material: 'dry-pastel', width: 3.4, grain: .64, edgeRoughness: .3,
    pigment: .9, pressure: 'fine', endPressure: .65,
  })

  function makeLine(line: SolLine, start: number, end: number, seed: number): DrawnLine {
    const stroke = brush.stroke({
      path: [[line.from.x, line.from.y], [line.to.x, line.to.y]],
      color: line.color, seed, delay: 0, duration: 1000,
    })
    const renderers = fragmentStroke(stroke, { maxLength: 100, gap: 1.5, seed: seed + 100 })
      .map(piece => new StrokeRenderer(piece, dpr))
    return { renderers, start, end }
  }

  const result: DrawnLine[] = []
  const offsets = [0, viewportHeight * .55, viewportHeight * 1.1]
  const families = [localScore.lines.slice(0, 16), localScore.lines.slice(16, 40), localScore.lines.slice(40)]
  families.forEach((family, passage) => {
    const [start, end] = lineWindows[passage]
    const shiftedFamily = family.map(line => ({
      ...line,
      from: { x: line.from.x, y: line.from.y + offsets[passage] },
      to: { x: line.to.x, y: line.to.y + offsets[passage] },
    }))
    const safeLines = shiftedFamily.filter(line => boxes.every(box => !intersectsBox(line, {
      left: box.left - 10, right: box.right + 10, top: box.top - 10, bottom: box.bottom + 10,
    }))).slice(0, 4)
    safeLines.forEach((line, index) => result.push(makeLine(line, start + index * .012, end - .01, 280 + passage * 80 + index * 17)))

    const box = boxes[passage]
    const fromLeft = passage !== 1
    const hit = { x: fromLeft ? box.left : box.right, y: (box.top + box.bottom) / 2 }
    const travelX = Math.min(score.cell * 5, width * .22)
    const source = {
      x: fromLeft ? Math.max(0, hit.x - travelX) : Math.min(width, hit.x + travelX),
      y: Math.max(0, hit.y - score.cell * 3),
    }
    // Reflect across the vertical edge of the invisible text box: x reverses, y continues.
    const reflected = {
      x: Math.max(0, Math.min(width, hit.x - (hit.x - source.x) * .9)),
      y: Math.min(height, hit.y + (hit.y - source.y) * .9),
    }
    const color = ['#fff9e9', '#be4e2f', '#2e6c82'][passage]
    result.push(makeLine({ from: source, to: hit, color, startsAt: 0, endsAt: 1 }, start, end, 610 + passage * 31))
    const [reflectStart, reflectEnd] = reflectionWindows[passage]
    result.push(makeLine({ from: hit, to: reflected, color, startsAt: 0, endsAt: 1 }, reflectStart, reflectEnd, 710 + passage * 31))
  })
  return result
}

function typeInto(element: HTMLElement, value: string, progress: number, start: number, end: number) {
  const characters = Array.from(value)
  const count = Math.floor(range(progress, start, end) * characters.length)
  element.textContent = characters.slice(0, count).join('')
}

export default function SolBrushStory() {
  const [nativeHaptics, setNativeHaptics] = useState(false)
  const [hapticsEnabled, setHapticsEnabled] = useState(true)
  const hapticsEnabledRef = useRef(true)
  const [hapticSettings, setHapticSettings] = useState(initialHapticSettings)
  const hapticSettingsRef = useRef(initialHapticSettings)
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawingRef = useRef<HTMLDivElement>(null)
  const greetingRef = useRef<HTMLSpanElement>(null)
  const paragraphRefs = useRef<(HTMLParagraphElement | null)[]>([])
  const typedRefs = useRef<(HTMLSpanElement | null)[]>([])
  const farewellRef = useRef<HTMLSpanElement>(null)
  const dateRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current
    const drawing = drawingRef.current
    const greeting = greetingRef.current
    const farewell = farewellRef.current
    const dateElement = dateRef.current
    const ctx = canvas?.getContext('2d')
    if (!section || !canvas || !drawing || !greeting || !farewell || !dateElement || !ctx) return

    gsap.registerPlugin(ScrollTrigger)
    setNativeHaptics(hasNativeHaptics())
    const date = new Intl.DateTimeFormat('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    }).format(new Date())
    let width = 0
    let height = 0
    let viewportHeight = 0
    let score: SolScore | null = null
    let lines: DrawnLine[] = []
    let progress = 0
    let previousProgress: number | null = null
    let graphiteActive = false
    let lastGraphiteAt = -Infinity
    let graphiteStopTimer: ReturnType<typeof setTimeout> | null = null
    let frame = 0

    function stopGraphite() {
      if (graphiteStopTimer !== null) clearTimeout(graphiteStopTimer)
      graphiteStopTimer = null
      if (!graphiteActive) return
      graphiteActive = false
      void stopStoryGraphite()
    }

    function onVisibilityChange() {
      if (document.visibilityState !== 'visible') stopGraphite()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    function render() {
      frame = 0
      const currentScore = score
      if (!ctx || !currentScore) return
      ctx.clearRect(0, 0, width, height)
      if (progress > 0) {
        ctx.save()
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(91, 76, 38, .17)'
        ctx.lineWidth = .75
        const gridLines = currentScore.gridX.length + currentScore.gridY.length
        const drawn = range(progress, 0, .07) * gridLines
        currentScore.gridX.forEach((x, index) => {
          const amount = clamp(drawn - index)
          if (amount > 0) { ctx.moveTo(x, 0); ctx.lineTo(x, height * amount) }
        })
        currentScore.gridY.forEach((y, index) => {
          const amount = clamp(drawn - currentScore.gridX.length - index)
          if (amount > 0) { ctx.moveTo(0, y); ctx.lineTo(width * amount, y) }
        })
        ctx.stroke()
        ctx.restore()
        for (const line of lines) {
          const time = range(progress, line.start, line.end) * 1000
          if (time > 0) for (const renderer of line.renderers) renderer.draw(ctx, time)
        }
      }

      typeInto(greeting!, 'hello, reader', progress, .08, .16)
      greeting!.style.opacity = String(1 - range(progress, .18, .22))
      greeting!.style.visibility = progress >= .08 && progress < .22 ? 'visible' : 'hidden'

      paragraphRefs.current.forEach((paragraph, index) => {
        const typed = typedRefs.current[index]
        if (!paragraph || !typed) return
        const [start, end, exit] = paragraphWindows[index]
        typeInto(typed, passages[index], progress, start, end)
        paragraph.style.opacity = String(1 - range(progress, exit - .012, exit))
        paragraph.style.visibility = progress >= start && progress < exit ? 'visible' : 'hidden'
      })

      const cameraY = viewportHeight * (
        .55 * range(progress, .46, .55) +
        .55 * range(progress, .70, .79) +
        range(progress, .935, .965)
      )
      drawing!.style.transform = `translate3d(0, ${-cameraY}px, 0)`
      typeInto(farewell!, 'Thank you, reader', progress, .965, .985)
      farewell!.style.visibility = progress >= .965 ? 'visible' : 'hidden'
      typeInto(dateElement!, date, progress, .985, 1)
      dateElement!.style.visibility = progress >= .985 ? 'visible' : 'hidden'
    }

    function requestRender() {
      if (!frame) frame = requestAnimationFrame(render)
    }

    function resize() {
      if (!canvas || !ctx) return
      const bounds = canvas.getBoundingClientRect()
      if (!bounds.width || !bounds.height) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = bounds.width
      height = bounds.height
      viewportHeight = window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      score = generateSolScore(width, height)
      const localScore = generateSolScore(width, viewportHeight)
      const positions = [[.28, .17], [.47, .93], [.23, 1.55]]
      paragraphRefs.current.forEach((paragraph, index) => {
        if (!paragraph || !score) return
        const [xFraction, yFraction] = positions[index]
        const x = score.gridX[Math.min(score.gridX.length - 2, Math.max(1, Math.floor(score.gridX.length * xFraction)))]
        const targetY = viewportHeight * yFraction
        const y = score.gridY.reduce((nearest, candidate) => Math.abs(candidate - targetY) < Math.abs(nearest - targetY) ? candidate : nearest)
        paragraph.style.left = `${x}px`
        paragraph.style.top = `${y}px`
        paragraph.style.width = `${Math.max(score.cell * 3, Math.min(score.cell * 7, width - x - score.cell))}px`
      })
      const boxes = paragraphRefs.current.map(paragraph => ({
        left: paragraph!.offsetLeft,
        right: paragraph!.offsetLeft + paragraph!.offsetWidth,
        top: paragraph!.offsetTop,
        bottom: paragraph!.offsetTop + paragraph!.offsetHeight,
      }))
      lines = makeDrawnLines(score, localScore, boxes, width, height, viewportHeight, dpr)
      requestRender()
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    const trigger = ScrollTrigger.create({
      trigger: section,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: self => {
        const nextProgress = self.progress
        const drawingWindow = drawingWindows.find(([start, end]) => nextProgress >= start && nextProgress < end)
        const movingForward = previousProgress !== null && nextProgress > previousProgress
        if (movingForward && hapticsEnabledRef.current && document.visibilityState === 'visible') {
          const prior = previousProgress!
          const settings = hapticSettingsRef.current
          const typed = newlyTyped('hello, reader', prior, nextProgress, .08, .16)
            + passages.reduce((total, passage, index) => total + newlyTyped(passage, prior, nextProgress, paragraphWindows[index][0], paragraphWindows[index][1]), 0)
            + newlyTyped('Thank you, reader', prior, nextProgress, .965, .985)
            + newlyTyped(date, prior, nextProgress, .985, 1)
          if (typed > 0) void typeStoryCharacters(typed, settings.letter, .46)

          for (const moment of hapticMoments) {
            if (prior < moment.at && moment.at <= nextProgress) void playStoryHaptic(moment.kind)
          }

          if (drawingWindow) {
            const now = performance.now()
            graphiteActive = true
            if (now - lastGraphiteAt >= 35) {
              lastGraphiteAt = now
              const [start, end] = drawingWindow
              const distance = range(nextProgress, start, end)
              const speed = clamp((nextProgress - prior) / .004)
              // Two incommensurate waves produce reproducible paper grain without random flicker.
              const texture = .5 + .25 * Math.sin(distance * 151) + .25 * Math.sin(distance * 347)
              const pressure = settings.graphite * (.45 + .55 * speed)
                * (1 - settings.grain * .52 + settings.grain * texture * .52)
              const sharpness = settings.sharpness + settings.grain * (texture - .5) * .22
              void drawStoryGraphite(pressure, sharpness)
            }
            if (graphiteStopTimer !== null) clearTimeout(graphiteStopTimer)
            graphiteStopTimer = setTimeout(stopGraphite, 110)
          }
        }
        if (!movingForward || !drawingWindow || !hapticsEnabledRef.current) stopGraphite()
        previousProgress = nextProgress
        progress = nextProgress
        requestRender()
      },
    })
    resize()
    progress = trigger.progress
    previousProgress = progress
    requestRender()

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      stopGraphite()
      cancelAnimationFrame(frame)
      observer.disconnect()
      trigger.kill()
    }
  }, [])

  return <main className={styles.page}>
    {nativeHaptics && <button
      type="button"
      className={styles.hapticsToggle}
      aria-pressed={hapticsEnabled}
      onClick={() => {
        hapticsEnabledRef.current = !hapticsEnabledRef.current
        setHapticsEnabled(hapticsEnabledRef.current)
        if (!hapticsEnabledRef.current) void stopStoryGraphite()
      }}
    >Haptics {hapticsEnabled ? 'on' : 'off'}</button>}
    {nativeHaptics && <details className={styles.hapticControls}>
      <summary>Feel</summary>
      {([
        ['letter', 'Letters'],
        ['graphite', 'Graphite'],
        ['grain', 'Paper grain'],
        ['sharpness', 'Edge'],
      ] as const).map(([key, label]) => <label key={key} className={styles.hapticControl}>
        <span>{label}</span><span>{Math.round(hapticSettings[key] * 100)}%</span>
        <input type="range" min="0" max="1" step="0.01" value={hapticSettings[key]}
          onChange={event => {
            const next = { ...hapticSettingsRef.current, [key]: Number(event.target.value) }
            hapticSettingsRef.current = next
            setHapticSettings(next)
          }} />
      </label>)}
    </details>}
    <h1 className={styles.srOnly}>A brush story drawn by scrolling</h1>
    <p id="brush-story-description" className={styles.srOnly}>Scroll to reveal a greeting, then travel down a tall grid through three sequences of brush-drawn lines and typewritten text. Scroll back to reverse the drawing.</p>
    <section ref={sectionRef} className={styles.scrollSection} aria-label="Scroll drawing and story">
      <div className={styles.sticky}>
        <div ref={drawingRef} className={styles.drawingLayer}>
          <canvas ref={canvasRef} className={styles.canvas} role="img" aria-label="Sparse white, red and blue textured lines drawn across a yellow square grid" aria-describedby="brush-story-description" />
          {passages.map((passage, index) => <p key={index} ref={element => { paragraphRefs.current[index] = element }} className={styles.paragraph} aria-label={passage}>
            <span className={styles.paragraphMeasure} aria-hidden="true">{passage}</span>
            <span ref={element => { typedRefs.current[index] = element }} className={styles.paragraphTyped} aria-hidden="true" />
          </p>)}
        </div>
        <div className={styles.centerCopy} aria-label="hello, reader"><span ref={greetingRef} aria-hidden="true" /></div>
        <div className={styles.finale}>
          <span ref={farewellRef} className={styles.farewell} aria-label="Thank you, reader" aria-hidden="true" />
          <span ref={dateRef} className={styles.date} aria-hidden="true" />
        </div>
      </div>
    </section>
  </main>
}
