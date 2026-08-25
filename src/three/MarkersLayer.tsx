import { useNavmapStore } from '../store/useNavmapStore'
import { AnchorMarker } from './AnchorMarker'
import { ConnectionBadges } from './ConnectionBadges'
import { EdgeTube } from './EdgeTube'
import { Marker } from './Marker'
import { PersonFigure } from './PersonFigure'
import type { PersonMarker } from '../types/navmap'

/** Estable: `?? []` devolveria un array nuevo por render y re-renderizaria todo el layer. */
const NO_PEOPLE: PersonMarker[] = []

export function MarkersLayer() {
  const pois = useNavmapStore((s) => s.pois)
  const waypoints = useNavmapStore((s) => s.waypoints)
  const anchors = useNavmapStore((s) => s.anchors)
  const edges = useNavmapStore((s) => s.edges)
  const people = useNavmapStore((s) => s.people[s.activeFloorId] ?? NO_PEOPLE)
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
      {anchors.map((a) => (
        <AnchorMarker key={a.id} anchor={a} />
      ))}
      {edges.map((e) => (
        <EdgeTube key={e.id} edge={e} />
      ))}
      {people.map((p) => (
        <PersonFigure key={p.id} person={p} />
      ))}
      <ConnectionBadges />
    </group>
  )
}
