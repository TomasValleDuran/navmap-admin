import * as THREE from 'three'
import type { POIType, Transform } from '../types/navmap'

export const POI_COLORS: Record<POIType, number> = {
  bathroom: 0x4f8ef7,
  elevator: 0x9b72e8,
  stairs: 0xf0a030,
  exit: 0x34c98a,
  classroom: 0xe05555,
  office: 0xe8a84f,
  reception: 0xec4899,
  lab: 0x40d4c4,
  other: 0x566a87,
}

export const POI_ICONS: Record<POIType, string> = {
  bathroom: '🚻',
  elevator: '🛗',
  stairs: '🪜',
  exit: '🚪',
  classroom: '🏛',
  office: '🏢',
  reception: '🛎',
  lab: '🔬',
  other: '📌',
}

export const WAYPOINT_COLOR = 0x34c98a
export const EDGE_COLOR = 0xf0a030

export interface ViewerPos {
  vx: number
  vy: number
  vz: number
}

export interface ColmapPos {
  x: number
  y: number
  z: number
}

const _tmp = new THREE.Vector3()

export function viewerToColmap(vx: number, vy: number, vz: number, t: Transform): ColmapPos {
  _tmp.set(vx / t.scale, -vy / t.scale, vz / t.scale)
  if (t.alignQInv) _tmp.applyQuaternion(t.alignQInv)
  return { x: _tmp.x + t.cx, y: _tmp.y + t.cy, z: _tmp.z + t.cz }
}

export function colmapToViewer(x: number, y: number, z: number, t: Transform): ViewerPos {
  _tmp.set(x - t.cx, y - t.cy, z - t.cz)
  if (t.alignQ) _tmp.applyQuaternion(t.alignQ)
  return { vx: _tmp.x * t.scale, vy: -_tmp.y * t.scale, vz: _tmp.z * t.scale }
}

export function markerR(base: number, scale: number): number {
  const r = base / Math.max(0.05, scale)
  return Math.max(0.012, Math.min(0.35, r * 0.007))
}

export function markerDisplayY(vy: number, radius: number, floorHeightViewer: number, scale: number): number {
  const eps = Math.max(radius * 0.75, 0.008 / Math.max(0.05, scale))
  if (Math.abs(vy - floorHeightViewer) < eps) {
    return floorHeightViewer + radius * 1.25
  }
  return vy
}

export function edgeTubeRadius(scale: number): number {
  const base = 0.025 / Math.max(0.05, scale)
  return Math.max(0.005, Math.min(0.06, base * 0.06))
}

export function edgeMarkerRadius(nodeType: 'poi' | 'waypoint', scale: number): number {
  return markerR(nodeType === 'poi' ? 0.9 : 0.65, scale)
}
