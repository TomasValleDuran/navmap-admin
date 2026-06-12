import { useNavmapStore } from '../store/useNavmapStore'

export function AnchorList() {
  const anchors = useNavmapStore((s) => s.anchors)
  const deleteAnchor = useNavmapStore((s) => s.deleteAnchor)
  const setStatus = useNavmapStore((s) => s.setStatus)

  return (
    <div className="space-y-1 rounded-lg border border-border bg-panel-2 p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted">Anclas AR</div>
        <div className="font-mono text-[11px] text-muted">{anchors.length}</div>
      </div>
      <div className="max-h-[110px] space-y-1 overflow-y-auto pr-1">
        {anchors.length === 0 ? (
          <div className="py-2 text-center text-[11px] text-muted">
            Sin anclas. Marcá 2–3 puntos físicos identificables para alinear el mapa en AR.
          </div>
        ) : (
          anchors.map((a) => (
            <div
              key={a.id}
              className="group flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-xs hover:border-border hover:bg-panel"
            >
              <span className="h-2.5 w-2.5 rotate-45 bg-accent-pink" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-text">{a.label}</div>
                {a.desc && <div className="truncate text-[10px] text-muted">{a.desc}</div>}
              </div>
              <button
                type="button"
                onClick={() => {
                  deleteAnchor(a.id)
                  setStatus(`Ancla "${a.label}" eliminada.`)
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
