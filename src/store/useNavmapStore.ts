import { create } from 'zustand'
import * as THREE from 'three'
import type {
  ColmapPos,
} from '../lib/coordTransforms'
import { viewerToColmap } from '../lib/coordTransforms'
import { slugify, uniqueId } from '../lib/ids'
import { fitMetersPerViewerUnit } from '../lib/calibration'
import { validateBuilding, validateGraph, type ValidationIssue } from '../lib/graphValidation'
import type {
  AnchorPoint,
  CalibrationSample,
  ConnectionKind,
  ConnectStart,
  Edge,
  EdgeStart,
  Floor,
  FloorCloud,
  FloorConnection,
  GizmoMode,
  MeasurePoint,
  Mode,
  NodeType,
  PendingPoint,
  POI,
  POIType,
  RoutingProfiles,
  SecondaryCloud,
  SecondaryCloudTransform,
  SelectedNode,
  Transform,
  Waypoint,
} from '../types/navmap'

interface NavmapState {
  // ---- building-level source of truth ----
  floors: Floor[]
  activeFloorId: string
  connections: FloorConnection[]
  routingProfiles: RoutingProfiles
  /** Runtime-only point clouds, keyed by floor id. Never serialized. */
  floorClouds: Record<string, FloorCloud>
  /** Runtime-only secondary clouds (alignment scaffolding), keyed by floor id. Never serialized. */
  floorSecondaryClouds: Record<string, SecondaryCloud[]>

  // ---- live mirror of the active floor (kept in sync; readers use these) ----
  pois: POI[]
  waypoints: Waypoint[]
  edges: Edge[]
  anchors: AnchorPoint[]
  transform: Transform
  floorHeightViewer: number
  metersPerViewerUnit: number | null
  calibrationSamples: CalibrationSample[]
  mirrorX: boolean
  mirrorY: boolean
  mirrorZ: boolean
  pointCloudGeometry: THREE.BufferGeometry | null
  pointCloudHasColor: boolean
  pointCloudPointSize: number
  modelRadius: number
  modelLoaded: boolean
  /** Live mirror of the active floor's secondary clouds. */
  secondaryClouds: SecondaryCloud[]
  /** Which secondary cloud the alignment gizmo is attached to (null → gizmo hidden). */
  selectedCloudId: string | null
  gizmoMode: GizmoMode

  // ---- global UI / interaction state ----
  mode: Mode
  pendingPoint: PendingPoint | null
  edgeStart: EdgeStart | null
  connectStart: ConnectStart | null
  selectedNode: SelectedNode | null
  editingNode: SelectedNode | null
  floorLock: boolean
  statusText: string
  isLoading: boolean
  coordHover: ColmapPos | null
  cameraMode: 'orbit' | 'walk' | 'plan'
  focusRequestId: number
  measurePoints: MeasurePoint[]
  measureHover: MeasurePoint | null
  validationIssues: ValidationIssue[] | null
  qrSheetOpen: boolean

  // ---- floor management ----
  addFloor: () => Floor
  deleteFloor: (id: string) => void
  renameFloor: (id: string, name: string) => void
  setActiveFloor: (id: string) => void
  setFloorMeta: (id: string, patch: { name?: string; level?: number; elevation_m?: number }) => void
  /** Bulk-patch the active floor (used by tools like "flatten nodes"). */
  updateActiveFloor: (patch: Partial<Floor>) => void

  // ---- nodes / edges ----
  setMode: (mode: Mode) => void
  setPendingPoint: (p: PendingPoint | null) => void
  addPOI: (data: { name: string; type: POIType; desc: string; floor: number; qr?: string }) => POI | null
  addWaypoint: (data: { label: string; floor: number; qr?: string }) => Waypoint | null
  addEdge: (from: SelectedNode, to: SelectedNode) => Edge | null
  setEdgeStart: (s: EdgeStart | null) => void
  selectNode: (s: SelectedNode | null) => void
  editPOI: (id: string, patch: Partial<Omit<POI, 'id'>>) => void
  editWaypoint: (id: string, patch: Partial<Omit<Waypoint, 'id'>>) => void
  deleteNode: (id: string, nodeType: NodeType) => void
  deleteEdge: (id: string) => void
  clearAll: () => void

