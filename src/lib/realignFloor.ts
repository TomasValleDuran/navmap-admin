import * as THREE from 'three'
import {
  applyQuaternionToPositions,
  computeFloorAlignment,
  detectFloorHeightViewer,
} from './floorAlignment'
import type { Transform } from '../types/navmap'

interface ReturnInfo {
  alignQ: THREE.Quaternion
  alignQInv: THREE.Quaternion
  floorHeightViewer: number
}

const _v = new THREE.Vector3()

export function realignFloorInPlace(
  geometry: THREE.BufferGeometry,
  transform: Transform,
): ReturnInfo {
  const pos = geometry.attributes.position.array as Float32Array
  const count = pos.length / 3
  const invs = 1 / transform.scale

  for (let i = 0; i < count; i++) {
    _v.set(pos[i * 3] * invs, -pos[i * 3 + 1] * invs, pos[i * 3 + 2] * invs)
    if (transform.alignQInv) _v.applyQuaternion(transform.alignQInv)
    pos[i * 3] = _v.x
    pos[i * 3 + 1] = _v.y
    pos[i * 3 + 2] = _v.z
  }

  const alignQ = computeFloorAlignment(pos, count)
  applyQuaternionToPositions(pos, count, alignQ)
  geometry.scale(transform.scale, -transform.scale, transform.scale)
  geometry.attributes.position.needsUpdate = true
  geometry.computeBoundingBox()
  const floorHeightViewer = detectFloorHeightViewer(pos, count)
  return { alignQ, alignQInv: alignQ.clone().invert(), floorHeightViewer }
}

export function nudgeFloorTilt(
  geometry: THREE.BufferGeometry,
  transform: Transform,
  axis: 'x' | 'z',
  degrees: number,
): ReturnInfo {
  const pos = geometry.attributes.position.array as Float32Array
  const count = pos.length / 3
  const invs = 1 / transform.scale

  for (let i = 0; i < count; i++) {
    _v.set(pos[i * 3] * invs, -pos[i * 3 + 1] * invs, pos[i * 3 + 2] * invs)
    if (transform.alignQInv) _v.applyQuaternion(transform.alignQInv)
    pos[i * 3] = _v.x
    pos[i * 3 + 1] = _v.y
    pos[i * 3 + 2] = _v.z
  }

  const axisVec = axis === 'x' ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 0, 1)
  const nudge = new THREE.Quaternion().setFromAxisAngle(axisVec, (degrees * Math.PI) / 180)
  const current = transform.alignQ ?? new THREE.Quaternion()
  const alignQ = nudge.clone().multiply(current).normalize()

  applyQuaternionToPositions(pos, count, alignQ)
  geometry.scale(transform.scale, -transform.scale, transform.scale)
  geometry.attributes.position.needsUpdate = true
  geometry.computeBoundingBox()
  const floorHeightViewer = detectFloorHeightViewer(pos, count)
  return { alignQ, alignQInv: alignQ.clone().invert(), floorHeightViewer }
}
