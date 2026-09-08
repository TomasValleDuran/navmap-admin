import { useMemo } from 'react'
import { computeSight, type SightResult } from '../lib/visibility'
import { useNavmapStore } from '../store/useNavmapStore'

/**
 * Resultado de la simulación de visibilidad para el punto marcado, o null si no hay punto.
 *
 * Lo comparten la capa 3-D y el panel: el cálculo es una pasada por nodo, pero rehacerlo en dos
 * lugares dejaría al panel diciendo una cosa y a los rayos dibujando otra.
 */
export function useSightSimulation(): SightResult | null {
  const sightPoint = useNavmapStore((s) => s.sightPoint)
  const pois = useNavmapStore((s) => s.pois)
  const waypoints = useNavmapStore((s) => s.waypoints)
  const edges = useNavmapStore((s) => s.edges)
  const walls = useNavmapStore((s) => s.walls)
  const transform = useNavmapStore((s) => s.transform)
  const metersPerViewerUnit = useNavmapStore((s) => s.metersPerViewerUnit)
  const modelRadius = useNavmapStore((s) => s.modelRadius)

  return useMemo(() => {
    if (!sightPoint) return null
    return computeSight({
      eye: sightPoint,
      pois,
      waypoints,
      edges,
      walls,
      transform,
      metersPerViewerUnit,
      modelRadius,
    })
  }, [
    sightPoint,
    pois,
    waypoints,
    edges,
    walls,
    transform,
    metersPerViewerUnit,
    modelRadius,
  ])
}