  // ---- cross-floor connections ----
  setConnectStart: (s: ConnectStart | null) => void
  addConnection: (data: {
    kind: ConnectionKind
    accessible: boolean
    rise_m: number
    steps?: number
    length_m?: number
  }) => FloorConnection | null
  editConnection: (id: string, patch: Partial<Omit<FloorConnection, 'id'>>) => void
  deleteConnection: (id: string) => void
  setRoutingProfiles: (p: RoutingProfiles) => void

  // ---- transform / scene ----
  setFloorLock: (v: boolean) => void
  setFloorHeightViewer: (v: number) => void
  setTransform: (t: Partial<Transform>) => void
  setModelLoaded: (v: boolean) => void
  setStatus: (text: string) => void
  setPointCloud: (data: FloorCloud) => void

  // ---- secondary clouds (alignment scaffolding) ----
  addSecondaryCloud: (data: {
    name: string
    geometry: THREE.BufferGeometry
    hasColor: boolean
    pointSize: number
    modelRadius: number
  }) => SecondaryCloud
  updateSecondaryCloudTransform: (id: string, patch: Partial<SecondaryCloudTransform>) => void
  removeSecondaryCloud: (id: string) => void
  toggleSecondaryVisible: (id: string) => void
  selectSecondaryCloud: (id: string | null) => void
  setGizmoMode: (mode: GizmoMode) => void
  setLoading: (v: boolean) => void
  setCoordHover: (c: ColmapPos | null) => void
  startEdit: (n: SelectedNode) => void
  cancelEdit: () => void
  setCameraMode: (m: 'orbit' | 'walk' | 'plan') => void
  requestFocus: () => void

  importState: (s: {
    floors: Floor[]
    activeFloorId?: string
    connections?: FloorConnection[]
    routingProfiles?: RoutingProfiles
  }) => void

  /** Restore a full persisted session (annotations + clouds + secondary clouds). */
  hydrateState: (s: {
    floors: Floor[]
    activeFloorId: string
    connections: FloorConnection[]
    routingProfiles: RoutingProfiles
    floorClouds: Record<string, FloorCloud>
    floorSecondaryClouds: Record<string, SecondaryCloud[]>
  }) => void
  /** Wipe everything back to a single empty floor. */
  resetAll: () => void

  // ---- calibration / measure ----
  addMeasurePoint: (p: MeasurePoint) => void
  clearMeasure: () => void
  setMeasureHover: (p: MeasurePoint | null) => void
  setMetersPerViewerUnit: (v: number | null) => void
  addCalibrationSample: (realMeters: number) => CalibrationSample | null
  removeCalibrationSample: (id: string) => void
  clearCalibration: () => void

  // ---- anchors ----
  addAnchor: (data: { label: string; desc: string; floor: number }) => AnchorPoint | null
  deleteAnchor: (id: string) => void

  // ---- validation / misc ----
  runValidation: () => ValidationIssue[]
  clearValidation: () => void
  setMirror: (axis: 'x' | 'y' | 'z', v: boolean) => void
  setQrSheetOpen: (v: boolean) => void
}

function makeTransform(): Transform {
  return { cx: 0, cy: 0, cz: 0, scale: 1, alignQ: null, alignQInv: null }
}

const DEFAULT_FLOOR_HEIGHT_M = 3

function makeFloor(level: number, name: string, existingFloorIds: Set<string>): Floor {
  return {
    id: uniqueId(`floor-${level}`, existingFloorIds),
    level,
    name,
    elevation_m: level * DEFAULT_FLOOR_HEIGHT_M,
    transform: makeTransform(),
    floorHeightViewer: 0,
    metersPerViewerUnit: null,
    calibrationSamples: [],
    mirrorX: true,
    mirrorY: true,
    mirrorZ: false,
    pois: [],
    waypoints: [],
    edges: [],
    anchors: [],
  }
}

