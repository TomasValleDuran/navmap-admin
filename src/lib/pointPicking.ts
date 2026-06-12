import * as THREE from 'three'

/**
 * Picks a point from raycaster hits against a point cloud, resisting the
 * floating noise points typical of COLMAP reconstructions.
 *
 * Plain `hits[0]` returns the point closest to the camera inside the ray
 * threshold cylinder, so a lone stray point hovering between the camera and
 * the wall the user aimed at wins. Instead we group hits into depth clusters
 * and pick from the densest one (the actual surface): within that cluster the
 * point nearest the ray axis is what the user aimed at.
 */
export function pickRobustPoint(
  hits: THREE.Intersection[],
  clusterWidth: number,
): THREE.Vector3 | null {
  const valid = hits.filter((h) => h.point)
  if (valid.length === 0) return null
  if (valid.length === 1) return valid[0].point.clone()

  const sorted = [...valid].sort((a, b) => a.distance - b.distance)

  let bestStart = 0
  let bestEnd = 0
  let bestCount = 0
  let j = 0
  for (let i = 0; i < sorted.length; i++) {
    if (j < i) j = i
    while (j + 1 < sorted.length && sorted[j + 1].distance - sorted[i].distance <= clusterWidth) j++
    const count = j - i + 1
    // strictly greater: on ties keep the nearer cluster
    if (count > bestCount) {
      bestCount = count
      bestStart = i
      bestEnd = j
    }
  }

  let best = sorted[bestStart]
  for (let k = bestStart; k <= bestEnd; k++) {
    const h = sorted[k]
    const dBest = best.distanceToRay ?? 0
    const dCur = h.distanceToRay ?? 0
    if (dCur < dBest) best = h
  }
  return best.point.clone()
}

export interface ModelPickOptions {
  /** Smaller cylinder for deliberate clicks (measure/anchors). */
  precise?: boolean
}

/**
 * Raycasts the point-cloud group with a threshold scaled to the model size
 * and resolves the hit via `pickRobustPoint`. Falls back to a wider threshold
 * when the precise pass finds nothing (sparse clouds).
 */
export function pickPointOnModel(
  raycaster: THREE.Raycaster,
  modelGroup: THREE.Object3D,
  modelRadius: number,
  opts: ModelPickOptions = {},
): THREE.Vector3 | null {
  const r = Math.max(1, modelRadius)
  const thresholds = opts.precise ? [r * 0.008, r * 0.02] : [r * 0.015]
  const clusterWidth = r * 0.03
  const prev = raycaster.params.Points
  try {
    for (const threshold of thresholds) {
      raycaster.params.Points = { threshold }
      const hits = raycaster.intersectObjects(modelGroup.children, true)
      const point = pickRobustPoint(hits, clusterWidth)
      if (point) return point
    }
    return null
  } finally {
    raycaster.params.Points = prev
  }
}
