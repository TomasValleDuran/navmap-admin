const MIN_NEIGHBORS = 4

export interface FilterResult {
  pos: ArrayLike<number>
  col: ArrayLike<number>
  count: number
  removed: number
}

/**
 * Removes the isolated floating points typical of COLMAP clouds via a voxel
 * occupancy test: a point survives if its 3×3×3 voxel neighborhood holds at
 * least MIN_NEIGHBORS points. Conservative on purpose — sparse but real
 * geometry (thin railings, distant walls) clusters along surfaces and easily
 * clears the threshold, while lone floaters in mid-air do not.
 */
export function filterIsolatedPoints(
  pos: ArrayLike<number>,
  col: ArrayLike<number>,
  count: number,
): FilterResult {
  if (count < 1000) return { pos, col, count, removed: 0 }

  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (let i = 0; i < count; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2]
    if (x < minX) minX = x
    if (x > maxX) maxX = x
    if (y < minY) minY = y
    if (y > maxY) maxY = y
    if (z < minZ) minZ = z
    if (z > maxZ) maxZ = z
  }
  const extent = Math.max(maxX - minX, maxY - minY, maxZ - minZ)
  if (!isFinite(extent) || extent < 1e-9) return { pos, col, count, removed: 0 }

  // Cloud points lie on surfaces (~2D), so density scales with grid². Size the
  // grid so a uniformly covered surface puts ~25 points per voxel — even
  // regions 10× sparser then clear MIN_NEIGHBORS comfortably.
  const grid = Math.max(32, Math.min(256, Math.round(Math.sqrt(count / 25))))
  const inv = grid / (extent * 1.0001)

  const voxelOf = (i: number): number => {
    const ix = Math.min(grid - 1, Math.floor((pos[i * 3] - minX) * inv))
    const iy = Math.min(grid - 1, Math.floor((pos[i * 3 + 1] - minY) * inv))
    const iz = Math.min(grid - 1, Math.floor((pos[i * 3 + 2] - minZ) * inv))
    return (ix * grid + iy) * grid + iz
  }

  const counts = new Map<number, number>()
  for (let i = 0; i < count; i++) {
    const k = voxelOf(i)
    counts.set(k, (counts.get(k) ?? 0) + 1)
  }

  const keep = new Uint8Array(count)
  let kept = 0
  for (let i = 0; i < count; i++) {
    const k = voxelOf(i)
    let n = 0
    for (let dx = -1; dx <= 1 && n < MIN_NEIGHBORS; dx++) {
      for (let dy = -1; dy <= 1 && n < MIN_NEIGHBORS; dy++) {
        for (let dz = -1; dz <= 1 && n < MIN_NEIGHBORS; dz++) {
          n += counts.get(k + (dx * grid + dy) * grid + dz) ?? 0
        }
      }
    }
    if (n >= MIN_NEIGHBORS) {
      keep[i] = 1
      kept++
    }
  }

  if (kept === count || kept < count * 0.5) {
    // nothing removed, or the heuristic misfired badly — keep the original
    return { pos, col, count, removed: 0 }
  }

  const hasColor = col.length === pos.length
  const outPos = new Float32Array(kept * 3)
  const outCol = new Float32Array(hasColor ? kept * 3 : 0)
  let w = 0
  for (let i = 0; i < count; i++) {
    if (!keep[i]) continue
    outPos[w * 3] = pos[i * 3]
    outPos[w * 3 + 1] = pos[i * 3 + 1]
    outPos[w * 3 + 2] = pos[i * 3 + 2]
    if (hasColor) {
      outCol[w * 3] = col[i * 3]
      outCol[w * 3 + 1] = col[i * 3 + 1]
      outCol[w * 3 + 2] = col[i * 3 + 2]
    }
    w++
  }
  return { pos: outPos, col: hasColor ? outCol : col, count: kept, removed: count - kept }
}
