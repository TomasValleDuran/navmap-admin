import { useMemo } from 'react'
import * as THREE from 'three'
import { useNavmapStore } from '../store/useNavmapStore'
import {
  colmapToViewer,
  edgeMarkerRadius,
  edgeTubeRadius,
  markerDisplayY,
  EDGE_COLOR,
} from '../lib/coordTransforms'
import type { Edge } from '../types/navmap'

interface Props {
  edge: Edge
}

const UP = new THREE.Vector3(0, 1, 0)

export function EdgeTube({ edge }: Props) {
  const transform = useNavmapStore((s) => s.transform)
  const modelRadius = useNavmapStore((s) => s.modelRadius)
  const floorY = useNavmapStore((s) => s.floorHeightViewer)
  const mirrorY = useNavmapStore((s) => s.mirrorY)
  const pois = useNavmapStore((s) => s.pois)
  const waypoints = useNavmapStore((s) => s.waypoints)

  const view = useMemo(() => {
    const a =
      edge.fromType === 'poi'
        ? pois.find((p) => p.id === edge.from)
        : waypoints.find((w) => w.id === edge.from)
    const b =
      edge.toType === 'poi'
        ? pois.find((p) => p.id === edge.to)
        : waypoints.find((w) => w.id === edge.to)
    if (!a || !b) return null
    const av = colmapToViewer(a.x, a.y, a.z, transform)
    const bv = colmapToViewer(b.x, b.y, b.z, transform)
    const aR = edgeMarkerRadius(edge.fromType, modelRadius)
    const bR = edgeMarkerRadius(edge.toType, modelRadius)
    const ay = markerDisplayY(av.vy, aR, floorY, mirrorY)
    const by = markerDisplayY(bv.vy, bR, floorY, mirrorY)
    const A = new THREE.Vector3(av.vx, ay, av.vz)
    const B = new THREE.Vector3(bv.vx, by, bv.vz)
    const dir = new THREE.Vector3().subVectors(B, A)
    const len = dir.length()
    if (len < 1e-6) return null
    const mid = new THREE.Vector3().addVectors(A, B).multiplyScalar(0.5)
    const quat = new THREE.Quaternion().setFromUnitVectors(UP, dir.clone().normalize())
    return { mid, quat, len }
  }, [edge, pois, waypoints, transform, modelRadius, floorY, mirrorY])

  if (!view) return null
  const r = edgeTubeRadius(modelRadius)
  return (
    <mesh position={view.mid} quaternion={view.quat}>
      <cylinderGeometry args={[r, r, view.len, 10, 1, false]} />
      <meshStandardMaterial
        color={EDGE_COLOR}
        emissive={EDGE_COLOR}
        emissiveIntensity={0.4}
        transparent
        opacity={0.88}
        roughness={0.5}
      />
    </mesh>
  )
}
