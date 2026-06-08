import { useMemo } from 'react'
import { DoubleSide } from 'three'
import { useNavmapStore } from '../store/useNavmapStore'

export function FloorPlane() {
  const modelLoaded = useNavmapStore((s) => s.modelLoaded)
  const modelRadius = useNavmapStore((s) => s.modelRadius)
  const floorHeightViewer = useNavmapStore((s) => s.floorHeightViewer)
  const mode = useNavmapStore((s) => s.mode)
  const floorLock = useNavmapStore((s) => s.floorLock)

  const sz = useMemo(() => Math.max(modelRadius * 2.2, 6), [modelRadius])
  const marking = floorLock || mode === 'poi' || mode === 'waypoint'
  const color = marking ? 0x1f4d38 : 0x152a22
  const opacity = marking ? 0.58 : 0.42

  if (!modelLoaded) return null

  return (
    <group position={[0, floorHeightViewer, 0]}>
      <mesh name="floor-solid" rotation={[-Math.PI / 2, 0, 0]} renderOrder={1} userData={{ isFloorPlane: true }}>
        <planeGeometry args={[sz, sz]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <gridHelper args={[sz, 48, 0x34c98a, 0x1a2e24]} position={[0, 0.002, 0]}>
        <lineBasicMaterial attach="material" transparent opacity={0.45} />
      </gridHelper>
    </group>
  )
}
