import * as THREE from 'three'
import { colmapToViewer } from './coordTransforms'
import type {
  AnchorPoint,
  CalibrationSample,
  ConnectionKind,
  Edge,
  Floor,
  FloorConnection,
  NodeType,
  POI,
  POIType,
  RoutingProfiles,
  Transform,
  Waypoint,
} from '../types/navmap'

export interface ExportInput {
  floors: Floor[]
  connections: FloorConnection[]
  routingProfiles: RoutingProfiles
  buildingName?: string
}

export interface ImportResult {
  floors: Floor[]
  connections: FloorConnection[]
  routingProfiles?: RoutingProfiles
  version: '1' | '2.0' | '3.0'
}

/** Serialize one floor's annotations into the per-floor JSON block (incl. metric/AR coords). */
function floorToJSON(floor: Floor) {
  const { transform, metersPerViewerUnit, mirrorX, mirrorY, mirrorZ } = floor
  const calibrated =
    metersPerViewerUnit != null && isFinite(metersPerViewerUnit) && metersPerViewerUnit > 0
  const metersPerColmapUnit = calibrated ? transform.scale * metersPerViewerUnit : null
  const scaleM = metersPerColmapUnit ?? 0
  const mx = mirrorX ? -1 : 1
  const my = mirrorY ? -1 : 1
  const mz = mirrorZ ? -1 : 1
  const toMetersScalar = (v: number) => (calibrated ? v * scaleM : null)
  const toMetersPos = (x: number, y: number, z: number) =>
    calibrated ? { x: x * scaleM, y: y * scaleM, z: z * scaleM } : null
  const toWorldPos = (x: number, y: number, z: number) =>
    calibrated ? { x: x * scaleM * mx, y: y * scaleM * my, z: z * scaleM * mz } : null
  // AR-ready coordinates: meters, floor-aligned (alignQ applied), Y-up, mirror baked in.
  const toArPos = (x: number, y: number, z: number) => {
    if (!calibrated || metersPerViewerUnit == null) return null
    const v = colmapToViewer(x, y, z, transform)
    return {
      x: v.vx * metersPerViewerUnit * mx,
      y: v.vy * metersPerViewerUnit * my,
      z: v.vz * metersPerViewerUnit * mz,
    }
  }

  return {
    id: floor.id,
    level: floor.level,
    name: floor.name,
    elevation_m: floor.elevation_m,
    transform_info: {
      center_offset: {
        cx: transform.cx,
        cy: transform.cy,
        cz: transform.cz,
        scale: transform.scale,
        alignQ: transform.alignQ ? transform.alignQ.toArray() : null,
      },
      floor_height_viewer: floor.floorHeightViewer,
      meters_per_viewer_unit: metersPerViewerUnit,
      meters_per_colmap_unit: metersPerColmapUnit,
      calibrated,
      mirror_x: mirrorX,
      mirror_y: mirrorY,
      mirror_z: mirrorZ,
      ar_hints: { default_rotation_deg: 0 },
      calibration_samples: floor.calibrationSamples.map((s) => ({
        id: s.id,
        a: s.a,
        b: s.b,
        real_m: s.realMeters,
      })),
    },
    anchors: floor.anchors.map((a) => ({
      id: a.id,
      label: a.label,
      description: a.desc,
      floor: a.floor,
      position: { x: a.x, y: a.y, z: a.z },
      position_m: toMetersPos(a.x, a.y, a.z),
      position_world_m: toWorldPos(a.x, a.y, a.z),
      position_ar: toArPos(a.x, a.y, a.z),
    })),
    nodes: [
      ...floor.pois.map((p) => ({
        id: p.id,
        node_type: 'poi' as const,
        name: p.name,
        poi_type: p.type,
        description: p.desc,
        floor: p.floor,
        qr: p.qr ?? null,
        position: { x: p.x, y: p.y, z: p.z },
        position_m: toMetersPos(p.x, p.y, p.z),
        position_world_m: toWorldPos(p.x, p.y, p.z),
        position_ar: toArPos(p.x, p.y, p.z),
      })),
      ...floor.waypoints.map((w) => ({
        id: w.id,
        node_type: 'waypoint' as const,
        label: w.label,
        floor: w.floor,
        qr: w.qr ?? null,
        position: { x: w.x, y: w.y, z: w.z },
        position_m: toMetersPos(w.x, w.y, w.z),
        position_world_m: toWorldPos(w.x, w.y, w.z),
        position_ar: toArPos(w.x, w.y, w.z),
      })),
    ],
    edges: floor.edges.map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      weight_3d: e.weight,
      weight_2d: e.weight2d,
      length_3d_m: toMetersScalar(e.weight),
      length_2d_m: toMetersScalar(e.weight2d),
    })),
  }
}

