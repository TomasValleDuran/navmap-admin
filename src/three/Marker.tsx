import { useMemo } from 'react'
import { useNavmapStore } from '../store/useNavmapStore'
import {
  colmapToViewer,
  markerDisplayY,
  markerR,
  POI_COLORS,
  WAYPOINT_COLOR,
} from '../lib/coordTransforms'
import type { NodeType, POI, Waypoint } from '../types/navmap'

interface Props {
  node: POI | Waypoint
  nodeType: NodeType
}

export function Marker({ node, nodeType }: Props) {
  const transform = useNavmapStore((s) => s.transform)
  const scale = transform.scale
  const floorY = useNavmapStore((s) => s.floorHeightViewer)
  const selectedNode = useNavmapStore((s) => s.selectedNode)
  const edgeStart = useNavmapStore((s) => s.edgeStart)

  const { vx, vy, vz } = useMemo(
    () => colmapToViewer(node.x, node.y, node.z, transform),
    [node.x, node.y, node.z, transform],
  )

  const baseR = nodeType === 'poi' ? 1.6 : 1.2
  const visualR = markerR(baseR, scale)
  const hitR = Math.max(visualR * 2.2, markerR(1.8, scale))
  const haloR = visualR * 1.75
  const displayY = markerDisplayY(vy, visualR, floorY, scale)

  const color = useMemo(() => {
    if (nodeType === 'poi') return POI_COLORS[(node as POI).type] ?? POI_COLORS.other
    return WAYPOINT_COLOR
  }, [nodeType, node])

  const isSelected = selectedNode?.id === node.id
  const isEdgeStart = edgeStart?.id === node.id
  const emissiveIntensity = isSelected ? 0.7 : isEdgeStart ? 0.6 : 0.15

  const onClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation()
    const s = useNavmapStore.getState()
    if (s.mode === 'select') {
      s.selectNode({ id: node.id, nodeType })
      s.setStatus(`Nodo seleccionado: ${'name' in node ? node.name : node.label}`)
    } else if (s.mode === 'edge') {
      if (!s.edgeStart) {
        s.setEdgeStart({ id: node.id, nodeType })
        s.setStatus('Nodo A seleccionado. Elegí el segundo nodo (Esc para cancelar).')
      } else if (s.edgeStart.id === node.id) {
        s.setEdgeStart(null)
        s.setStatus('Conexión cancelada.')
      } else {
        const edge = s.addEdge(s.edgeStart, { id: node.id, nodeType })
        s.setStatus(edge ? `Conexión creada (d=${edge.weight.toFixed(2)}).` : 'Conexión duplicada o inválida.')
      }
    }
  }

  const cursor = (() => {
    const m = useNavmapStore.getState().mode
    return m === 'select' || m === 'edge' ? 'pointer' : 'default'
  })()

  return (
    <group position={[vx, displayY, vz]}>
      <mesh renderOrder={998}>
        <sphereGeometry args={[haloR, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.25 : 0.12}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      <mesh
        renderOrder={999}
        onClick={onClick}
        onPointerOver={() => (document.body.style.cursor = cursor)}
        onPointerOut={() => (document.body.style.cursor = '')}
      >
        <sphereGeometry args={[visualR, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity + 0.5}
          roughness={0.4}
          metalness={0.05}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>
      <mesh onClick={onClick} visible={false}>
        <sphereGeometry args={[hitR, 8, 8]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <lineSegments renderOrder={997}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[new Float32Array([0, 0, 0, 0, floorY - displayY, 0]), 3]}
          />
        </bufferGeometry>
        <lineBasicMaterial color={color} transparent opacity={0.55} depthTest={false} />
      </lineSegments>
    </group>
  )
}
