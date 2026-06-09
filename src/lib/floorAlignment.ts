import * as THREE from 'three'

type Mat3 = number[][]
type Vec3 = [number, number, number]

function mat3MultVec(m: Mat3, v: Vec3): Vec3 {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ]
}

function invert3x3(m: Mat3): Mat3 | null {
  const a = m[0][0], b = m[0][1], c = m[0][2]
  const d = m[1][0], e = m[1][1], f = m[1][2]
  const g = m[2][0], h = m[2][1], i = m[2][2]
  const det = a * (e * i - f * h) - b * (d * i - f * g) + c * (d * h - e * g)
  if (Math.abs(det) < 1e-12) return null
  const inv = 1 / det
  return [
    [(e * i - f * h) * inv, (c * h - b * i) * inv, (b * f - c * e) * inv],
    [(f * g - d * i) * inv, (a * i - c * g) * inv, (c * d - a * f) * inv],
    [(d * h - e * g) * inv, (b * g - a * h) * inv, (a * e - b * d) * inv],
  ]
}

export function smallestEigenvector(cov: Mat3): Vec3 {
  const inv = invert3x3(cov)
  if (!inv) return [0, 1, 0]
  let v: Vec3 = [0, 1, 0]
  for (let k = 0; k < 28; k++) {
    const w = mat3MultVec(inv, v)
    const len = Math.hypot(w[0], w[1], w[2]) || 1
    v = [w[0] / len, w[1] / len, w[2] / len]
  }
  return v
}

export function applyQuaternionToPositions(
  arr: ArrayLike<number> & { [i: number]: number },
  count: number,
  q: THREE.Quaternion,
): void {
  const v = new THREE.Vector3()
  for (let i = 0; i < count; i++) {
    v.set(arr[i * 3], arr[i * 3 + 1], arr[i * 3 + 2])
    v.applyQuaternion(q)
    ;(arr as number[])[i * 3] = v.x
    ;(arr as number[])[i * 3 + 1] = v.y
    ;(arr as number[])[i * 3 + 2] = v.z
  }
}

export function computeFloorAlignment(
  pos: ArrayLike<number>,
  count: number,
): THREE.Quaternion {
  const stride = Math.max(1, Math.floor(count / 5000))
  let mx = 0, my = 0, mz = 0, npts = 0
  for (let i = 0; i < count; i += stride) {
    mx += pos[i * 3]
    my += pos[i * 3 + 1]
    mz += pos[i * 3 + 2]
    npts++
  }
  mx /= npts; my /= npts; mz /= npts
  let cxx = 0, cxy = 0, cxz = 0, cyy = 0, cyz = 0, czz = 0
  for (let i = 0; i < count; i += stride) {
    const x = pos[i * 3] - mx
    const y = pos[i * 3 + 1] - my
    const z = pos[i * 3 + 2] - mz
    cxx += x * x; cxy += x * y; cxz += x * z
    cyy += y * y; cyz += y * z; czz += z * z
  }
  const ev = smallestEigenvector([
    [cxx, cxy, cxz],
    [cxy, cyy, cyz],
    [cxz, cyz, czz],
  ])
  const nvec = new THREE.Vector3(ev[0], ev[1], ev[2]).normalize()
  if (nvec.y < 0) nvec.negate()
  const up = new THREE.Vector3(0, 1, 0)
  if (Math.abs(nvec.dot(up)) > 0.999) return new THREE.Quaternion()
  return new THREE.Quaternion().setFromUnitVectors(nvec, up)
}

export function detectFloorHeightViewer(pos: ArrayLike<number>, count: number): number {
  const stride = Math.max(1, Math.floor(count / 8000))
  const ys: number[] = []
  for (let i = 0; i < count; i += stride) ys.push(pos[i * 3 + 1])
  ys.sort((a, b) => a - b)
  return ys[Math.floor(ys.length * 0.08)] ?? 0
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(q * sorted.length)))
  return sorted[idx]
}

export interface RobustStats {
  median: [number, number, number]
  half: [number, number, number]
  inlierMask: Uint8Array
  inlierCount: number
}

/**
 * Median-centered, percentile-trimmed stats.
 * - center = per-axis median
 * - half[i] = (q_hi - q_lo) / 2 along each axis (used as half-extent for scaling)
 * - inlierMask[k] = 1 if point k is inside the trimmed bbox on all axes
 */
