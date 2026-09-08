import { useMemo } from 'react'
import * as THREE from 'three'
import { colmapToViewer, markerDisplayY, markerR } from '../lib/coordTransforms'
import { useSightSimulation } from '../hooks/useSightSimulation'
import { useNavmapStore } from '../store/useNavmapStore'

const VISIBLE_COLOR = 0x34c98a
const HIDDEN_COLOR = 0xe05555
const EYE_COLOR = 0xfacc15

/** Altura del ojo, en metros: de ahí mira el teléfono cuando lo llevás en la mano. */
const EYE_HEIGHT_M = 1.6

/**
 * La simulación de visibilidad dibujada: desde dónde mira, qué llega y qué queda tapado.
 *
 * Un rayo por nodo, verde si la app lo dibujaría y rojo si un muro se lo come, más un aro rojo
 * sobre cada nodo tapado y una línea roja sobre cada arista que se caería. Es la misma cuenta que
 * corre el teléfono en cada frame; acá se ve entera de una vez, que es justamente lo que no se
 * puede hacer con el celular en la mano.
 */
export function SightLayer() {
  const sightPoint = useNavmapStore((s) => s.sightPoint)
  const showVisible = useNavmapStore((s) => s.sightShowVisible)
  const pois = useNavmapStore((s) => s.pois)
  const waypoints = useNavmapStore((s) => s.waypoints)
  const edges = useNavmapStore((s) => s.edges)
  const transform = useNavmapStore((s) => s.transform)
  const floorY = useNavmapStore((s) => s.floorHeightViewer)
  const metersPerViewerUnit = useNavmapStore((s) => s.metersPerViewerUnit)
  const modelRadius = useNavmapStore((s) => s.modelRadius)
  const mirrorY = useNavmapStore((s) => s.mirrorY)
  const modelLoaded = useNavmapStore((s) => s.modelLoaded)
  const sight = useSightSimulation()

  // Dentro de <group name="scene-mirror"> el eje Y está escalado por -1 cuando mirrorY está
  // activo, así que "hacia arriba" es -1 en ese caso. Misma convención que PersonFigure.
  const up = mirrorY ? -1 : 1
  const eyeH = metersPerViewerUnit
    ? EYE_HEIGHT_M / metersPerViewerUnit
    : Math.max(1, modelRadius) * 0.06
  const eyeR = markerR(1.4, modelRadius)

  const geom = useMemo(() => {
    if (!sightPoint || !sight) return null
    const eyeY = floorY + up * eyeH
    const nodes = [
      ...pois.map((p) => ({ id: p.id, x: p.x, y: p.y, z: p.z, base: 1.6 })),
      ...waypoints.map((w) => ({ id: w.id, x: w.x, y: w.y, z: w.z, base: 1.2 })),
    ]

    const pos = new Map<string, [number, number, number]>()
    const rays: Record<'visible' | 'hidden', number[]> = { visible: [], hidden: [] }
    for (const n of nodes) {
      const v = colmapToViewer(n.x, n.y, n.z, transform)
      const y = markerDisplayY(v.vy, markerR(n.base, modelRadius), floorY, mirrorY)
      pos.set(n.id, [v.vx, y, v.vz])
      const bucket = sight.hidden.has(n.id) ? rays.hidden : rays.visible
      bucket.push(sightPoint.vx, eyeY, sightPoint.vz, v.vx, y, v.vz)
    }

    const hiddenEdgeVerts: number[] = []
    for (const e of edges) {
      if (!sight.hiddenEdges.has(e.id)) continue
      const a = pos.get(e.from)
      const b = pos.get(e.to)
      if (a && b) hiddenEdgeVerts.push(...a, ...b)
    }

    const build = (verts: number[]) => {
      if (verts.length === 0) return null
      const g = new THREE.BufferGeometry()
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
      return g
    }

    return {
      eyeY,
      visible: build(rays.visible),
      hidden: build(rays.hidden),
      hiddenEdges: build(hiddenEdgeVerts),
      hiddenNodes: [...sight.hidden].map((id) => pos.get(id)).filter(Boolean) as [
        number,
        number,
        number,
      ][],
    }
  }, [sightPoint, sight, pois, waypoints, edges, transform, floorY, up, eyeH, modelRadius, mirrorY])

  if (!modelLoaded || !sightPoint || !geom) return null

  return (
    <group name="sight-group">
      {/* De dónde mira: la esfera al nivel de los ojos y el palo hasta el piso. */}
      <mesh position={[sightPoint.vx, geom.eyeY, sightPoint.vz]} renderOrder={999}>
        <sphereGeometry args={[eyeR, 16, 16]} />
        <meshBasicMaterial color={EYE_COLOR} depthTest={false} />
      </mesh>
      <lineSegments renderOrder={998}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[
              new Float32Array([
                sightPoint.vx, geom.eyeY, sightPoint.vz,
                sightPoint.vx, floorY, sightPoint.vz,
              ]),
              3,
            ]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={EYE_COLOR} transparent opacity={0.7} depthTest={false} />
      </lineSegments>

      {showVisible && geom.visible && (
        <lineSegments renderOrder={996}>
          <primitive object={geom.visible} attach="geometry" />
          <lineBasicMaterial color={VISIBLE_COLOR} transparent opacity={0.5} depthTest={false} />
        </lineSegments>
      )}
      {geom.hidden && (
        <lineSegments renderOrder={997}>
          <primitive object={geom.hidden} attach="geometry" />
          <lineBasicMaterial color={HIDDEN_COLOR} transparent opacity={0.85} depthTest={false} />
        </lineSegments>
      )}
      {geom.hiddenEdges && (
        <lineSegments renderOrder={997}>
          <primitive object={geom.hiddenEdges} attach="geometry" />
          <lineBasicMaterial color={HIDDEN_COLOR} transparent opacity={0.6} depthTest={false} />
        </lineSegments>
      )}

      {/* Un aro rojo sobre cada nodo que la app NO dibujaría desde acá. */}
      {geom.hiddenNodes.map((p, i) => (
        <mesh key={i} position={p} renderOrder={999}>
          <sphereGeometry args={[markerR(2.4, modelRadius), 12, 12]} />
          <meshBasicMaterial
            color={HIDDEN_COLOR}
            transparent
            opacity={0.22}
            depthWrite={false}
            depthTest={false}
          />
        </mesh>
      ))}
    </group>
  )
}
