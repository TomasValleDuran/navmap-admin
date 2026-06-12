import * as THREE from 'three'
import { adaptivePointSize, parsePLY } from './plyParser'
import { filterIsolatedPoints } from './outlierFilter'
import { prepareModelGeometry } from './prepareModel'

export interface LoadedModel {
  geometry: THREE.BufferGeometry
  hasColor: boolean
  pointSize: number
  count: number
  cx: number
  cy: number
  cz: number
  scale: number
  alignQ: THREE.Quaternion
  alignQInv: THREE.Quaternion
  floorHeightViewer: number
  modelRadius: number
  removedOutliers: number
}

export function buildModelFromBuffer(buffer: ArrayBuffer): LoadedModel {
  const parsed = parsePLY(buffer)
  const { pos, col, count, removed } = filterIsolatedPoints(parsed.pos, parsed.col, parsed.count)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  if (parsed.hasC && col.length === pos.length) {
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  }
  const info = prepareModelGeometry(geometry, count)
  return {
    geometry,
    hasColor: parsed.hasC,
    pointSize: adaptivePointSize(count),
    count,
    removedOutliers: removed,
    ...info,
  }
}

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = () => reject(reader.error)
    reader.readAsArrayBuffer(file)
  })
}
