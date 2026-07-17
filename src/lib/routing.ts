import type { ConnectionKind, Floor, FloorConnection, RoutingProfile } from '../types/navmap'

/**
 * Cross-app cost model (single source of truth — mirror any change in the Android router
 * and in apps/FORMAT.md). The admin uses it only for the route preview; the device runs the
 * real navigation. Costs are in meters-equivalent.
 *
 *   edge_cost       = horizontal length of the edge (meters when the floor is calibrated)
 *   connection_cost = profile[kind]_penalty_m + profile.floor_change_penalty_m + (length_m ?? 0)
 *   if profile[kind] === 'excluded' the connection is dropped (e.g. stairs in an accessible route)
 */

export interface RouteResult {
  found: boolean
  cost: number
  /** Ordered node ids from start to end (empty when not found). */
  path: string[]
  /** Connection ids traversed, in order. */
  connectionsUsed: string[]
}

function penaltyForKind(profile: RoutingProfile, kind: ConnectionKind): number | 'excluded' {
  switch (kind) {
    case 'stairs':
      return profile.stairs_penalty_m
    case 'elevator':
      return profile.elevator_penalty_m
    case 'ramp':
      return profile.ramp_penalty_m
    case 'escalator':
      return profile.escalator_penalty_m
  }
}

/** Cost of traversing a connection under a profile, or null if it is forbidden. */
export function connectionCost(profile: RoutingProfile, c: FloorConnection): number | null {
  const penalty = penaltyForKind(profile, c.kind)
  if (penalty === 'excluded') return null
  return penalty + profile.floor_change_penalty_m + (c.length_m ?? 0)
}

/** Meters per COLMAP unit for a floor, or null when the floor is uncalibrated. */
function metersPerColmapUnit(floor: Floor): number | null {
  return floor.metersPerViewerUnit != null ? floor.transform.scale * floor.metersPerViewerUnit : null
}

interface Adj {
  to: string
  cost: number
  connId?: string
}

function buildGraph(floors: Floor[], connections: FloorConnection[], profile: RoutingProfile) {
  const adj = new Map<string, Adj[]>()
  const add = (from: string, to: string, cost: number, connId?: string) => {
    const list = adj.get(from) ?? []
    list.push({ to, cost, connId })
    adj.set(from, list)
  }
  const ensure = (id: string) => {
    if (!adj.has(id)) adj.set(id, [])
  }

  for (const f of floors) {
    for (const p of f.pois) ensure(p.id)
    for (const w of f.waypoints) ensure(w.id)
    const mpc = metersPerColmapUnit(f)
    for (const e of f.edges) {
      const cost = mpc != null ? e.weight2d * mpc : e.weight2d
      add(e.from, e.to, cost)
      add(e.to, e.from, cost)
    }
  }

  for (const c of connections) {
    const cost = connectionCost(profile, c)
    if (cost == null) continue // excluded by this profile
    add(c.from, c.to, cost, c.id)
    add(c.to, c.from, cost, c.id)
  }

  return adj
}

/** Dijkstra shortest path between two node ids under a routing profile. */
export function computeRoute(args: {
  floors: Floor[]
  connections: FloorConnection[]
  profile: RoutingProfile
  startId: string
  endId: string
}): RouteResult {
  const { floors, connections, profile, startId, endId } = args
  const adj = buildGraph(floors, connections, profile)
  if (!adj.has(startId) || !adj.has(endId)) {
    return { found: false, cost: Infinity, path: [], connectionsUsed: [] }
  }

  const dist = new Map<string, number>()
  const prev = new Map<string, { node: string; connId?: string }>()
  const visited = new Set<string>()
  for (const id of adj.keys()) dist.set(id, Infinity)
  dist.set(startId, 0)

  // Small graphs → linear-scan priority queue is fine.
  while (true) {
    let u: string | null = null
    let best = Infinity
    for (const [id, d] of dist) {
      if (!visited.has(id) && d < best) {
        best = d
        u = id
      }
    }
    if (u == null || best === Infinity) break
    if (u === endId) break
    visited.add(u)
    for (const e of adj.get(u) ?? []) {
      if (visited.has(e.to)) continue
      const nd = best + e.cost
      if (nd < (dist.get(e.to) ?? Infinity)) {
        dist.set(e.to, nd)
        prev.set(e.to, { node: u, connId: e.connId })
      }
    }
  }

  const total = dist.get(endId) ?? Infinity
  if (!isFinite(total)) return { found: false, cost: Infinity, path: [], connectionsUsed: [] }

  const path: string[] = []
  const connectionsUsed: string[] = []
  let cur: string | undefined = endId
  while (cur != null) {
    path.unshift(cur)
    const p = prev.get(cur)
    if (!p) break
    if (p.connId) connectionsUsed.unshift(p.connId)
    cur = p.node
  }

  return { found: true, cost: total, path, connectionsUsed }
}
