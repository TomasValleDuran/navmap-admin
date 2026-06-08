import { useMemo } from 'react'
import * as THREE from 'three'
import { useNavmapStore } from '../store/useNavmapStore'
import { markerR } from '../lib/coordTransforms'

const POINT_COLOR = 0xfacc15
const LINE_COLOR = 0xfde047

export function MeasureLayer() {
  const points = useNavmapStore((s) => s.measurePoints)
  const scale = useNavmapStore((s) => s.transform.scale)
  const modelLoaded = useNavmapStore((s) => s.modelLoaded)

  const lineGeom = useMemo(() => {
    if (points.length !== 2) return null
    const g = new THREE.BufferGeometry()
    const arr = new Float32Array([
      points[0].vx, points[0].vy, points[0].vz,
      points[1].vx, points[1].vy, points[1].vz,
    ])
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return g
  }, [points])

  if (!modelLoaded || points.length === 0) return null
  const r = markerR(1.0, scale)

  return (
    <group name="measure-group">
      {points.map((p, i) => (
        <mesh key={i} position={[p.vx, p.vy, p.vz]} renderOrder={999}>
          <sphereGeometry args={[r, 16, 16]} />
          <meshStandardMaterial
            color={POINT_COLOR}
            emissive={POINT_COLOR}
            emissiveIntensity={0.9}
            depthWrite={false}
            depthTest={false}
          />
        </mesh>
      ))}
      {lineGeom && (
        <lineSegments renderOrder={998}>
          <primitive object={lineGeom} attach="geometry" />
          <lineBasicMaterial color={LINE_COLOR} transparent opacity={0.9} depthTest={false} />
        </lineSegments>
      )}
    </group>
  )
}
