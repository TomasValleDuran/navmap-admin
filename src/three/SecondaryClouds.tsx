import type { SecondaryCloud } from '../types/navmap'
import { useNavmapStore } from '../store/useNavmapStore'

/**
 * Renders the active floor's secondary clouds as nested groups **inside `model-group`**, so
 * `pointPicking`'s recursive `intersectObjects(modelGroup.children, true)` returns their points in
 * the same viewer frame as the primary — POIs placed on them need no special casing. Each carries
 * its own similarity transform (position / quaternion / uniform scale) driven by the gizmo.
 */
export function SecondaryClouds() {
  const clouds = useNavmapStore((s) => s.secondaryClouds)
  if (!clouds.length) return null
  return (
    <>
      {clouds.map((c) => (c.visible ? <SecondaryCloudPoints key={c.id} cloud={c} /> : null))}
    </>
  )
}

function SecondaryCloudPoints({ cloud }: { cloud: SecondaryCloud }) {
  const { position, quaternion, scale } = cloud.transform
  return (
    <group name={`secondary-${cloud.id}`} position={position} quaternion={quaternion} scale={scale}>
      <points geometry={cloud.geometry}>
        {/* tint (not vertex colors) so A vs B reads distinctly while aligning */}
        <pointsMaterial size={cloud.pointSize} sizeAttenuation color={cloud.tint} transparent opacity={0.9} />
      </points>
    </group>
  )
}
