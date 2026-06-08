import * as THREE from 'three'
import { applyQuaternionToPositions, computeFloorAlignment, detectFloorHeightViewer } from './floorAlignment'

export interface PreparedModelInfo {
  scale: number
  cx: number
  cy: number
  cz: number
  alignQ: THREE.Quaternion
  alignQInv: THREE.Quaternion
  floorHeightViewer: number
  modelRadius: number
}

export function prepareModelGeometry(geo: THREE.BufferGeometry, count: number): PreparedModelInfo {
  geo.computeBoundingBox()
  const bbox = geo.boundingBox!
  const center = new THREE.Vector3()
  bbox.getCenter(center)
  const cx = center.x, cy = center.y, cz = center.z
  geo.translate(-cx, -cy, -cz)

  const pos = geo.attributes.position.array as Float32Array
  const alignQ = computeFloorAlignment(pos, count)
  applyQuaternionToPositions(pos, count, alignQ)
  geo.attributes.position.needsUpdate = true
  geo.computeBoundingBox()

  const size = new THREE.Vector3()
  geo.boundingBox!.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z)
  const scale = 8 / maxDim
  geo.scale(scale, -scale, scale)
  geo.computeBoundingBox()

  const sz = new THREE.Vector3()
  geo.boundingBox!.getSize(sz)
  const modelRadius = Math.max(sz.x, sz.y, sz.z) * 0.5

  const floorHeightViewer = detectFloorHeightViewer(geo.attributes.position.array as Float32Array, count)

  return {
    scale,
    cx,
    cy,
    cz,
    alignQ,
    alignQInv: alignQ.clone().invert(),
    floorHeightViewer,
    modelRadius,
  }
}