export function exportToJSON(input: ExportInput): string {
  const { floors, connections, routingProfiles, buildingName } = input
  const data = {
    version: '3.0' as const,
    exported_at: new Date().toISOString(),
    coordinate_space: 'colmap_original' as const,
    note: 'Multi-floor building. Each floor is its own COLMAP space (logically aligned). Floors are joined by `connections`; the router turns connection facts into cost via `routing_profiles`. See apps/FORMAT.md.',
    building: { name: buildingName ?? 'Edificio' },
    routing_profiles: routingProfiles,
    floors: floors.map(floorToJSON),
    connections: connections.map((c) => ({
      id: c.id,
      kind: c.kind,
      accessible: c.accessible,
      from: c.from,
      to: c.to,
      floor_from: c.floorFrom,
      floor_to: c.floorTo,
      rise_m: c.rise_m,
      steps: c.steps ?? null,
      length_m: c.length_m ?? null,
    })),
    summary: {
      total_floors: floors.length,
      total_pois: floors.reduce((n, f) => n + f.pois.length, 0),
      total_waypoints: floors.reduce((n, f) => n + f.waypoints.length, 0),
      total_edges: floors.reduce((n, f) => n + f.edges.length, 0),
      total_anchors: floors.reduce((n, f) => n + f.anchors.length, 0),
      total_connections: connections.length,
    },
  }
  return JSON.stringify(data, null, 2)
}

