import { useMemo } from 'react'
import * as THREE from 'three'
import { useNavmapStore } from '../store/useNavmapStore'
import { markerR } from '../lib/coordTransforms'

const POINT_COLOR = 0xfacc15
const LINE_COLOR = 0xfde047
const HOVER_COLOR = 0x7dd3fc

export function MeasureLayer() {
  const points = useNavmapStore((s) => s.measurePoints)
  const hover = useNavmapStore((s) => s.measureHover)
  const mode = useNavmapStore((s) => s.mode)
  const modelRadius = useNavmapStore((s) => s.modelRadius)
  const modelLoaded = useNavmapStore((s) => s.modelLoaded)

  const lineGeom = useMemo(() => {
    // committed line between A and B, or live line from A to the hover point
    const b = points.length === 2 ? points[1] : points.length === 1 ? hover : null
    if (!b || points.length === 0) return null
    const g = new THREE.BufferGeometry()
    const arr = new Float32Array([
      points[0].vx, points[0].vy, points[0].vz,
      b.vx, b.vy, b.vz,
    ])
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return g
  }, [points, hover])

  const showHover = hover != null && (mode === 'measure' || mode === 'anchor')
  if (!modelLoaded || (points.length === 0 && !showHover)) return null
  const r = markerR(1.0, modelRadius)

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
      {showHover && (
        <group position={[hover.vx, hover.vy, hover.vz]}>
          <mesh renderOrder={999}>
            <sphereGeometry args={[r * 0.55, 12, 12]} />
            <meshBasicMaterial
              color={HOVER_COLOR}
              transparent
              opacity={0.95}
              depthWrite={false}
              depthTest={false}
            />
          </mesh>
          <mesh renderOrder={998}>
            <sphereGeometry args={[r * 1.3, 16, 16]} />
            <meshBasicMaterial
              color={HOVER_COLOR}
              transparent
              opacity={0.18}
              depthWrite={false}
              depthTest={false}
            />
          </mesh>
        </group>
      )}
      {lineGeom && (
        <lineSegments renderOrder={998}>
          <primitive object={lineGeom} attach="geometry" />
          <lineBasicMaterial color={LINE_COLOR} transparent opacity={0.9} depthTest={false} />
        </lineSegments>
      )}
    </group>
  )
}
