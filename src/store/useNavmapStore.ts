import { create } from 'zustand'
import * as THREE from 'three'
import type {
  ColmapPos,
} from '../lib/coordTransforms'
import type {
  Edge,
  EdgeStart,
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
  addPOI: (data: { name: string; type: POIType; desc: string; floor: number }) => POI | null
  addWaypoint: (data: { label: string; floor: number }) => Waypoint | null
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

  cameraMode: 'orbit' | 'walk'
  setCameraMode: (m: 'orbit' | 'walk') => void
  focusRequestId: number
  requestFocus: () => void

  importState: (s: {
    pois: POI[]
    waypoints: Waypoint[]
    edges: Edge[]
    transform?: Partial<Transform>
    floorHeightViewer?: number
  }) => void
}

const initialTransform: Transform = {
  cx: 0,
  cy: 0,
  cz: 0,
  scale: 1,
  alignQ: null,
  alignQInv: null,
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

  setMode: (mode) => set({ mode, edgeStart: null }),
  setPendingPoint: (pendingPoint) => set({ pendingPoint }),

  addPOI: ({ name, type, desc, floor }) => {
    const p = get().pendingPoint
    if (!p) return null
    const poi: POI = {
      id: `poi_${Date.now()}`,
      name,
      type,
      desc,
      floor,
      x: p.x,
      y: p.y,
      z: p.z,
    }
    set((s) => ({ pois: [...s.pois, poi], pendingPoint: null }))
    return poi
  },

  addWaypoint: ({ label, floor }) => {
    const p = get().pendingPoint
    if (!p) return null
    const wp: Waypoint = {
      id: `wp_${Date.now()}`,
      label: label || `WP-${get().waypoints.length + 1}`,
      floor,
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
      selectedNode: null,
      edgeStart: null,
      pendingPoint: null,
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

  importState: ({ pois, waypoints, edges, transform, floorHeightViewer }) =>
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
        transform: nextTransform,
        floorHeightViewer: floorHeightViewer ?? s.floorHeightViewer,
        selectedNode: null,
        edgeStart: null,
        pendingPoint: null,
      }
    }),
}))

export { THREE }
