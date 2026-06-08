import { useNavmapStore } from '../store/useNavmapStore'
import { POI_COLORS } from '../lib/coordTransforms'

export function POIList() {
  const pois = useNavmapStore((s) => s.pois)
  const mode = useNavmapStore((s) => s.mode)
  const selectNode = useNavmapStore((s) => s.selectNode)
  const deleteNode = useNavmapStore((s) => s.deleteNode)
  const setStatus = useNavmapStore((s) => s.setStatus)
  const selectedNode = useNavmapStore((s) => s.selectedNode)

  return (
    <div className="space-y-1 rounded-lg border border-border bg-panel-2 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted">POIs</div>
        <div className="font-mono text-[11px] text-muted">{pois.length}</div>
      </div>
      <div className="max-h-[150px] space-y-1 overflow-y-auto pr-1">
        {pois.length === 0 ? (
          <div className="py-2 text-center text-[11px] text-muted">Sin POIs todavía.</div>
        ) : (
          pois.map((p) => {
            const sel = selectedNode?.id === p.id
            const color = `#${POI_COLORS[p.type].toString(16).padStart(6, '0')}`
            return (
              <div
                key={p.id}
                className={`group flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${
                  sel ? 'border-accent-blue/60 bg-accent-blue/10' : 'border-transparent hover:border-border hover:bg-panel'
                }`}
                onClick={() => {
                  if (mode === 'select') selectNode({ id: p.id, nodeType: 'poi' })
                }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-text">{p.name}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">
                    {p.type} · P{p.floor}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteNode(p.id, 'poi')
                    setStatus(`POI "${p.name}" eliminado.`)
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
