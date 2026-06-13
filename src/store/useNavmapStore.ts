import { create } from 'zustand'
import * as THREE from 'three'
import type {
  ColmapPos,
} from '../lib/coordTransforms'
import { viewerToColmap } from '../lib/coordTransforms'
import { slugify, uniqueId } from '../lib/ids'
import { fitMetersPerViewerUnit } from '../lib/calibration'
import { validateGraph, type ValidationIssue } from '../lib/graphValidation'
import type {
  AnchorPoint,
  CalibrationSample,
  Edge,
  EdgeStart,
  MeasurePoint,
  Mode,
  NodeType,
  PendingPoint,
  POI,
  POIType,
  SelectedNode,
  Transform,
  Waypoint,
} from '../types/navmap'

interface NavmapState {
  mode: Mode
  pois: POI[]
  waypoints: Waypoint[]
  edges: Edge[]
  pendingPoint: PendingPoint | null
  edgeStart: EdgeStart | null
  selectedNode: SelectedNode | null
  modelLoaded: boolean
  floorLock: boolean
  floorHeightViewer: number
  transform: Transform
  statusText: string

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

  setFloorLock: (v: boolean) => void
  setFloorHeightViewer: (v: number) => void
  setTransform: (t: Partial<Transform>) => void
  setModelLoaded: (v: boolean) => void
  setStatus: (text: string) => void

  pointCloudGeometry: THREE.BufferGeometry | null
  pointCloudHasColor: boolean
  pointCloudPointSize: number
  modelRadius: number
  setPointCloud: (data: {
    geometry: THREE.BufferGeometry
    hasColor: boolean
    pointSize: number
    modelRadius: number
  }) => void

  isLoading: boolean
  setLoading: (v: boolean) => void

  coordHover: ColmapPos | null
  setCoordHover: (c: ColmapPos | null) => void

  editingNode: SelectedNode | null
  startEdit: (n: SelectedNode) => void
  cancelEdit: () => void

  cameraMode: 'orbit' | 'walk' | 'plan'
  setCameraMode: (m: 'orbit' | 'walk' | 'plan') => void
  focusRequestId: number
  requestFocus: () => void

  importState: (s: {
    pois: POI[]
    waypoints: Waypoint[]
    edges: Edge[]
    anchors?: AnchorPoint[]
    calibrationSamples?: CalibrationSample[]
    transform?: Partial<Transform>
    floorHeightViewer?: number
    metersPerViewerUnit?: number | null
    mirrorX?: boolean
    mirrorY?: boolean
    mirrorZ?: boolean
  }) => void

  measurePoints: MeasurePoint[]
  measureHover: MeasurePoint | null
  metersPerViewerUnit: number | null
  calibrationSamples: CalibrationSample[]
  addMeasurePoint: (p: MeasurePoint) => void
  clearMeasure: () => void
  setMeasureHover: (p: MeasurePoint | null) => void
  setMetersPerViewerUnit: (v: number | null) => void
  addCalibrationSample: (realMeters: number) => CalibrationSample | null
  removeCalibrationSample: (id: string) => void
  clearCalibration: () => void

  anchors: AnchorPoint[]
  addAnchor: (data: { label: string; desc: string; floor: number }) => AnchorPoint | null
  deleteAnchor: (id: string) => void

  validationIssues: ValidationIssue[] | null
  runValidation: () => ValidationIssue[]
  clearValidation: () => void

  mirrorX: boolean
  mirrorY: boolean
  mirrorZ: boolean
  setMirror: (axis: 'x' | 'y' | 'z', v: boolean) => void

  qrSheetOpen: boolean
  setQrSheetOpen: (v: boolean) => void
}

const initialTransform: Transform = {
  cx: 0,
  cy: 0,
  cz: 0,
  scale: 1,
  alignQ: null,
  alignQInv: null,
}

/** Every ID currently in use — node IDs must be unique across POIs, waypoints and anchors. */
function existingIds(state: NavmapState): Set<string> {
  return new Set<string>([
    ...state.pois.map((p) => p.id),
    ...state.waypoints.map((w) => w.id),
    ...state.anchors.map((a) => a.id),
  ])
}

