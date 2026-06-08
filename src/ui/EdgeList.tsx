import { useNavmapStore } from '../store/useNavmapStore'

export function EdgeList() {
  const edges = useNavmapStore((s) => s.edges)
  const pois = useNavmapStore((s) => s.pois)
  const waypoints = useNavmapStore((s) => s.waypoints)
  const deleteEdge = useNavmapStore((s) => s.deleteEdge)
  const setStatus = useNavmapStore((s) => s.setStatus)

  const labelOf = (id: string, type: 'poi' | 'waypoint'): string => {
    if (type === 'poi') return pois.find((p) => p.id === id)?.name ?? id
    return waypoints.find((w) => w.id === id)?.label ?? id
  }

  return (
    <div className="space-y-1 rounded-lg border border-border bg-panel-2 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted">Conexiones</div>
        <div className="font-mono text-[11px] text-muted">{edges.length}</div>
      </div>
      <div className="max-h-[120px] space-y-1 overflow-y-auto pr-1">
        {edges.length === 0 ? (
          <div className="py-2 text-center text-[11px] text-muted">Sin conexiones.</div>
        ) : (
          edges.map((e) => (
            <div
              key={e.id}
              className="group flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-xs hover:border-border hover:bg-panel"
            >
              <span className="h-2.5 w-2.5 rounded-full bg-accent-orange" />
              <div className="min-w-0 flex-1 truncate">
                <span className="text-text">{labelOf(e.from, e.fromType)}</span>
                <span className="text-muted"> → </span>
                <span className="text-text">{labelOf(e.to, e.toType)}</span>
              </div>
              <span className="font-mono text-[10px] text-muted">{e.weight.toFixed(2)}m</span>
              <button
                type="button"
                onClick={() => {
                  deleteEdge(e.id)
                  setStatus('Conexión eliminada.')
                }}
                className="rounded px-1.5 text-muted opacity-0 hover:bg-accent-red/15 hover:text-accent-red group-hover:opacity-100"
                title="Eliminar"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
