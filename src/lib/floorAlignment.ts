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
