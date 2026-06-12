import * as THREE from 'three'

export type Mode = 'view' | 'poi' | 'waypoint' | 'edge' | 'select' | 'measure' | 'anchor'

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
  x: number
  y: number
  z: number
}

export interface Waypoint {
  id: string
  label: string
  floor: number
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

