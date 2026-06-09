import * as THREE from 'three'
import {
  applyQuaternionToPositions,
  computeRobustStats,
  computeFloorAlignmentMasked,
  detectFloorHeightMasked,
} from './floorAlignment'

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

const TARGET_FIT = 8
const TRIM_PERCENTILE = 0.01

export function prepareModelGeometry(geo: THREE.BufferGeometry, count: number): PreparedModelInfo {
  const pos = geo.attributes.position.array as Float32Array

  const stats = computeRobustStats(pos, count, TRIM_PERCENTILE)
  const [cx, cy, cz] = stats.median

  geo.translate(-cx, -cy, -cz)

  const alignQ = computeFloorAlignmentMasked(pos, count, stats.inlierMask)
  applyQuaternionToPositions(pos, count, alignQ)
  geo.attributes.position.needsUpdate = true

  const statsAfter = computeRobustStats(pos, count, TRIM_PERCENTILE)
  const fullExtent = Math.max(
    statsAfter.half[0],
    statsAfter.half[1],
    statsAfter.half[2],
  ) * 2
  const scale = fullExtent > 1e-9 ? TARGET_FIT / fullExtent : 1

  geo.scale(scale, scale, scale)
  geo.computeBoundingBox()

  const finalStats = computeRobustStats(pos, count, TRIM_PERCENTILE)
  const modelRadius = Math.hypot(
    finalStats.half[0],
    finalStats.half[1],
    finalStats.half[2],
  )

  const floorHeightViewer = detectFloorHeightMasked(pos, count, finalStats.inlierMask)

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