export function downloadJSON(input: ExportInput, filename = 'navmap_building.json'): void {
  const text = exportToJSON(input)
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

interface RawTransformInfo {
  center_offset?: {
    cx?: number
    cy?: number
    cz?: number
    scale?: number
    alignQ?: number[] | null
  }
  floor_height_viewer?: number
  meters_per_viewer_unit?: number | null
  mirror_x?: boolean
  mirror_y?: boolean
  mirror_z?: boolean
  calibration_samples?: V2CalibrationSample[]
}

interface V2Node {
  id: string
  node_type: NodeType
  position: { x: number; y: number; z: number }
  name?: string
  poi_type?: POIType
  description?: string
  label?: string
  floor?: number
  qr?: string | null
}

interface V2Edge {
  id: string
  from: string
  to: string
  weight_3d?: number
  weight_2d?: number
}

interface V2Anchor {
  id: string
  label?: string
  description?: string
  floor?: number
  position: { x: number; y: number; z: number }
}

interface V2CalibrationSample {
  id?: string
  a: { x: number; y: number; z: number }
  b: { x: number; y: number; z: number }
  real_m: number
}

interface V1Poi {
  id: string | number
  name: string
  type: POIType
  description?: string
  position: { x: number; y: number; z: number }
}

interface V1Waypoint {
  id: string | number
  label: string
  position: { x: number; y: number; z: number }
}

interface RawFloor {
  id?: string
  level?: number
  name?: string
  elevation_m?: number
  transform_info?: RawTransformInfo
  nodes?: V2Node[]
  edges?: V2Edge[]
  anchors?: V2Anchor[]
}

interface RawConnection {
  id?: string
  kind?: ConnectionKind
  accessible?: boolean
  from: string
  to: string
  floor_from?: number
  floor_to?: number
  rise_m?: number
  steps?: number | null
  length_m?: number | null
}

interface RawData {
  version?: string
  // v3.0
  floors?: RawFloor[]
  connections?: RawConnection[]
  routing_profiles?: RoutingProfiles
  building?: { name?: string }
  // v2.0
  nodes?: V2Node[]
  edges?: V2Edge[]
  anchors?: V2Anchor[]
  transform_info?: RawTransformInfo
  // v1
  pois?: V1Poi[]
  waypoints?: V1Waypoint[]
}

function transformFromInfo(info: RawTransformInfo | undefined): Transform {
  const co = info?.center_offset
  const alignQ = co?.alignQ ? new THREE.Quaternion().fromArray(co.alignQ) : null
  return {
    cx: co?.cx ?? 0,
    cy: co?.cy ?? 0,
    cz: co?.cz ?? 0,
    scale: co?.scale ?? 1,
    alignQ,
    alignQInv: alignQ ? alignQ.clone().invert() : null,
  }
}

function calibrationFromInfo(info: RawTransformInfo | undefined): CalibrationSample[] {
  return (info?.calibration_samples ?? [])
    .filter((s) => s && s.a && s.b && typeof s.real_m === 'number' && s.real_m > 0)
    .map((s, i) => ({
      id: s.id ?? `cal_imported_${i}`,
      a: s.a,
      b: s.b,
      realMeters: s.real_m,
    }))
}

function metersPerViewerFromInfo(info: RawTransformInfo | undefined): number | null {
  const v = info?.meters_per_viewer_unit
  return typeof v === 'number' && isFinite(v) && v > 0 ? v : null
}

/** Split a flat list of v2 nodes into per-type POI/Waypoint arrays and rebuild edges. */
function nodesToFloorParts(rawNodes: V2Node[], rawEdges: V2Edge[]) {
  const pois: POI[] = []
  const waypoints: Waypoint[] = []
  for (const n of rawNodes) {
    const p = n.position
    if (n.node_type === 'poi') {
      pois.push({
        id: n.id,
        name: n.name ?? 'POI',
        type: n.poi_type ?? 'other',
        desc: n.description ?? '',
        floor: n.floor ?? 0,
        qr: n.qr ?? undefined,
        x: p.x, y: p.y, z: p.z,
      })
    } else {
      waypoints.push({
        id: n.id,
        label: n.label ?? 'WP',
        floor: n.floor ?? 0,
        qr: n.qr ?? undefined,
        x: p.x, y: p.y, z: p.z,
      })
    }
  }
  const edges: Edge[] = rawEdges.map((e) => ({
    id: e.id,
    from: e.from,
    fromType: pois.some((p) => p.id === e.from) ? 'poi' : 'waypoint',
    to: e.to,
    toType: pois.some((p) => p.id === e.to) ? 'poi' : 'waypoint',
    weight: e.weight_3d ?? 0,
    weight2d: e.weight_2d ?? 0,
  }))
  return { pois, waypoints, edges }
}

function anchorsFromRaw(rawAnchors: V2Anchor[], level: number): AnchorPoint[] {
  return rawAnchors.map((a, i) => ({
    id: a.id,
    label: a.label ?? `ANCLA-${i + 1}`,
    desc: a.description ?? '',
    floor: a.floor ?? level,
    x: a.position.x,
    y: a.position.y,
    z: a.position.z,
  }))
}

export function parseImportJSON(text: string): ImportResult {
  const data = JSON.parse(text) as RawData

  // ---- v3.0: multi-floor ----
  if (data.version?.startsWith('3') && data.floors) {
    const usedIds = new Set<string>()
    const floors: Floor[] = data.floors.map((rf, i) => {
      const level = rf.level ?? i
      let id = rf.id ?? `floor_${level}`
      while (usedIds.has(id)) id = `${id}_${i}`
      usedIds.add(id)
      const { pois, waypoints, edges } = nodesToFloorParts(rf.nodes ?? [], rf.edges ?? [])
      return {
        id,
        level,
        name: rf.name ?? `Piso ${level}`,
        elevation_m: rf.elevation_m ?? level * 3,
        transform: transformFromInfo(rf.transform_info),
        floorHeightViewer: rf.transform_info?.floor_height_viewer ?? 0,
        metersPerViewerUnit: metersPerViewerFromInfo(rf.transform_info),
        calibrationSamples: calibrationFromInfo(rf.transform_info),
        mirrorX: rf.transform_info?.mirror_x ?? true,
        mirrorY: rf.transform_info?.mirror_y ?? true,
        mirrorZ: rf.transform_info?.mirror_z ?? false,
        pois,
        waypoints,
        edges,
        anchors: anchorsFromRaw(rf.anchors ?? [], level),
      }
    })
    const connections: FloorConnection[] = (data.connections ?? []).map((c, i) => ({
      id: c.id ?? `conn_imported_${i}`,
      kind: c.kind ?? 'stairs',
      accessible: c.accessible ?? (c.kind === 'elevator' || c.kind === 'ramp'),
      from: c.from,
      to: c.to,
      floorFrom: c.floor_from ?? 0,
      floorTo: c.floor_to ?? 0,
      rise_m: c.rise_m ?? 0,
      steps: c.steps ?? undefined,
      length_m: c.length_m ?? undefined,
    }))
    return { floors, connections, routingProfiles: data.routing_profiles, version: '3.0' }
  }

  // ---- v2.0: single-floor → wrap as floor 0 ----
  if (data.version?.startsWith('2') && data.nodes) {
    const { pois, waypoints, edges } = nodesToFloorParts(data.nodes, data.edges ?? [])
    const floor: Floor = {
      id: 'floor_0',
      level: 0,
      name: 'Planta baja',
      elevation_m: 0,
      transform: transformFromInfo(data.transform_info),
      floorHeightViewer: data.transform_info?.floor_height_viewer ?? 0,
      metersPerViewerUnit: metersPerViewerFromInfo(data.transform_info),
      calibrationSamples: calibrationFromInfo(data.transform_info),
      mirrorX: data.transform_info?.mirror_x ?? true,
      mirrorY: data.transform_info?.mirror_y ?? true,
      mirrorZ: data.transform_info?.mirror_z ?? false,
      pois,
      waypoints,
      edges,
      anchors: anchorsFromRaw(data.anchors ?? [], 0),
    }
    return { floors: [floor], connections: [], version: '2.0' }
  }

  // ---- v1: legacy pois/waypoints → wrap as floor 0 ----
  if (data.pois || data.waypoints) {
    const pois: POI[] = (data.pois ?? []).map((p) => ({
      id: 'poi_' + p.id,
      name: p.name,
      type: p.type,
      desc: p.description ?? '',
      floor: 0,
      x: p.position.x, y: p.position.y, z: p.position.z,
    }))
    const waypoints: Waypoint[] = (data.waypoints ?? []).map((w) => ({
      id: 'wp_' + w.id,
      label: w.label,
      floor: 0,
      x: w.position.x, y: w.position.y, z: w.position.z,
    }))
    const floor: Floor = {
      id: 'floor_0',
      level: 0,
      name: 'Planta baja',
      elevation_m: 0,
      transform: transformFromInfo(undefined),
      floorHeightViewer: 0,
      metersPerViewerUnit: null,
      calibrationSamples: [],
      mirrorX: true,
      mirrorY: true,
      mirrorZ: false,
      pois,
      waypoints,
      edges: [],
      anchors: [],
    }
    return { floors: [floor], connections: [], version: '1' }
  }

  throw new Error('JSON no reconocido')
}
