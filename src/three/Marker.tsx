import { useMemo } from 'react'
import { useNavmapStore } from '../store/useNavmapStore'
import {
  colmapToViewer,
  formatColmapDistance,
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
  const modelRadius = useNavmapStore((s) => s.modelRadius)
  const floorY = useNavmapStore((s) => s.floorHeightViewer)
  const mirrorY = useNavmapStore((s) => s.mirrorY)
  const selectedNode = useNavmapStore((s) => s.selectedNode)
  const edgeStart = useNavmapStore((s) => s.edgeStart)
  const connectStart = useNavmapStore((s) => s.connectStart)

  const { vx, vy, vz } = useMemo(
    () => colmapToViewer(node.x, node.y, node.z, transform),
    [node.x, node.y, node.z, transform],
  )

  const baseR = nodeType === 'poi' ? 1.6 : 1.2
  const visualR = markerR(baseR, modelRadius)
  const hitR = Math.max(visualR * 2.2, markerR(1.8, modelRadius))
  const haloR = visualR * 1.75
  const displayY = markerDisplayY(vy, visualR, floorY, mirrorY)

  const color = useMemo(() => {
    if (nodeType === 'poi') return POI_COLORS[(node as POI).type] ?? POI_COLORS.other
    return WAYPOINT_COLOR
  }, [nodeType, node])

  const isSelected = selectedNode?.id === node.id
  const isEdgeStart = edgeStart?.id === node.id
  const isConnectStart = connectStart?.id === node.id
  const emissiveIntensity = isSelected ? 0.7 : isEdgeStart || isConnectStart ? 0.6 : 0.15

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
        s.setStatus(
          edge
            ? `Conexión creada (d=${formatColmapDistance(edge.weight, s.transform.scale, s.metersPerViewerUnit)}).`
            : 'Conexión duplicada o inválida.',
        )
      }
    } else if (s.mode === 'connect-floors') {
      const active = s.floors.find((f) => f.id === s.activeFloorId)
      if (!s.connectStart) {
        s.setConnectStart({
          id: node.id,
          nodeType,
          floorId: s.activeFloorId,
          level: active?.level ?? 0,
        })
        s.setStatus('Primer extremo elegido. Cambiá de piso y seleccioná el segundo nodo.')
      } else if (s.connectStart.id === node.id) {
        s.setConnectStart(null)
        s.setStatus('Conexión entre pisos cancelada.')
      } else if (s.connectStart.floorId === s.activeFloorId) {
        s.setStatus('El segundo extremo debe estar en otro piso. Cambiá de piso primero.')
      } else {
        // second endpoint on another floor → ConnectionModal opens from this selection
        s.selectNode({ id: node.id, nodeType })
      }
    }
  }

  const cursor = (() => {
    const m = useNavmapStore.getState().mode
    return m === 'select' || m === 'edge' || m === 'connect-floors' ? 'pointer' : 'default'
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
