import { useNavmapStore } from '../store/useNavmapStore'
import { SecondaryClouds } from './SecondaryClouds'

export function PointCloud() {
  const geometry = useNavmapStore((s) => s.pointCloudGeometry)
  const hasColor = useNavmapStore((s) => s.pointCloudHasColor)
  const pointSize = useNavmapStore((s) => s.pointCloudPointSize)

  if (!geometry) return null
  return (
    <group name="model-group">
      <points geometry={geometry}>
        <pointsMaterial
          size={pointSize}
          sizeAttenuation
          vertexColors={hasColor}
          color={hasColor ? 0xffffff : 0xaabbcc}
        />
      </points>
      {/* Secondary alignment clouds live inside model-group so picking treats them as one cloud. */}
      <SecondaryClouds />
    </group>
  )
}
