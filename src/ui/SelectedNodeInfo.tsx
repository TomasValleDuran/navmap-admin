import { useNavmapStore } from '../store/useNavmapStore'
import { POI_COLORS, POI_ICONS, WAYPOINT_COLOR } from '../lib/coordTransforms'

export function SelectedNodeInfo() {
  const selectedNode = useNavmapStore((s) => s.selectedNode)
  const pois = useNavmapStore((s) => s.pois)
  const waypoints = useNavmapStore((s) => s.waypoints)
  const startEdit = useNavmapStore((s) => s.startEdit)
  const selectNode = useNavmapStore((s) => s.selectNode)

  if (!selectedNode) {
    return (
      <div className="rounded-lg border border-border bg-panel-2 p-3 text-xs text-muted">
        Ningún elemento seleccionado.
      </div>
    )
  }

  const node =
    selectedNode.nodeType === 'poi'
      ? pois.find((p) => p.id === selectedNode.id)
      : waypoints.find((w) => w.id === selectedNode.id)

  if (!node) return null

  const isPOI = selectedNode.nodeType === 'poi'
  const colorHex = isPOI ? POI_COLORS[(node as typeof pois[number]).type] : WAYPOINT_COLOR
  const colorStyle = { background: `#${colorHex.toString(16).padStart(6, '0')}` }
  const icon = isPOI ? POI_ICONS[(node as typeof pois[number]).type] : '⚪'
  const title = isPOI ? (node as typeof pois[number]).name : (node as typeof waypoints[number]).label
  const subtitle = isPOI ? (node as typeof pois[number]).type : 'waypoint'

  return (
    <div className="space-y-2 rounded-lg border border-border bg-panel-2 p-3">
      <div className="text-xs font-medium uppercase tracking-wider text-muted">Nodo seleccionado</div>
      <div className="flex items-center gap-2">
        <span className="h-3 w-3 rounded-full" style={colorStyle} />
        <span className="text-base">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm text-text">{title}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted">{subtitle}</div>
        </div>
      </div>
      <div className="font-mono text-[11px] text-muted">
        Piso: P{node.floor} <br />
        x: {node.x.toFixed(3)} &nbsp; y: {node.y.toFixed(3)} &nbsp; z: {node.z.toFixed(3)}
      </div>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => startEdit(selectedNode)}
          className="flex-1 rounded-md border border-border bg-panel px-3 py-1.5 text-xs hover:border-accent-blue/60"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => selectNode(null)}
          className="rounded-md border border-border bg-panel px-3 py-1.5 text-xs hover:border-muted"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
