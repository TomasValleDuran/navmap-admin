import { colmapToViewer } from './coordTransforms'
import type { Transform, WallSegment } from '../types/navmap'

/** A wall reduced to what the 2-D tests need: its footprint on the floor plane. */
export interface WallLine {
  ax: number
  az: number
  bx: number
  bz: number
  /** Railings block walking but not sight; walls block both. */
  seeThrough: boolean
}

/** Projects the floor's walls (COLMAP) onto viewer-space floor lines. */
export function wallsToLines(walls: WallSegment[], transform: Transform): WallLine[] {
  return walls.map((w) => {
    const a = colmapToViewer(w.ax, w.ay, w.az, transform)
    const b = colmapToViewer(w.bx, w.by, w.bz, transform)
    return { ax: a.vx, az: a.vz, bx: b.vx, bz: b.vz, seeThrough: w.kind === 'railing' }
  })
}

/** Do segments p→p2 and q→q2 cross? Standard orientation test, collinear cases count as no. */
function segmentsCross(
  px: number, pz: number, p2x: number, p2z: number,
  qx: number, qz: number, q2x: number, q2z: number,
): boolean {
  const d = (ax: number, az: number, bx: number, bz: number, cx: number, cz: number) =>
    (bx - ax) * (cz - az) - (bz - az) * (cx - ax)
  const d1 = d(px, pz, p2x, p2z, qx, qz)
  const d2 = d(px, pz, p2x, p2z, q2x, q2z)
  const d3 = d(qx, qz, q2x, q2z, px, pz)
  const d4 = d(qx, qz, q2x, q2z, p2x, p2z)
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0))
}

/**
 * Is the straight line a→b free of walls?
 *
 * [clearance] is trimmed off **both ends** before testing: a node is marked against the wall it
 * belongs to (a door, a classroom), so a ray that starts or ends on a wall is the normal case,
 * not an obstruction.
 *
 * [forSight] `true` — the AR question, "can the user see it": railings and glass don't block.
 * `false` — the routing question, "can the user walk there": everything blocks.
 */
export function wallsBlockLine(
  walls: WallLine[],
  ax: number,
  az: number,
  bx: number,
  bz: number,
  clearance: number,
  forSight: boolean,
): boolean {
  const len = Math.hypot(bx - ax, bz - az)
  if (len <= clearance * 2) return false
  const t = clearance / len
  const sx = ax + (bx - ax) * t
  const sz = az + (bz - az) * t
  const ex = bx - (bx - ax) * t
  const ez = bz - (bz - az) * t

  for (const w of walls) {
    if (forSight && w.seeThrough) continue
    if (segmentsCross(sx, sz, ex, ez, w.ax, w.az, w.bx, w.bz)) return true
  }
  return false
}