function nodeCoords(state: NavmapState, ref: SelectedNode): { x: number; y: number; z: number } | null {
  if (ref.nodeType === 'poi') {
    const n = state.pois.find((p) => p.id === ref.id)
    return n ? { x: n.x, y: n.y, z: n.z } : null
  }
  const n = state.waypoints.find((w) => w.id === ref.id)
  return n ? { x: n.x, y: n.y, z: n.z } : null
}

export const useNavmapStore = create<NavmapState>((set, get) => ({
  mode: 'view',
  pois: [],
  waypoints: [],
  edges: [],
  pendingPoint: null,
  edgeStart: null,
  selectedNode: null,
  modelLoaded: false,
  floorLock: false,
  floorHeightViewer: 0,
  transform: initialTransform,
  statusText: 'Cargá un archivo .ply para comenzar.',
  pointCloudGeometry: null,
  pointCloudHasColor: false,
  pointCloudPointSize: 0.0012,
  modelRadius: 4,
  isLoading: false,
  coordHover: null,
  editingNode: null,
  cameraMode: 'orbit',
  focusRequestId: 0,
  measurePoints: [],
  measureHover: null,
  metersPerViewerUnit: null,
  calibrationSamples: [],
  anchors: [],
  validationIssues: null,
  mirrorX: true,
  mirrorY: true,
  mirrorZ: false,

  setMirror: (axis, v) =>
    set(
      axis === 'x'
        ? { mirrorX: v }
        : axis === 'y'
          ? { mirrorY: v }
          : { mirrorZ: v },
    ),

  qrSheetOpen: false,
  setQrSheetOpen: (qrSheetOpen) => set({ qrSheetOpen }),

  setMode: (mode) =>
    set((s) => ({
      mode,
      edgeStart: null,
      measurePoints: mode === 'measure' ? s.measurePoints : [],
      measureHover: null,
    })),

  addMeasurePoint: (p) =>
    set((s) => {
      const next = s.measurePoints.length >= 2 ? [p] : [...s.measurePoints, p]
      return { measurePoints: next }
    }),
  clearMeasure: () => set({ measurePoints: [], measureHover: null }),
  setMeasureHover: (measureHover) => set({ measureHover }),
  setMetersPerViewerUnit: (metersPerViewerUnit) => set({ metersPerViewerUnit }),

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
      calibrationSamples: samples,
      metersPerViewerUnit: factor ?? s.metersPerViewerUnit,
      measurePoints: [],
      measureHover: null,
    })
    return sample
  },

  removeCalibrationSample: (id) =>
    set((s) => {
      const samples = s.calibrationSamples.filter((c) => c.id !== id)
      return {
        calibrationSamples: samples,
        metersPerViewerUnit: samples.length
          ? fitMetersPerViewerUnit(samples, s.transform)
          : null,
      }
    }),

  clearCalibration: () => set({ calibrationSamples: [], metersPerViewerUnit: null }),

  addAnchor: ({ label, desc, floor }) => {
    const state = get()
    const p = state.pendingPoint
    if (!p) return null
    const resolvedLabel = label || `ANCLA-${state.anchors.length + 1}`
    const anchor: AnchorPoint = {
      id: uniqueId(slugify(resolvedLabel) || 'anchor', existingIds(state)),
      label: resolvedLabel,
      desc,
      floor,
      x: p.x,
      y: p.y,
      z: p.z,
    }
    set((s) => ({ anchors: [...s.anchors, anchor], pendingPoint: null }))
    return anchor
  },

  deleteAnchor: (id) => set((s) => ({ anchors: s.anchors.filter((a) => a.id !== id) })),

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
    set({ validationIssues: issues })
    return issues
  },
  clearValidation: () => set({ validationIssues: null }),

  setPendingPoint: (pendingPoint) => set({ pendingPoint }),

  addPOI: ({ name, type, desc, floor, qr }) => {
    const state = get()
    const p = state.pendingPoint
    if (!p) return null
    const poi: POI = {
      id: uniqueId(slugify(name) || 'poi', existingIds(state)),
      name,
      type,
      desc,
      floor,
      qr: qr?.trim() || undefined,
      x: p.x,
      y: p.y,
      z: p.z,
    }
    set((s) => ({ pois: [...s.pois, poi], pendingPoint: null }))
    return poi
  },

  addWaypoint: ({ label, floor, qr }) => {
    const state = get()
    const p = state.pendingPoint
    if (!p) return null
    const resolvedLabel = label || `WP-${state.waypoints.length + 1}`
    const wp: Waypoint = {
      id: uniqueId(slugify(resolvedLabel) || 'wp', existingIds(state)),
      label: resolvedLabel,
      floor,
      qr: qr?.trim() || undefined,
      x: p.x,
      y: p.y,
      z: p.z,
    }
    set((s) => ({ waypoints: [...s.waypoints, wp], pendingPoint: null }))
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
    set((s) => ({ edges: [...s.edges, edge], edgeStart: null }))
    return edge
  },

  setEdgeStart: (edgeStart) => set({ edgeStart }),
  selectNode: (selectedNode) => set({ selectedNode }),

  editPOI: (id, patch) =>
    set((s) => ({ pois: s.pois.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
  editWaypoint: (id, patch) =>
    set((s) => ({
      waypoints: s.waypoints.map((w) => (w.id === id ? { ...w, ...patch } : w)),
    })),

  deleteNode: (id, nodeType) => {
    set((s) => {
      const pois = nodeType === 'poi' ? s.pois.filter((p) => p.id !== id) : s.pois
      const waypoints = nodeType === 'waypoint' ? s.waypoints.filter((w) => w.id !== id) : s.waypoints
      const edges = s.edges.filter((e) => e.from !== id && e.to !== id)
      const selectedNode = s.selectedNode?.id === id ? null : s.selectedNode
      return { pois, waypoints, edges, selectedNode }
    })
  },

  deleteEdge: (id) => set((s) => ({ edges: s.edges.filter((e) => e.id !== id) })),

  clearAll: () =>
    set({
      pois: [],
      waypoints: [],
      edges: [],
      anchors: [],
      selectedNode: null,
      edgeStart: null,
      pendingPoint: null,
      measurePoints: [],
      measureHover: null,
      validationIssues: null,
    }),

  setFloorLock: (floorLock) => set({ floorLock }),
  setFloorHeightViewer: (floorHeightViewer) => set({ floorHeightViewer }),
  setTransform: (t) =>
    set((s) => ({
      transform: {
        ...s.transform,
        ...t,
        alignQInv:
          t.alignQ !== undefined
            ? t.alignQ
              ? t.alignQ.clone().invert()
              : null
            : s.transform.alignQInv,
      },
    })),
  setModelLoaded: (modelLoaded) => set({ modelLoaded }),
  setStatus: (statusText) => set({ statusText }),

  setPointCloud: ({ geometry, hasColor, pointSize, modelRadius }) =>
    set({
      pointCloudGeometry: geometry,
      pointCloudHasColor: hasColor,
      pointCloudPointSize: pointSize,
      modelRadius,
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setCoordHover: (coordHover) => set({ coordHover }),
  startEdit: (editingNode) => set({ editingNode }),
  cancelEdit: () => set({ editingNode: null }),
  setCameraMode: (cameraMode) => set({ cameraMode }),
  requestFocus: () => set((s) => ({ focusRequestId: s.focusRequestId + 1 })),

  importState: ({ pois, waypoints, edges, anchors, calibrationSamples, transform, floorHeightViewer, metersPerViewerUnit, mirrorX, mirrorY, mirrorZ }) =>
    set((s) => {
      const nextTransform: Transform = transform
        ? {
            ...s.transform,
            ...transform,
            alignQInv:
              transform.alignQ !== undefined
                ? transform.alignQ
                  ? transform.alignQ.clone().invert()
                  : null
                : s.transform.alignQInv,
          }
        : s.transform
      return {
        pois,
        waypoints,
        edges,
        anchors: anchors ?? [],
        calibrationSamples: calibrationSamples ?? [],
        transform: nextTransform,
        floorHeightViewer: floorHeightViewer ?? s.floorHeightViewer,
        metersPerViewerUnit:
          metersPerViewerUnit !== undefined ? metersPerViewerUnit : s.metersPerViewerUnit,
        mirrorX: mirrorX !== undefined ? mirrorX : s.mirrorX,
        mirrorY: mirrorY !== undefined ? mirrorY : s.mirrorY,
        mirrorZ: mirrorZ !== undefined ? mirrorZ : s.mirrorZ,
        selectedNode: null,
        edgeStart: null,
        pendingPoint: null,
        measurePoints: [],
        measureHover: null,
        validationIssues: null,
      }
    }),
}))

export { THREE }
