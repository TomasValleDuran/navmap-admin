import type { CalibrationSample, Transform } from '../types/navmap'

export function sampleColmapDistance(s: CalibrationSample): number {
  return Math.hypot(s.a.x - s.b.x, s.a.y - s.b.y, s.a.z - s.b.z)
}

/** Distance of a sample in viewer units under the current transform. */
export function sampleViewerDistance(s: CalibrationSample, t: Transform): number {
  // viewerToColmap is a similarity transform, so distances scale by exactly t.scale
  return sampleColmapDistance(s) * t.scale
}

/**
 * Least-squares fit of the meters-per-viewer-unit factor across all samples:
 * minimizes Σ(mᵢ - f·dᵢ)² → f = Σ(dᵢ·mᵢ) / Σ(dᵢ²).
 * Longer measurements naturally weigh more, which is what we want — the
 * relative click error is smaller over a long hallway than a short doorframe.
 */
export function fitMetersPerViewerUnit(
  samples: CalibrationSample[],
  t: Transform,
): number | null {
  let num = 0
  let den = 0
  for (const s of samples) {
    const d = sampleViewerDistance(s, t)
    if (!isFinite(d) || d < 1e-9 || !isFinite(s.realMeters) || s.realMeters <= 0) continue
    num += d * s.realMeters
    den += d * d
  }
  if (den < 1e-12) return null
  const f = num / den
  return isFinite(f) && f > 0 ? f : null
}

/** Signed residual of a sample vs the fit, as a fraction of its real length. */
export function sampleResidual(
  s: CalibrationSample,
  t: Transform,
  factor: number,
): number {
  const predicted = sampleViewerDistance(s, t) * factor
  return (s.realMeters - predicted) / s.realMeters
}
