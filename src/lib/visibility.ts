import { colmapToViewer } from './coordTransforms'
import { wallsBlockLine, wallsToLines } from './walls'
import type { Edge, MeasurePoint, POI, Transform, WallSegment, Waypoint } from '../types/navmap'

/**
 * Distancia recortada en cada extremo del rayo, en metros. Igual que en la validación y que en
 * `WallMap.hasLineOfSight` de la app: un nodo está marcado *contra* la pared a la que pertenece
 * (una puerta, un aula), así que un rayo que arranca o termina sobre una pared es el caso normal.
 */
export const SIGHT_CLEARANCE_M = 0.6

export interface SightInput {
  eye: MeasurePoint
  pois: POI[]
  waypoints: Waypoint[]
  edges: Edge[]
  walls: WallSegment[]
  transform: Transform
  metersPerViewerUnit: number | null
  modelRadius: number
}

export interface SightResult {
  /** Nodos con línea de vista libre desde el punto. */
  visible: Set<string>
  /** Nodos que quedan tapados: la app no los dibujaría. */
  hidden: Set<string>
  /** Aristas que la app no dibujaría, por la misma regla que usa el renderer. */
  hiddenEdges: Set<string>
  /** Si hay paredes opacas marcadas: sirve para explicar un resultado vacío en el panel. */
  usedWalls: boolean
}

const EMPTY: SightResult = {
  visible: new Set(),
  hidden: new Set(),
  hiddenEdges: new Set(),
  usedWalls: false,
}

/**
 * Qué vería la app parada en [eye]: espeja el criterio de `NavigationGraph.hasLineOfSight`.
 *
 * Sólo tapan las paredes marcadas a mano, igual que en el teléfono. Las **barandas no tapan**:
 * cortan el paso, no la vista, y por eso un POI del otro lado de una baranda se sigue dibujando.
 *
 * Una arista se considera tapada si alguno de sus extremos lo está, que es literalmente la regla
 * del renderer (`edge.from in occludedNodeIds || edge.to in occludedNodeIds`). En el teléfono hay
 * una excepción que acá no aplica: lo que está sobre la ruta activa se dibuja igual, para no
 * dejar al usuario sin la flecha del próximo paso.
 */
export function computeSight(input: SightInput): SightResult {
  const { eye, pois, waypoints, edges, walls, transform } = input
  const nodes = [...pois, ...waypoints]
  if (nodes.length === 0) return EMPTY

  const clearance = input.metersPerViewerUnit
    ? SIGHT_CLEARANCE_M / input.metersPerViewerUnit
    : Math.max(1, input.modelRadius) * 0.05

  const lines = walls.length > 0 ? wallsToLines(walls, transform) : []
  const opaque = lines.filter((l) => !l.seeThrough)

  const visible = new Set<string>()
  const hidden = new Set<string>()

  for (const n of nodes) {
    const v = colmapToViewer(n.x, n.y, n.z, transform)
    const blocked =
      opaque.length > 0 && wallsBlockLine(lines, eye.vx, eye.vz, v.vx, v.vz, clearance, true)
    if (blocked) hidden.add(n.id)
    else visible.add(n.id)
  }

  const hiddenEdges = new Set<string>()
  for (const e of edges) {
    if (hidden.has(e.from) || hidden.has(e.to)) hiddenEdges.add(e.id)
  }

  return {
    visible,
    hidden,
    hiddenEdges,
    usedWalls: opaque.length > 0,
  }
}
