import * as THREE from 'three'

export type Mode =
  | 'view'
  | 'poi'
  | 'waypoint'
  | 'edge'
  | 'select'
  | 'measure'
  | 'anchor'
  | 'connect-floors'

export interface MeasurePoint {
  vx: number
  vy: number
  vz: number
}

export type POIType =
  | 'bathroom'
  | 'elevator'
  | 'stairs'
  | 'exit'
  | 'classroom'
  | 'office'
  | 'reception'
  | 'lab'
  | 'other'

export type NodeType = 'poi' | 'waypoint'

export interface POI {
  id: string
  name: string
  type: POIType
  desc: string
  floor: number
  /** Optional QR payload printed on a wall. Empty → the AR app matches the node id. */
  qr?: string
  x: number
  y: number
  z: number
}

export interface Waypoint {
  id: string
  label: string
  floor: number
  /** Optional QR payload printed on a wall. Empty → the AR app matches the node id. */
  qr?: string
  x: number
  y: number
  z: number
}

export interface AnchorPoint {
  id: string
  label: string
  desc: string
  floor: number
  x: number
  y: number
  z: number
}

export interface CalibrationSample {
  id: string
  a: { x: number; y: number; z: number }
  b: { x: number; y: number; z: number }
  realMeters: number
}

export interface Edge {
  id: string
  from: string
  fromType: NodeType
  to: string
  toType: NodeType
  weight: number
  weight2d: number
}

export interface PendingPoint {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
}

export interface SelectedNode {
  id: string
  nodeType: NodeType
}

export interface EdgeStart {
  id: string
  nodeType: NodeType
}

export interface Transform {
  cx: number
  cy: number
  cz: number
  scale: number
  alignQ: THREE.Quaternion | null
  alignQInv: THREE.Quaternion | null
}

/** Kind of vertical link between two floors. */
export type ConnectionKind = 'stairs' | 'elevator' | 'ramp' | 'escalator'

/**
 * A cross-floor link joining a node on one floor to a node on another. Because each floor lives
 * in its own (logically-only aligned) space, the link carries explicit physical facts the router
 * turns into a traversal cost — see lib/routing.ts and apps/FORMAT.md.
 */
export interface FloorConnection {
  id: string
  kind: ConnectionKind
  /** elevator/ramp default true, stairs/escalator default false; overridable. */
  accessible: boolean
  from: string // node id on floorFrom
  to: string // node id on floorTo
  floorFrom: number // Floor.level
  floorTo: number
  rise_m: number // vertical climb (meters)
  steps?: number
  length_m?: number // optional horizontal travel along the link
}

/**
 * One floor of a building: its own point cloud (kept in a runtime map, not here), transform,
 * calibration, mirror flags and annotations. `level` is the canonical floor number nodes refer to.
 */
export interface Floor {
  id: string
  level: number
  name: string
  elevation_m: number
  transform: Transform
  floorHeightViewer: number
  metersPerViewerUnit: number | null
  calibrationSamples: CalibrationSample[]
  mirrorX: boolean
  mirrorY: boolean
  mirrorZ: boolean
  pois: POI[]
  waypoints: Waypoint[]
  edges: Edge[]
  anchors: AnchorPoint[]
}

/** Runtime-only point-cloud data for a floor (geometry is never serialized to JSON). */
export interface FloorCloud {
  geometry: THREE.BufferGeometry
  hasColor: boolean
  pointSize: number
  modelRadius: number
}

/** Similarity transform of a secondary cloud within the floor's viewer frame. Scale is uniform. */
export interface SecondaryCloudTransform {
  position: [number, number, number]
  quaternion: [number, number, number, number]
  scale: number
}

/**
 * An extra point cloud manually placed onto a floor as visual scaffolding (e.g. a COLMAP
 * partition re-assembled next to the primary). Runtime-only: geometry is never serialized, and
 * the calibration/transform of the floor stays owned by the primary cloud. See TASK2_PLAN.md.
 */
export interface SecondaryCloud {
  id: string
  /** Source filename, shown in the cloud list. */
  name: string
  geometry: THREE.BufferGeometry
  hasColor: boolean
  pointSize: number
  modelRadius: number
  transform: SecondaryCloudTransform
  visible: boolean
  /** Hex color used to tint the cloud so it reads distinctly from the primary. */
  tint: string
}

/** Which handle set the alignment gizmo shows for the selected secondary cloud. */
export type GizmoMode = 'translate' | 'rotate' | 'scale'

/** Per-profile penalties (meters-equivalent) applied to floor changes. `'excluded'` = forbidden. */
export interface RoutingProfile {
  floor_change_penalty_m: number
  stairs_penalty_m: number | 'excluded'
  elevator_penalty_m: number | 'excluded'
  ramp_penalty_m: number | 'excluded'
  escalator_penalty_m: number | 'excluded'
}

export interface RoutingProfiles {
  default: RoutingProfile
  accessible: RoutingProfile
}

/** A pending cross-floor link: first endpoint chosen, waiting for the second on another floor. */
export interface ConnectStart {
  id: string
  nodeType: NodeType
  floorId: string
  level: number
}