const defaultRoutingProfiles: RoutingProfiles = {
  default: {
    floor_change_penalty_m: 5,
    stairs_penalty_m: 15,
    elevator_penalty_m: 25,
    ramp_penalty_m: 8,
    escalator_penalty_m: 12,
  },
  accessible: {
    floor_change_penalty_m: 5,
    stairs_penalty_m: 'excluded',
    elevator_penalty_m: 10,
    ramp_penalty_m: 6,
    escalator_penalty_m: 'excluded',
  },
}

/** elevator/ramp are step-free by default; stairs/escalator are not. */
export function defaultAccessibleForKind(kind: ConnectionKind): boolean {
  return kind === 'elevator' || kind === 'ramp'
}

/** The active-floor fields mirrored to the top level. */
function mirrorOf(f: Floor) {
  return {
    pois: f.pois,
    waypoints: f.waypoints,
    edges: f.edges,
    anchors: f.anchors,
    transform: f.transform,
    floorHeightViewer: f.floorHeightViewer,
    metersPerViewerUnit: f.metersPerViewerUnit,
    calibrationSamples: f.calibrationSamples,
    mirrorX: f.mirrorX,
    mirrorY: f.mirrorY,
    mirrorZ: f.mirrorZ,
  }
}

function cloudMirror(cloud: FloorCloud | undefined) {
  return {
    pointCloudGeometry: cloud?.geometry ?? null,
    pointCloudHasColor: cloud?.hasColor ?? false,
    pointCloudPointSize: cloud?.pointSize ?? 0.0012,
    modelRadius: cloud?.modelRadius ?? 4,
    modelLoaded: !!cloud,
  }
}

/** Distinct tints so each secondary cloud reads apart from the primary during alignment. */
const SECONDARY_TINTS = ['#ff8c42', '#42a5ff', '#66bb6a', '#ab47bc', '#ffca28', '#ec407a']

/** Mirrors the given floor's secondary clouds to the live top-level field. */
function secondaryMirror(clouds: SecondaryCloud[] | undefined) {
  return { secondaryClouds: clouds ?? [] }
}

/** Writes `clouds` into the active floor's secondary-cloud list and re-mirrors it. */
function withActiveSecondaryClouds(s: NavmapState, clouds: SecondaryCloud[]): Partial<NavmapState> {
  return {
    floorSecondaryClouds: { ...s.floorSecondaryClouds, [s.activeFloorId]: clouds },
    ...secondaryMirror(clouds),
  }
}

const initialFloor = makeFloor(0, 'Planta baja', new Set())

/** Returns a state patch that writes `patch` into the active floor and re-mirrors its fields. */
function withActiveFloor(s: NavmapState, patch: Partial<Floor>): Partial<NavmapState> {
  const floors = s.floors.map((f) => (f.id === s.activeFloorId ? { ...f, ...patch } : f))
  const active = floors.find((f) => f.id === s.activeFloorId) ?? floors[0]
  return { floors, ...mirrorOf(active) }
}

/** Every node id in the whole building — ids must be unique across all floors for connections. */
function existingIds(state: NavmapState): Set<string> {
  const ids = new Set<string>()
  for (const f of state.floors) {
    for (const p of f.pois) ids.add(p.id)
    for (const w of f.waypoints) ids.add(w.id)
    for (const a of f.anchors) ids.add(a.id)
  }
  return ids
}

function activeFloor(state: NavmapState): Floor {
  return state.floors.find((f) => f.id === state.activeFloorId) ?? state.floors[0]
}

function nodeCoords(state: NavmapState, ref: SelectedNode): { x: number; y: number; z: number } | null {
  const f = activeFloor(state)
  if (ref.nodeType === 'poi') {
    const n = f.pois.find((p) => p.id === ref.id)
    return n ? { x: n.x, y: n.y, z: n.z } : null
  }
  const n = f.waypoints.find((w) => w.id === ref.id)
  return n ? { x: n.x, y: n.y, z: n.z } : null
}

