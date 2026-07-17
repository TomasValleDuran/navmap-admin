import { useNavmapStore } from '../store/useNavmapStore'
import { colmapToViewer, markerR } from '../lib/coordTransforms'
import type { FloorConnection } from '../types/navmap'

/**
 * Cross-floor connections can't be drawn as a single line (each floor is its own space), so we
 * mark each endpoint that lives on the active floor with an up/down arrow cone: up if the link
 * leads to a higher floor, down otherwise. Green = accessible (elevator/ramp), orange = stairs.
 */
export function ConnectionBadges() {
  const connections = useNavmapStore((s) => s.connections)
  const pois = useNavmapStore((s) => s.pois)
  const waypoints = useNavmapStore((s) => s.waypoints)
  const transform = useNavmapStore((s) => s.transform)
  const modelRadius = useNavmapStore((s) => s.modelRadius)
  const floors = useNavmapStore((s) => s.floors)
  const activeFloorId = useNavmapStore((s) => s.activeFloorId)
  const modelLoaded = useNavmapStore((s) => s.modelLoaded)

  if (!modelLoaded) return null
  const activeLevel = floors.find((f) => f.id === activeFloorId)?.level
  if (activeLevel == null) return null

  const coord = (id: string) => {
    const n = pois.find((p) => p.id === id) ?? waypoints.find((w) => w.id === id)
    return n ? colmapToViewer(n.x, n.y, n.z, transform) : null
  }

  // collect (nodeId on active floor, goes-up?, accessible) badges
  const badges: { key: string; vx: number; vy: number; vz: number; up: boolean; accessible: boolean }[] = []
  const consider = (c: FloorConnection, nodeId: string, otherLevel: number) => {
    const v = coord(nodeId)
    if (!v) return
    badges.push({
      key: `${c.id}_${nodeId}`,
      vx: v.vx,
      vy: v.vy,
      vz: v.vz,
      up: otherLevel > activeLevel,
      accessible: c.accessible,
    })
  }
  for (const c of connections) {
    if (c.floorFrom === activeLevel) consider(c, c.from, c.floorTo)
    if (c.floorTo === activeLevel) consider(c, c.to, c.floorFrom)
  }

  const r = markerR(2.2, modelRadius)

  return (
    <group name="connection-badges">
      {badges.map((b) => (
        <mesh
          key={b.key}
          position={[b.vx, b.vy + r * 2.4, b.vz]}
          rotation={[b.up ? 0 : Math.PI, 0, 0]}
          renderOrder={1000}
        >
          <coneGeometry args={[r * 0.7, r * 1.6, 12]} />
          <meshBasicMaterial
            color={b.accessible ? 0x34c98a : 0xf0883e}
            transparent
            opacity={0.9}
            depthTest={false}
          />
        </mesh>
      ))}
    </group>
  )
}
