import * as THREE from 'three'
import { colmapToViewer } from './coordTransforms'
import { connectionCost } from './routing'
import type {
  AnchorPoint,
  Edge,
  Floor,
  FloorConnection,
  POI,
  RoutingProfiles,
  Transform,
  Waypoint,
} from '../types/navmap'

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
  qr?: string
  x: number
  y: number
  z: number
}

export function validateGraph(input: ValidationInput): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const nodes: GraphNode[] = [
    ...input.pois.map((p) => ({ id: p.id, label: p.name, qr: p.qr, x: p.x, y: p.y, z: p.z })),
    ...input.waypoints.map((w) => ({ id: w.id, label: w.label, qr: w.qr, x: w.x, y: w.y, z: w.z })),
  ]
  const byId = new Map(nodes.map((n) => [n.id, n]))

  // ── Identity checks: edges and QR scans both resolve nodes by these strings ──
  const idGroups = new Map<string, GraphNode[]>()
  for (const n of nodes) {
    const g = idGroups.get(n.id) ?? []
    g.push(n)
    idGroups.set(n.id, g)
  }
  for (const [id, group] of idGroups) {
    if (group.length > 1) {
      issues.push({
        severity: 'warn',
        nodeId: id,
        message: `ID duplicado "${id}" en ${group.length} nodos (${group
          .map((n) => n.label)
          .join(', ')}). Los IDs deben ser únicos.`,
      })
    }
  }

  const qrGroups = new Map<string, GraphNode[]>()
  for (const n of nodes) {
    if (!n.qr) continue
    const g = qrGroups.get(n.qr) ?? []
    g.push(n)
    qrGroups.set(n.qr, g)
  }
  for (const [qr, group] of qrGroups) {
    if (group.length > 1) {
      issues.push({
        severity: 'warn',
        nodeId: group[0].id,
        message: `Código QR "${qr}" repetido en ${group.length} nodos (${group
          .map((n) => n.label)
          .join(', ')}). Al escanearlo, la app no sabría a cuál corresponde.`,
      })
    }
  }

  // A QR payload equal to a *different* node's ID resolves to that node (the app
  // matches IDs before QR fields), so the scan would land on the wrong node.
  for (const n of nodes) {
    if (!n.qr || n.qr === n.id) continue
    const clash = byId.get(n.qr)
    if (clash && clash.id !== n.id) {
      issues.push({
        severity: 'warn',
        nodeId: n.id,
        message: `El código QR "${n.qr}" de "${n.label}" coincide con el ID del nodo "${clash.label}". La app lo resolvería al nodo equivocado.`,
      })
    }
  }

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

/**
 * Building-wide checks across floors and cross-floor connections (the per-floor `validateGraph`
 * only sees the active floor). `loadedFloorIds` are the floors whose point cloud is loaded.
 */
export function validateBuilding(input: {
  floors: Floor[]
  connections: FloorConnection[]
  routingProfiles: RoutingProfiles
  loadedFloorIds: Set<string>
}): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  const { floors, connections, routingProfiles, loadedFloorIds } = input

  // index every node by id and remember which floor level it sits on
  const nodeFloor = new Map<string, number>()
  for (const f of floors) {
    for (const p of f.pois) nodeFloor.set(p.id, f.level)
    for (const w of f.waypoints) nodeFloor.set(w.id, f.level)
  }

  // floors missing a calibration / cloud
  for (const f of floors) {
    if (!loadedFloorIds.has(f.id)) {
      issues.push({ severity: 'info', message: `El piso "${f.name}" no tiene nube cargada.` })
    } else if (f.metersPerViewerUnit == null) {
      issues.push({
        severity: 'warn',
        message: `El piso "${f.name}" no está calibrado: sus distancias no estarán en metros.`,
      })
    }
  }

  // connections must reference existing nodes
  for (const c of connections) {
    if (!nodeFloor.has(c.from) || !nodeFloor.has(c.to)) {
      issues.push({
        severity: 'warn',
        message: `La conexión ${c.id} (${c.kind}) referencia un nodo inexistente.`,
      })
    }
  }

  if (floors.length > 1) {
    // every floor should be linked to the rest by at least one connection
    const linkedLevels = new Set<number>()
    for (const c of connections) {
      linkedLevels.add(c.floorFrom)
      linkedLevels.add(c.floorTo)
    }
    for (const f of floors) {
      if (!linkedLevels.has(f.level)) {
        issues.push({
          severity: 'warn',
          message: `El piso "${f.name}" no tiene ninguna conexión (escaleras/ascensor) con otros pisos.`,
        })
      }
    }

    // accessible reachability: which floor levels are reachable step-free from the lowest floor
    const reachable = accessibleReachableLevels(floors, connections, routingProfiles)
    if (reachable) {
      for (const f of floors) {
        if (!reachable.has(f.level)) {
          issues.push({
            severity: 'warn',
            message: `El piso "${f.name}" no es accesible sin escaleras (falta ascensor/rampa en la ruta).`,
          })
        }
      }
    }
  }

  return issues
}

/** Levels reachable from the lowest floor using only accessible connections, or null if empty. */
function accessibleReachableLevels(
  floors: Floor[],
  connections: FloorConnection[],
  profiles: RoutingProfiles,
): Set<number> | null {
  const levels = floors.map((f) => f.level)
  if (!levels.length) return null
  const start = Math.min(...levels)
  // graph over floor *levels*, joined only by connections the accessible profile keeps
  const adj = new Map<number, number[]>()
  for (const l of levels) adj.set(l, [])
  for (const c of connections) {
    if (connectionCost(profiles.accessible, c) == null) continue
    adj.get(c.floorFrom)?.push(c.floorTo)
    adj.get(c.floorTo)?.push(c.floorFrom)
  }
  const seen = new Set<number>([start])
  const stack = [start]
  while (stack.length) {
    const u = stack.pop()!
    for (const v of adj.get(u) ?? []) {
      if (!seen.has(v)) {
        seen.add(v)
        stack.push(v)
      }
    }
  }
  return seen
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
