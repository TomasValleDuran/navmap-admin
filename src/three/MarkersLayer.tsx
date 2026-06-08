import { useNavmapStore } from '../store/useNavmapStore'
import { EdgeTube } from './EdgeTube'
import { Marker } from './Marker'

export function MarkersLayer() {
  const pois = useNavmapStore((s) => s.pois)
  const waypoints = useNavmapStore((s) => s.waypoints)
  const edges = useNavmapStore((s) => s.edges)
  const modelLoaded = useNavmapStore((s) => s.modelLoaded)
  if (!modelLoaded) return null
  return (
    <group name="markers-group">
      {pois.map((p) => (
        <Marker key={p.id} node={p} nodeType="poi" />
      ))}
      {waypoints.map((w) => (
        <Marker key={w.id} node={w} nodeType="waypoint" />
      ))}
      {edges.map((e) => (
        <EdgeTube key={e.id} edge={e} />
      ))}
    </group>
  )
}