export function computeRobustStats(
  pos: ArrayLike<number>,
  count: number,
  trim = 0.01,
): RobustStats {
  const stride = Math.max(1, Math.floor(count / 12000))
  const xs: number[] = []
  const ys: number[] = []
  const zs: number[] = []
  for (let i = 0; i < count; i += stride) {
    xs.push(pos[i * 3])
    ys.push(pos[i * 3 + 1])
    zs.push(pos[i * 3 + 2])
  }
  xs.sort((a, b) => a - b)
  ys.sort((a, b) => a - b)
  zs.sort((a, b) => a - b)
  const median: [number, number, number] = [
    quantile(xs, 0.5),
    quantile(ys, 0.5),
    quantile(zs, 0.5),
  ]
  const lo: [number, number, number] = [
    quantile(xs, trim),
    quantile(ys, trim),
    quantile(zs, trim),
  ]
  const hi: [number, number, number] = [
    quantile(xs, 1 - trim),
    quantile(ys, 1 - trim),
    quantile(zs, 1 - trim),
  ]
  const half: [number, number, number] = [
    (hi[0] - lo[0]) * 0.5,
    (hi[1] - lo[1]) * 0.5,
    (hi[2] - lo[2]) * 0.5,
  ]
  const mask = new Uint8Array(count)
  let n = 0
  for (let i = 0; i < count; i++) {
    const x = pos[i * 3]
    const y = pos[i * 3 + 1]
    const z = pos[i * 3 + 2]
    if (
      x >= lo[0] && x <= hi[0] &&
      y >= lo[1] && y <= hi[1] &&
      z >= lo[2] && z <= hi[2]
    ) {
      mask[i] = 1
      n++
    }
  }
  return { median, half, inlierMask: mask, inlierCount: n }
}

/** Like computeFloorAlignment but uses only flagged inlier points. */
export function computeFloorAlignmentMasked(
  pos: ArrayLike<number>,
  count: number,
  mask: Uint8Array,
): THREE.Quaternion {
  const stride = Math.max(1, Math.floor(count / 5000))
  let mx = 0, my = 0, mz = 0, npts = 0
  for (let i = 0; i < count; i += stride) {
    if (!mask[i]) continue
    mx += pos[i * 3]
    my += pos[i * 3 + 1]
    mz += pos[i * 3 + 2]
    npts++
  }
  if (npts < 50) return new THREE.Quaternion()
  mx /= npts; my /= npts; mz /= npts
  let cxx = 0, cxy = 0, cxz = 0, cyy = 0, cyz = 0, czz = 0
  for (let i = 0; i < count; i += stride) {
    if (!mask[i]) continue
    const x = pos[i * 3] - mx
    const y = pos[i * 3 + 1] - my
    const z = pos[i * 3 + 2] - mz
    cxx += x * x; cxy += x * y; cxz += x * z
    cyy += y * y; cyz += y * z; czz += z * z
  }
  const ev = smallestEigenvector([
    [cxx, cxy, cxz],
    [cxy, cyy, cyz],
    [cxz, cyz, czz],
  ])
  const nvec = new THREE.Vector3(ev[0], ev[1], ev[2]).normalize()
  if (nvec.y < 0) nvec.negate()
  const up = new THREE.Vector3(0, 1, 0)
  if (Math.abs(nvec.dot(up)) > 0.999) return new THREE.Quaternion()
  return new THREE.Quaternion().setFromUnitVectors(nvec, up)
}

/**
 * Floor height after alignment, using only inliers.
 * Picks the percentile of Y opposite the side where most mass sits, so
 * regardless of which way the alignment quaternion oriented the cloud the
 * floor surface (the sparse extreme away from the room) is detected.
 */
export function detectFloorHeightMasked(
  pos: ArrayLike<number>,
  count: number,
  mask: Uint8Array,
): number {
  const stride = Math.max(1, Math.floor(count / 8000))
  const ys: number[] = []
  let sumY = 0
  for (let i = 0; i < count; i += stride) {
    if (!mask[i]) continue
    const y = pos[i * 3 + 1]
    ys.push(y)
    sumY += y
  }
  if (ys.length === 0) return 0
  ys.sort((a, b) => a - b)
  const meanY = sumY / ys.length
  const q = meanY >= 0 ? 0.08 : 0.92
  return ys[Math.floor(ys.length * q)] ?? 0
}
