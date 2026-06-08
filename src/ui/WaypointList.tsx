import { useNavmapStore } from '../store/useNavmapStore'

export function WaypointList() {
  const waypoints = useNavmapStore((s) => s.waypoints)
  const mode = useNavmapStore((s) => s.mode)
  const selectNode = useNavmapStore((s) => s.selectNode)
  const deleteNode = useNavmapStore((s) => s.deleteNode)
  const setStatus = useNavmapStore((s) => s.setStatus)
  const selectedNode = useNavmapStore((s) => s.selectedNode)

  return (
    <div className="space-y-1 rounded-lg border border-border bg-panel-2 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted">Waypoints</div>
        <div className="font-mono text-[11px] text-muted">{waypoints.length}</div>
      </div>
      <div className="max-h-[130px] space-y-1 overflow-y-auto pr-1">
        {waypoints.length === 0 ? (
          <div className="py-2 text-center text-[11px] text-muted">Sin waypoints todavía.</div>
        ) : (
          waypoints.map((w) => {
            const sel = selectedNode?.id === w.id
            return (
              <div
                key={w.id}
                className={`group flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${
                  sel ? 'border-accent-green/60 bg-accent-green/10' : 'border-transparent hover:border-border hover:bg-panel'
                }`}
                onClick={() => {
                  if (mode === 'select') selectNode({ id: w.id, nodeType: 'waypoint' })
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full bg-accent-green" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-text">{w.label}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">P{w.floor}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNode(w.id, 'waypoint')
                    setStatus(`Waypoint "${w.label}" eliminado.`)
                  }}
                  className="rounded px-1.5 text-muted opacity-0 hover:bg-accent-red/15 hover:text-accent-red group-hover:opacity-100"
                  title="Eliminar"
                >
                  ×
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
