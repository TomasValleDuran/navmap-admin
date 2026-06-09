import * as THREE from 'three'
import type { Edge, NodeType, POI, POIType, Transform, Waypoint } from '../types/navmap'

export interface ExportInput {
  pois: POI[]
  waypoints: Waypoint[]
  edges: Edge[]
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
  transform: Partial<Transform>
  floorHeightViewer?: number
  metersPerViewerUnit: number | null
  mirrorX: boolean
  mirrorY: boolean
  mirrorZ: boolean
  version: '1' | '2.0'
}

export function exportToJSON(input: ExportInput): string {
  const { pois, waypoints, edges, transform, floorHeightViewer, metersPerViewerUnit, mirrorX, mirrorY, mirrorZ } = input
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
    },
    nodes: [
      ...pois.map((p) => ({
        id: p.id,
        node_type: 'poi' as const,
        name: p.name,
        poi_type: p.type,
        description: p.desc,
        floor: p.floor,
        position: { x: p.x, y: p.y, z: p.z },
        position_m: toMetersPos(p.x, p.y, p.z),
        position_world_m: toWorldPos(p.x, p.y, p.z),
      })),
      ...waypoints.map((w) => ({
        id: w.id,
        node_type: 'waypoint' as const,
        label: w.label,
        floor: w.floor,
        position: { x: w.x, y: w.y, z: w.z },
        position_m: toMetersPos(w.x, w.y, w.z),
        position_world_m: toWorldPos(w.x, w.y, w.z),
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

interface RawData {
  version?: string
  nodes?: V2Node[]
  edges?: V2Edge[]
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
  }
}

export function parseImportJSON(text: string): ImportResult {
  const data = JSON.parse(text) as RawData
  if (!data.nodes && !data.pois) {
    throw new Error('JSON no reconocido')
  }

  if (data.version === '2.0' && data.nodes) {
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
          x: p.x, y: p.y, z: p.z,
        })
      } else {
        waypoints.push({
          id: n.id,
          label: n.label ?? 'WP',
          floor: n.floor ?? 0,
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

    const mpvu = data.transform_info?.meters_per_viewer_unit
    return {
      pois,
      waypoints,
      edges,
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
    transform: {},
    metersPerViewerUnit: null,
    mirrorX: true,
    mirrorY: true,
    mirrorZ: false,
    version: '1',
  }
}
