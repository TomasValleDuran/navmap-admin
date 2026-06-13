import * as THREE from 'three'
import { colmapToViewer } from './coordTransforms'
import type {
  AnchorPoint,
  CalibrationSample,
  Edge,
  NodeType,
  POI,
  POIType,
  Transform,
  Waypoint,
} from '../types/navmap'

export interface ExportInput {
  pois: POI[]
  waypoints: Waypoint[]
  edges: Edge[]
  anchors: AnchorPoint[]
  calibrationSamples: CalibrationSample[]
  transform: Transform
  floorHeightViewer: number
  metersPerViewerUnit: number | null
  mirrorX: boolean
  mirrorY: boolean
  mirrorZ: boolean
}

export interface ImportResult {
  pois: POI[]
  waypoints: Waypoint[]
  edges: Edge[]
  anchors: AnchorPoint[]
  calibrationSamples: CalibrationSample[]
  transform: Partial<Transform>
  floorHeightViewer?: number
  metersPerViewerUnit: number | null
  mirrorX: boolean
  mirrorY: boolean
  mirrorZ: boolean
  version: '1' | '2.0'
}

export function exportToJSON(input: ExportInput): string {
  const { pois, waypoints, edges, anchors, calibrationSamples, transform, floorHeightViewer, metersPerViewerUnit, mirrorX, mirrorY, mirrorZ } = input
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
  // This is the field the ARCore app consumes directly — no scale/flip/mirror on device.
  // See apps/FORMAT.md. Null when uncalibrated (metric AR needs a known scale).
  const toArPos = (x: number, y: number, z: number) => {
    if (!calibrated || metersPerViewerUnit == null) return null
    const v = colmapToViewer(x, y, z, transform)
    return {
      x: v.vx * metersPerViewerUnit * mx,
      y: v.vy * metersPerViewerUnit * my,
      z: v.vz * metersPerViewerUnit * mz,
    }
  }

  const data = {
    version: '2.0' as const,
    exported_at: new Date().toISOString(),
    coordinate_space: 'colmap_original' as const,
    transform_info: {
      note: 'Positions are in COLMAP space (unitless). When calibrated, *_m fields give the same data in meters. Conversion: meters = colmap * meters_per_colmap_unit.',
      center_offset: {
        cx: transform.cx,
        cy: transform.cy,
        cz: transform.cz,
        scale: transform.scale,
        alignQ: transform.alignQ ? transform.alignQ.toArray() : null,
      },
      floor_height_viewer: floorHeightViewer,
      meters_per_viewer_unit: metersPerViewerUnit,
      meters_per_colmap_unit: metersPerColmapUnit,
      calibrated,
      mirror_x: mirrorX,
      mirror_y: mirrorY,
      mirror_z: mirrorZ,
      // Building heading: degrees to pre-rotate the graph about the vertical axis so
      // paths line up with real hallways. 0 until the AR app saves a measured value.
      ar_hints: { default_rotation_deg: 0 },
      calibration_samples: calibrationSamples.map((s) => ({
        id: s.id,
        a: s.a,
        b: s.b,
        real_m: s.realMeters,
      })),
    },
    anchors: anchors.map((a) => ({
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
      ...pois.map((p) => ({
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
      ...waypoints.map((w) => ({
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
    edges: edges.map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      weight_3d: e.weight,
      weight_2d: e.weight2d,
      length_3d_m: toMetersScalar(e.weight),
      length_2d_m: toMetersScalar(e.weight2d),
    })),
    summary: {
      total_pois: pois.length,
      total_waypoints: waypoints.length,
      total_edges: edges.length,
      total_anchors: anchors.length,
    },
  }
  return JSON.stringify(data, null, 2)
}

export function downloadJSON(input: ExportInput, filename = 'navmap_annotations.json'): void {
  const text = exportToJSON(input)
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
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

interface RawData {
  version?: string
  nodes?: V2Node[]
  edges?: V2Edge[]
  anchors?: V2Anchor[]
  pois?: V1Poi[]
  waypoints?: V1Waypoint[]
  transform_info?: {
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
}

export function parseImportJSON(text: string): ImportResult {
  const data = JSON.parse(text) as RawData
  if (!data.nodes && !data.pois) {
    throw new Error('JSON no reconocido')
  }

  if (data.version?.startsWith('2') && data.nodes) {
    const pois: POI[] = []
    const waypoints: Waypoint[] = []
    for (const n of data.nodes) {
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
    const edges: Edge[] = (data.edges ?? []).map((e) => {
      const fromType: NodeType = pois.some((p) => p.id === e.from) ? 'poi' : 'waypoint'
      const toType: NodeType = pois.some((p) => p.id === e.to) ? 'poi' : 'waypoint'
      return {
        id: e.id,
        from: e.from,
        fromType,
        to: e.to,
        toType,
        weight: e.weight_3d ?? 0,
        weight2d: e.weight_2d ?? 0,
      }
    })

    const co = data.transform_info?.center_offset
    const transform: Partial<Transform> = {}
    if (co) {
      if (co.cx !== undefined) transform.cx = co.cx
      if (co.cy !== undefined) transform.cy = co.cy
      if (co.cz !== undefined) transform.cz = co.cz
      if (co.scale !== undefined) transform.scale = co.scale
      if (co.alignQ) transform.alignQ = new THREE.Quaternion().fromArray(co.alignQ)
    }

    const anchors: AnchorPoint[] = (data.anchors ?? []).map((a, i) => ({
      id: a.id,
      label: a.label ?? `ANCLA-${i + 1}`,
      desc: a.description ?? '',
      floor: a.floor ?? 0,
      x: a.position.x,
      y: a.position.y,
      z: a.position.z,
    }))
    const calibrationSamples: CalibrationSample[] = (
      data.transform_info?.calibration_samples ?? []
    )
      .filter((s) => s && s.a && s.b && typeof s.real_m === 'number' && s.real_m > 0)
      .map((s, i) => ({
        id: s.id ?? `cal_imported_${i}`,
        a: s.a,
        b: s.b,
        realMeters: s.real_m,
      }))

    const mpvu = data.transform_info?.meters_per_viewer_unit
    return {
      pois,
      waypoints,
      edges,
      anchors,
      calibrationSamples,
      transform,
      floorHeightViewer: data.transform_info?.floor_height_viewer,
      metersPerViewerUnit: typeof mpvu === 'number' && isFinite(mpvu) && mpvu > 0 ? mpvu : null,
      mirrorX:
        data.transform_info?.mirror_x !== undefined ? !!data.transform_info.mirror_x : true,
      mirrorY:
        data.transform_info?.mirror_y !== undefined ? !!data.transform_info.mirror_y : true,
      mirrorZ:
        data.transform_info?.mirror_z !== undefined ? !!data.transform_info.mirror_z : false,
      version: '2.0',
    }
  }

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
  return {
    pois,
    waypoints,
    edges: [],
    anchors: [],
    calibrationSamples: [],
    transform: {},
    metersPerViewerUnit: null,
    mirrorX: true,
    mirrorY: true,
    mirrorZ: false,
    version: '1',
  }
}