export const useNavmapStore = create<NavmapState>((set, get) => ({
  floors: [initialFloor],
  activeFloorId: initialFloor.id,
  connections: [],
  routingProfiles: defaultRoutingProfiles,
  floorClouds: {},
  floorSecondaryClouds: {},

  // mirror of initialFloor (empty)
  pois: [],
  waypoints: [],
  edges: [],
  anchors: [],
  transform: initialFloor.transform,
  floorHeightViewer: 0,
  metersPerViewerUnit: null,
  calibrationSamples: [],
  mirrorX: true,
  mirrorY: true,
  mirrorZ: false,
  pointCloudGeometry: null,
  pointCloudHasColor: false,
  pointCloudPointSize: 0.0012,
  modelRadius: 4,
  modelLoaded: false,
  secondaryClouds: [],
  selectedCloudId: null,
  gizmoMode: 'translate',

  mode: 'view',
  pendingPoint: null,
  edgeStart: null,
  connectStart: null,
  selectedNode: null,
  editingNode: null,
  floorLock: false,
  statusText: 'Cargá un archivo .ply para comenzar.',
  isLoading: false,
  coordHover: null,
  cameraMode: 'orbit',
  focusRequestId: 0,
  measurePoints: [],
  measureHover: null,
  validationIssues: null,
  qrSheetOpen: false,

  // ---- floor management ----
  addFloor: () => {
    const s = get()
    const maxLevel = s.floors.reduce((m, f) => Math.max(m, f.level), -Infinity)
    const level = isFinite(maxLevel) ? maxLevel + 1 : 0
    const floor = makeFloor(level, `Piso ${level}`, new Set(s.floors.map((f) => f.id)))
    set({
      floors: [...s.floors, floor],
      activeFloorId: floor.id,
      ...mirrorOf(floor),
      ...cloudMirror(undefined),
      ...secondaryMirror(undefined),
      selectedCloudId: null,
      selectedNode: null,
      edgeStart: null,
      pendingPoint: null,
      measurePoints: [],
      measureHover: null,
    })
    return floor
  },

  deleteFloor: (id) =>
    set((s) => {
      if (s.floors.length <= 1) return s // always keep one floor
      const floors = s.floors.filter((f) => f.id !== id)
      const removed = s.floors.find((f) => f.id === id)
      const connections = removed
        ? s.connections.filter((c) => c.floorFrom !== removed.level && c.floorTo !== removed.level)
        : s.connections
      const floorClouds = { ...s.floorClouds }
      delete floorClouds[id]
      const floorSecondaryClouds = { ...s.floorSecondaryClouds }
      delete floorSecondaryClouds[id]
      const nextActiveId = s.activeFloorId === id ? floors[0].id : s.activeFloorId
      const active = floors.find((f) => f.id === nextActiveId) ?? floors[0]
      return {
        floors,
        connections,
        floorClouds,
        floorSecondaryClouds,
        activeFloorId: nextActiveId,
        ...mirrorOf(active),
        ...cloudMirror(floorClouds[nextActiveId]),
        ...secondaryMirror(floorSecondaryClouds[nextActiveId]),
        selectedCloudId: null,
        selectedNode: null,
        edgeStart: null,
        connectStart: null,
        pendingPoint: null,
      }
    }),

  renameFloor: (id, name) => set((s) => ({ floors: s.floors.map((f) => (f.id === id ? { ...f, name } : f)) })),

  setActiveFloor: (id) =>
    set((s) => {
      const active = s.floors.find((f) => f.id === id)
      if (!active) return s
      return {
        activeFloorId: id,
        ...mirrorOf(active),
        ...cloudMirror(s.floorClouds[id]),
        ...secondaryMirror(s.floorSecondaryClouds[id]),
        // reset per-floor transient state, but keep connectStart so cross-floor links survive a switch
        selectedCloudId: null,
        selectedNode: null,
        edgeStart: null,
        pendingPoint: null,
        measurePoints: [],
        measureHover: null,
      }
    }),

  setFloorMeta: (id, patch) =>
    set((s) => {
      const floors = s.floors.map((f) => (f.id === id ? { ...f, ...patch } : f))
      const active = floors.find((f) => f.id === s.activeFloorId) ?? floors[0]
      return { floors, ...mirrorOf(active) }
    }),

  updateActiveFloor: (patch) => set((s) => withActiveFloor(s, patch)),

  // ---- mode / interaction ----
  setMode: (mode) =>
    set((s) => ({
      mode,
      edgeStart: null,
      connectStart: mode === 'connect-floors' ? s.connectStart : null,
      measurePoints: mode === 'measure' ? s.measurePoints : [],
      measureHover: null,
    })),

  setPendingPoint: (pendingPoint) => set({ pendingPoint }),

  addPOI: ({ name, type, desc, qr }) => {
    const state = get()
    const p = state.pendingPoint
    if (!p) return null
    const poi: POI = {
      id: uniqueId(slugify(name) || 'poi', existingIds(state)),
      name,
      type,
      desc,
      floor: activeFloor(state).level,
      qr: qr?.trim() || undefined,
      x: p.x,
      y: p.y,
      z: p.z,
    }
    set({ ...withActiveFloor(state, { pois: [...state.pois, poi] }), pendingPoint: null })
    return poi
  },

  addWaypoint: ({ label, qr }) => {
    const state = get()
    const p = state.pendingPoint
    if (!p) return null
    const resolvedLabel = label || `WP-${state.waypoints.length + 1}`
    const wp: Waypoint = {
      id: uniqueId(slugify(resolvedLabel) || 'wp', existingIds(state)),
      label: resolvedLabel,
      floor: activeFloor(state).level,
      qr: qr?.trim() || undefined,
      x: p.x,
      y: p.y,
      z: p.z,
    }
    set({ ...withActiveFloor(state, { waypoints: [...state.waypoints, wp] }), pendingPoint: null })
    return wp
  },

  addEdge: (from, to) => {
    if (from.id === to.id) return null
    const state = get()
    const dup = state.edges.find(
      (e) =>
        (e.from === from.id && e.to === to.id) ||
        (e.from === to.id && e.to === from.id),
    )
    if (dup) return null
    const a = nodeCoords(state, from)
    const b = nodeCoords(state, to)
    if (!a || !b) return null
    const dx = a.x - b.x
    const dy = a.y - b.y
    const dz = a.z - b.z
    const weight = Math.hypot(dx, dy, dz)
    const weight2d = Math.hypot(dx, dz)
    const edge: Edge = {
      id: `edge_${Date.now()}`,
      from: from.id,
      fromType: from.nodeType,
      to: to.id,
      toType: to.nodeType,
      weight,
      weight2d,
    }
    set({ ...withActiveFloor(state, { edges: [...state.edges, edge] }), edgeStart: null })
    return edge
  },

  setEdgeStart: (edgeStart) => set({ edgeStart }),
  selectNode: (selectedNode) => set({ selectedNode }),

  editPOI: (id, patch) =>
    set((s) => withActiveFloor(s, { pois: s.pois.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
  editWaypoint: (id, patch) =>
    set((s) => withActiveFloor(s, { waypoints: s.waypoints.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),

  deleteNode: (id, nodeType) =>
    set((s) => {
      const pois = nodeType === 'poi' ? s.pois.filter((p) => p.id !== id) : s.pois
      const waypoints = nodeType === 'waypoint' ? s.waypoints.filter((w) => w.id !== id) : s.waypoints
      const edges = s.edges.filter((e) => e.from !== id && e.to !== id)
      const selectedNode = s.selectedNode?.id === id ? null : s.selectedNode
      return {
        ...withActiveFloor(s, { pois, waypoints, edges }),
        connections: s.connections.filter((c) => c.from !== id && c.to !== id),
        selectedNode,
      }
    }),

  deleteEdge: (id) => set((s) => withActiveFloor(s, { edges: s.edges.filter((e) => e.id !== id) })),

  clearAll: () =>
    set((s) => ({
      ...withActiveFloor(s, { pois: [], waypoints: [], edges: [], anchors: [] }),
      connections: s.connections.filter(
        (c) => c.floorFrom !== activeFloor(s).level && c.floorTo !== activeFloor(s).level,
      ),
      selectedNode: null,
      edgeStart: null,
      connectStart: null,
      pendingPoint: null,
      measurePoints: [],
      measureHover: null,
      validationIssues: null,
    })),

  // ---- cross-floor connections ----
  setConnectStart: (connectStart) => set({ connectStart }),

  addConnection: ({ kind, accessible, rise_m, steps, length_m }) => {
    const state = get()
    const start = state.connectStart
    const target = state.selectedNode
    if (!start || !target) return null
    const targetFloor = activeFloor(state)
    if (start.floorId === targetFloor.id) return null // must span two floors
    const dup = state.connections.find(
      (c) =>
        (c.from === start.id && c.to === target.id) ||
        (c.from === target.id && c.to === start.id),
    )
    if (dup) return null
    const conn: FloorConnection = {
      id: `conn_${Date.now()}`,
      kind,
      accessible,
      from: start.id,
      to: target.id,
      floorFrom: start.level,
      floorTo: targetFloor.level,
      rise_m,
      steps,
      length_m,
    }
    set({ connections: [...state.connections, conn], connectStart: null })
    return conn
  },

  editConnection: (id, patch) =>
    set((s) => ({ connections: s.connections.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  deleteConnection: (id) => set((s) => ({ connections: s.connections.filter((c) => c.id !== id) })),
  setRoutingProfiles: (routingProfiles) => set({ routingProfiles }),

  // ---- transform / scene ----
  setFloorLock: (floorLock) => set({ floorLock }),
  setFloorHeightViewer: (floorHeightViewer) => set((s) => withActiveFloor(s, { floorHeightViewer })),
  setTransform: (t) =>
    set((s) => {
      const cur = s.transform
      const transform: Transform = {
        ...cur,
        ...t,
        alignQInv:
          t.alignQ !== undefined
            ? t.alignQ
              ? t.alignQ.clone().invert()
              : null
            : cur.alignQInv,
      }
      return withActiveFloor(s, { transform })
    }),
  setModelLoaded: (modelLoaded) => set({ modelLoaded }),
  setStatus: (statusText) => set({ statusText }),

  setPointCloud: (cloud) =>
    set((s) => ({
      floorClouds: { ...s.floorClouds, [s.activeFloorId]: cloud },
      ...cloudMirror(cloud),
    })),

  // ---- secondary clouds (alignment scaffolding) ----
  addSecondaryCloud: (data) => {
    const s = get()
    const list = s.secondaryClouds
    // Spawn offset along X (by roughly the primary's radius) so it doesn't land on top of it.
    const offset = Math.max(s.modelRadius, 2) * 1.2
    const cloud: SecondaryCloud = {
      id: uniqueId('cloud', new Set(list.map((c) => c.id))),
      name: data.name,
      geometry: data.geometry,
      hasColor: data.hasColor,
      pointSize: data.pointSize,
      modelRadius: data.modelRadius,
      transform: { position: [offset, 0, 0], quaternion: [0, 0, 0, 1], scale: 1 },
      visible: true,
      tint: SECONDARY_TINTS[list.length % SECONDARY_TINTS.length],
    }
    set({
      ...withActiveSecondaryClouds(s, [...list, cloud]),
      selectedCloudId: cloud.id,
      gizmoMode: 'translate',
    })
    return cloud
  },

  updateSecondaryCloudTransform: (id, patch) =>
    set((s) => {
      const clouds = s.secondaryClouds.map((c) =>
        c.id === id
          ? {
              ...c,
              transform: {
                ...c.transform,
                ...patch,
                // uniform scale is invariant — a scalar can never encode a non-uniform value
                scale: patch.scale !== undefined ? patch.scale : c.transform.scale,
              },
            }
          : c,
      )
      return withActiveSecondaryClouds(s, clouds)
    }),

  removeSecondaryCloud: (id) =>
    set((s) => ({
      ...withActiveSecondaryClouds(
        s,
        s.secondaryClouds.filter((c) => c.id !== id),
      ),
      selectedCloudId: s.selectedCloudId === id ? null : s.selectedCloudId,
    })),

  toggleSecondaryVisible: (id) =>
    set((s) =>
      withActiveSecondaryClouds(
        s,
        s.secondaryClouds.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c)),
      ),
    ),

  selectSecondaryCloud: (selectedCloudId) => set({ selectedCloudId }),
  setGizmoMode: (gizmoMode) => set({ gizmoMode }),

  setLoading: (isLoading) => set({ isLoading }),
  setCoordHover: (coordHover) => set({ coordHover }),
  startEdit: (editingNode) => set({ editingNode }),
  cancelEdit: () => set({ editingNode: null }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  requestFocus: () => set((s) => ({ focusRequestId: s.focusRequestId + 1 })),

  importState: ({ floors, activeFloorId, connections, routingProfiles }) =>
    set((s) => {
      const safeFloors = floors.length ? floors : [makeFloor(0, 'Planta baja', new Set())]
      const activeId = activeFloorId && safeFloors.some((f) => f.id === activeFloorId)
        ? activeFloorId
        : safeFloors[0].id
      const active = safeFloors.find((f) => f.id === activeId) ?? safeFloors[0]
      return {
        floors: safeFloors,
        activeFloorId: activeId,
        connections: connections ?? [],
        routingProfiles: routingProfiles ?? s.routingProfiles,
        floorClouds: {}, // clouds are re-loaded per floor after import
        floorSecondaryClouds: {}, // secondary clouds are a live authoring aid, re-dropped after import
        ...mirrorOf(active),
        ...cloudMirror(undefined),
        ...secondaryMirror(undefined),
        selectedCloudId: null,
        selectedNode: null,
        edgeStart: null,
        connectStart: null,
        pendingPoint: null,
        measurePoints: [],
        measureHover: null,
        validationIssues: null,
      }
    }),

  hydrateState: ({ floors, activeFloorId, connections, routingProfiles, floorClouds, floorSecondaryClouds }) =>
    set((s) => {
      const safeFloors = floors.length ? floors : [makeFloor(0, 'Planta baja', new Set())]
      const activeId = safeFloors.some((f) => f.id === activeFloorId) ? activeFloorId : safeFloors[0].id
      const active = safeFloors.find((f) => f.id === activeId) ?? safeFloors[0]
      return {
        floors: safeFloors,
        activeFloorId: activeId,
        connections,
        routingProfiles: routingProfiles ?? s.routingProfiles,
        floorClouds,
        floorSecondaryClouds,
        ...mirrorOf(active),
        ...cloudMirror(floorClouds[activeId]),
        ...secondaryMirror(floorSecondaryClouds[activeId]),
        selectedCloudId: null,
        selectedNode: null,
        edgeStart: null,
        connectStart: null,
        pendingPoint: null,
        measurePoints: [],
        measureHover: null,
        validationIssues: null,
      }
    }),

  resetAll: () => {
    const floor = makeFloor(0, 'Planta baja', new Set())
    set({
      floors: [floor],
      activeFloorId: floor.id,
      connections: [],
      routingProfiles: defaultRoutingProfiles,
      floorClouds: {},
      floorSecondaryClouds: {},
      ...mirrorOf(floor),
      ...cloudMirror(undefined),
      ...secondaryMirror(undefined),
      selectedCloudId: null,
      selectedNode: null,
      editingNode: null,
      edgeStart: null,
      connectStart: null,
      pendingPoint: null,
      measurePoints: [],
      measureHover: null,
      validationIssues: null,
      statusText: 'Todo borrado. Cargá un archivo .ply para comenzar.',
    })
  },

  // ---- calibration / measure ----
  addMeasurePoint: (p) =>
    set((s) => {
      const next = s.measurePoints.length >= 2 ? [p] : [...s.measurePoints, p]
      return { measurePoints: next }
    }),
  clearMeasure: () => set({ measurePoints: [], measureHover: null }),
  setMeasureHover: (measureHover) => set({ measureHover }),
  setMetersPerViewerUnit: (metersPerViewerUnit) =>
    set((s) => withActiveFloor(s, { metersPerViewerUnit })),

  addCalibrationSample: (realMeters) => {
    const s = get()
    if (s.measurePoints.length !== 2 || !isFinite(realMeters) || realMeters <= 0) return null
    const [pa, pb] = s.measurePoints
    const sample: CalibrationSample = {
      id: `cal_${Date.now()}`,
      a: viewerToColmap(pa.vx, pa.vy, pa.vz, s.transform),
      b: viewerToColmap(pb.vx, pb.vy, pb.vz, s.transform),
      realMeters,
    }
    const samples = [...s.calibrationSamples, sample]
    const factor = fitMetersPerViewerUnit(samples, s.transform)
    set({
      ...withActiveFloor(s, {
        calibrationSamples: samples,
        metersPerViewerUnit: factor ?? s.metersPerViewerUnit,
      }),
      measurePoints: [],
      measureHover: null,
    })
    return sample
  },

  removeCalibrationSample: (id) =>
    set((s) => {
      const samples = s.calibrationSamples.filter((c) => c.id !== id)
      return withActiveFloor(s, {
        calibrationSamples: samples,
        metersPerViewerUnit: samples.length ? fitMetersPerViewerUnit(samples, s.transform) : null,
      })
    }),

  clearCalibration: () =>
    set((s) => withActiveFloor(s, { calibrationSamples: [], metersPerViewerUnit: null })),

  // ---- anchors ----
  addAnchor: ({ label, desc }) => {
    const state = get()
    const p = state.pendingPoint
    if (!p) return null
    const resolvedLabel = label || `ANCLA-${state.anchors.length + 1}`
    const anchor: AnchorPoint = {
      id: uniqueId(slugify(resolvedLabel) || 'anchor', existingIds(state)),
      label: resolvedLabel,
      desc,
      floor: activeFloor(state).level,
      x: p.x,
      y: p.y,
      z: p.z,
    }
    set({ ...withActiveFloor(state, { anchors: [...state.anchors, anchor] }), pendingPoint: null })
    return anchor
  },

  deleteAnchor: (id) => set((s) => withActiveFloor(s, { anchors: s.anchors.filter((a) => a.id !== id) })),

  // ---- validation / misc ----
  runValidation: () => {
    const s = get()
    const issues = validateGraph({
      pois: s.pois,
      waypoints: s.waypoints,
      edges: s.edges,
      anchors: s.anchors,
      transform: s.transform,
      floorHeightViewer: s.floorHeightViewer,
      metersPerViewerUnit: s.metersPerViewerUnit,
      modelRadius: s.modelRadius,
      pointCloudGeometry: s.pointCloudGeometry,
    })
    const buildingIssues = validateBuilding({
      floors: s.floors,
      connections: s.connections,
      routingProfiles: s.routingProfiles,
      loadedFloorIds: new Set(Object.keys(s.floorClouds)),
    })
    const all = [...issues, ...buildingIssues]
    set({ validationIssues: all })
    return all
  },
  clearValidation: () => set({ validationIssues: null }),

  setMirror: (axis, v) =>
    set((s) =>
      withActiveFloor(
        s,
        axis === 'x' ? { mirrorX: v } : axis === 'y' ? { mirrorY: v } : { mirrorZ: v },
      ),
    ),

  setQrSheetOpen: (qrSheetOpen) => set({ qrSheetOpen }),
}))

export { THREE }
