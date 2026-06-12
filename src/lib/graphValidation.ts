import * as THREE from 'three'
import { colmapToViewer } from './coordTransforms'
import type { AnchorPoint, Edge, POI, Transform, Waypoint } from '../types/navmap'

export interface ValidationIssue {
  severity: 'warn' | 'info'
  message: string
  edgeId?: string
  nodeId?: string
}

export interface ValidationInput {
  pois: POI[]
  waypoints: Waypoint[]
  edges: Edge[]
  anchors: AnchorPoint[]
  transform: Transform
  floorHeightViewer: number
  metersPerViewerUnit: number | null
  modelRadius: number
  pointCloudGeometry: THREE.BufferGeometry | null
}

interface GraphNode {
  id: string
  label: string
  x: number
  y: number
  z: number
}

export function validateGraph(input: ValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const nodes: GraphNode[] = [
    ...input.pois.map((p) => ({ id: p.id, label: p.name, x: p.x, y: p.y, z: p.z })),
    ...input.waypoints.map((w) => ({ id: w.id, label: w.label, x: w.x, y: w.y, z: w.z })),
  ]
  const byId = new Map(nodes.map((n) => [n.id, n]))

  if (input.metersPerViewerUnit == null) {
    issues.push({
      severity: 'warn',
      message: 'Sin calibrar: el export no tendrá posiciones en metros (necesario para AR).',
    })
  }
  if (input.anchors.length < 2) {
    issues.push({
      severity: 'info',
      message: `Solo ${input.anchors.length} punto(s) de anclaje. Con 2–3 anclas el viewer AR puede resolver la alineación completa.`,
    })
  }

  const degree = new Map<string, number>()
  for (const e of input.edges) {
    degree.set(e.from, (degree.get(e.from) ?? 0) + 1)
    degree.set(e.to, (degree.get(e.to) ?? 0) + 1)
  }
  const orphans = nodes.filter((n) => !degree.has(n.id))
  if (orphans.length > 0 && input.edges.length > 0) {
    issues.push({
      severity: 'warn',
      message: `Nodos sin conexiones (inalcanzables): ${orphans.map((n) => n.label).join(', ')}.`,
    })
  }

  const components = countComponents(nodes, input.edges)
  if (components > 1 && input.edges.length > 0 && orphans.length < nodes.length) {
    issues.push({
      severity: 'warn',
      message: `El grafo tiene ${components} componentes desconectados: no hay ruta entre todos los nodos.`,
    })
  }

  for (const e of findEdgesThroughWalls(input, byId)) {
    const from = byId.get(e.from)
    const to = byId.get(e.to)
    issues.push({
      severity: 'warn',
      edgeId: e.id,
      message: `La conexión ${from?.label ?? e.from} → ${to?.label ?? e.to} parece atravesar una pared.`,
    })
  }

  return issues
}

function countComponents(nodes: GraphNode[], edges: Edge[]): number {
  const parent = new Map<string, string>()
  const find = (a: string): string => {
    let r = a
    while (parent.get(r) !== r) r = parent.get(r)!
    parent.set(a, r)
    return r
  }
  for (const n of nodes) parent.set(n.id, n.id)
  for (const e of edges) {
    if (!parent.has(e.from) || !parent.has(e.to)) continue
    const ra = find(e.from)
    const rb = find(e.to)
    if (ra !== rb) parent.set(ra, rb)
  }
  const roots = new Set<string>()
  for (const n of nodes) roots.add(find(n.id))
  return roots.size
}

/**
 * Heuristic wall detection: project the cloud points that sit in a "body
 * height" band above the floor onto an XZ occupancy grid, then walk each edge
 * and flag it when consecutive samples cross occupied cells. Open hallways
 * are mostly empty at chest height; walls are dense slabs.
 */
function findEdgesThroughWalls(
  input: ValidationInput,
  byId: Map<string, GraphNode>,
): Edge[] {
  const geo = input.pointCloudGeometry
  if (!geo || input.edges.length === 0) return []
  const posAttr = geo.attributes.position
  if (!posAttr) return []
  const pos = posAttr.array as Float32Array
  const count = posAttr.count

  const r = Math.max(1, input.modelRadius)
  // band in viewer units: 0.3–1.8 m above the floor when calibrated, else a fraction of the model size
  const mpvu = input.metersPerViewerUnit
  const bandLo = input.floorHeightViewer + (mpvu ? 0.3 / mpvu : r * 0.04)
  const bandHi = input.floorHeightViewer + (mpvu ? 1.8 / mpvu : r * 0.25)
  const cell = mpvu ? 0.25 / mpvu : r * 0.02

  const grid = new Map<number, number>()
  const keyOf = (x: number, z: number) =>
    Math.floor((x + r * 4) / cell) * 100000 + Math.floor((z + r * 4) / cell)
  const stride = Math.max(1, Math.floor(count / 400000))
  let occupied = 0
  for (let i = 0; i < count; i += stride) {
    const y = pos[i * 3 + 1]
    if (y < bandLo || y > bandHi) continue
    const k = keyOf(pos[i * 3], pos[i * 3 + 2])
    const c = (grid.get(k) ?? 0) + 1
    grid.set(k, c)
    if (c === 1) occupied++
  }
  if (occupied < 20) return []

  // adaptive density threshold: a wall cell should hold a decent share of the typical occupied cell
  const cellCounts = [...grid.values()].sort((a, b) => a - b)
  const median = cellCounts[Math.floor(cellCounts.length / 2)]
  const minPts = Math.max(3, Math.round(median * 0.5))

  const endpointClearance = mpvu ? 0.6 / mpvu : r * 0.05
  const suspect: Edge[] = []
  for (const e of input.edges) {
    const a = byId.get(e.from)
    const b = byId.get(e.to)
    if (!a || !b) continue
    const va = colmapToViewer(a.x, a.y, a.z, input.transform)
    const vb = colmapToViewer(b.x, b.y, b.z, input.transform)
    const len = Math.hypot(vb.vx - va.vx, vb.vz - va.vz)
    if (len < endpointClearance * 2.5) continue
    const steps = Math.max(4, Math.ceil(len / (cell * 0.8)))
    let run = 0
    let hit = false
    for (let s = 0; s <= steps && !hit; s++) {
      const t = s / steps
      const d = t * len
      if (d < endpointClearance || len - d < endpointClearance) {
        run = 0
        continue
      }
      const x = va.vx + (vb.vx - va.vx) * t
      const z = va.vz + (vb.vz - va.vz) * t
      const n = grid.get(keyOf(x, z)) ?? 0
      run = n >= minPts ? run + 1 : 0
      if (run >= 2) hit = true
    }
    if (hit) suspect.push(e)
  }
  return suspect
}
