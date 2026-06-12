import { useMemo } from 'react'
import { useNavmapStore } from '../store/useNavmapStore'
import { ANCHOR_COLOR, colmapToViewer, markerR } from '../lib/coordTransforms'
import type { AnchorPoint } from '../types/navmap'

export function AnchorMarker({ anchor }: { anchor: AnchorPoint }) {
  const transform = useNavmapStore((s) => s.transform)
  const modelRadius = useNavmapStore((s) => s.modelRadius)

  const { vx, vy, vz } = useMemo(
    () => colmapToViewer(anchor.x, anchor.y, anchor.z, transform),
    [anchor.x, anchor.y, anchor.z, transform],
  )

  const r = markerR(1.4, modelRadius)

  return (
    <group position={[vx, vy, vz]}>
      <mesh renderOrder={999}>
        <octahedronGeometry args={[r, 0]} />
        <meshStandardMaterial
          color={ANCHOR_COLOR}
          emissive={ANCHOR_COLOR}
          emissiveIntensity={0.6}
          roughness={0.35}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      <mesh renderOrder={998}>
        <octahedronGeometry args={[r * 1.7, 0]} />
        <meshBasicMaterial
          color={ANCHOR_COLOR}
          transparent
          opacity={0.15}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
    </group>
  )
}
