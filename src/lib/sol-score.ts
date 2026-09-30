export type Point = { x: number; y: number }
export type SolLine = {
  from: Point
  to: Point
  color: string
  startsAt: number
  endsAt: number
}

export type SolScore = {
  cell: number
  gridX: number[]
  gridY: number[]
  lines: SolLine[]
}

type Candidate = { point: Point; angle: number; distance: number; key: string }

function seeded(seed: number) {
  let state = seed >>> 0
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296)
}

function gridAxis(length: number, cell: number) {
  const axis: number[] = []
  const offset = (length / 2) % cell
  for (let coordinate = offset; coordinate <= length; coordinate += cell) {
    axis.push(coordinate)
  }
  return axis
}

function candidatesFor(origin: Point, points: Point[], width: number, height: number, cell: number): Candidate[] {
  const centered = origin.x === width / 2 && origin.y === height / 2
  const inwardX = width / 2 - origin.x
  const inwardY = height / 2 - origin.y
  const inwardLength = Math.hypot(inwardX, inwardY) || 1
  const nx = inwardX / inwardLength
  const ny = inwardY / inwardLength

  return points.flatMap(point => {
    const dx = point.x - origin.x
    const dy = point.y - origin.y
    const distance = Math.hypot(dx, dy) / cell
    if (distance < 3 || distance > 14) return []
    if (!centered && dx * nx + dy * ny <= 0) return []
    const angle = centered
      ? Math.atan2(dy, dx)
      : Math.atan2(nx * dy - ny * dx, nx * dx + ny * dy)
    return [{ point, angle, distance, key: `${point.x},${point.y}` }]
  })
}

function selectEndpoints(origin: Point, count: number, points: Point[], width: number, height: number, cell: number, random: () => number) {
  const choices = candidatesFor(origin, points, width, height, cell)
  const centered = origin.x === width / 2 && origin.y === height / 2
  const angleMin = centered ? -Math.PI : Math.min(...choices.map(choice => choice.angle))
  const angleMax = centered ? Math.PI : Math.max(...choices.map(choice => choice.angle))
  const angleSpan = angleMax - angleMin
  const used = new Set<string>()
  const endpoints: Point[] = []

  for (let index = 0; index < count; index++) {
    const lower = angleMin + angleSpan * index / count
    const upper = angleMin + angleSpan * (index + 1) / count
    const desiredDistance = 3 + random() * 11
    const inSector = choices.filter(choice => !used.has(choice.key) && choice.angle >= lower && choice.angle < upper)
    const available = inSector.length ? inSector : choices.filter(choice => !used.has(choice.key))
    available.sort((a, b) => Math.abs(a.distance - desiredDistance) - Math.abs(b.distance - desiredDistance))
    const selected = available[Math.floor(random() * Math.min(5, available.length))]
    if (!selected) break
    used.add(selected.key)
    endpoints.push(selected.point)
  }

  return endpoints
}

export function generateSolScore(width: number, height: number, seed = 280): SolScore {
  const cell = Math.max(28, Math.min(54, Math.floor(Math.min(width, height) / 12)))
  const gridX = gridAxis(width, cell)
  const gridY = gridAxis(height, cell)
  const points = gridX.flatMap(x => gridY.map(y => ({ x, y })))
  const random = seeded(seed)
  const lines: SolLine[] = []
  const center = [{ x: width / 2, y: height / 2 }]
  const sides = [
    { x: width / 2, y: 0 },
    { x: width, y: height / 2 },
    { x: width / 2, y: height },
    { x: 0, y: height / 2 },
  ]
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ]

  function addFamily(anchors: Point[], countPerAnchor: number, color: string, windowStart: number, windowEnd: number) {
    const endpoints = anchors.map(anchor => selectEndpoints(anchor, countPerAnchor, points, width, height, cell, random))
    const total = anchors.length * countPerAnchor
    const span = windowEnd - windowStart
    for (let index = 0; index < countPerAnchor; index++) {
      for (let anchorIndex = 0; anchorIndex < anchors.length; anchorIndex++) {
        const to = endpoints[anchorIndex][index]
        if (!to) continue
        const order = index * anchors.length + anchorIndex
        const startsAt = windowStart + span * .55 * order / Math.max(1, total - 1)
        lines.push({ from: anchors[anchorIndex], to, color, startsAt, endsAt: startsAt + span * .45 })
      }
    }
  }

  addFamily(center, 16, '#fff9e9', 0, .43)
  addFamily(sides, 6, '#be4e2f', .26, .74)
  addFamily(corners, 8, '#2e6c82', .54, 1)

  return { cell, gridX, gridY, lines }
}
