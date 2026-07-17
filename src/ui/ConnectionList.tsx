import { ArrowUpDown, Accessibility } from 'lucide-react'
import { useNavmapStore } from '../store/useNavmapStore'
import type { ConnectionKind } from '../types/navmap'

const KIND_LABEL: Record<ConnectionKind, string> = {
  stairs: 'Escaleras',
  elevator: 'Ascensor',
  ramp: 'Rampa',
  escalator: 'Esc. mecánica',
}

export function ConnectionList() {
  const connections = useNavmapStore((s) => s.connections)
  const floors = useNavmapStore((s) => s.floors)
  const deleteConnection = useNavmapStore((s) => s.deleteConnection)
  const setStatus = useNavmapStore((s) => s.setStatus)

  const nodeName = (id: string): string => {
    for (const f of floors) {
      const p = f.pois.find((n) => n.id === id)
      if (p) return p.name
      const w = f.waypoints.find((n) => n.id === id)
      if (w) return w.label
    }
    return id
  }

  return (
    <div className="space-y-1 rounded-lg border border-border bg-panel-2 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
          <ArrowUpDown size={12} /> Entre pisos
        </div>
        <div className="font-mono text-[11px] text-muted">{connections.length}</div>
      </div>
      <div className="max-h-[140px] space-y-1 overflow-y-auto pr-1">
        {connections.length === 0 ? (
          <div className="py-2 text-center text-[11px] text-muted">Sin conexiones entre pisos.</div>
        ) : (
          connections.map((c) => (
            <div
              key={c.id}
              className="group flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-xs hover:border-border hover:bg-panel"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-text">
                  {nodeName(c.from)} <span className="text-muted">↔</span> {nodeName(c.to)}
                </div>
                <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted">
                  {KIND_LABEL[c.kind]} · P{c.floorFrom}→P{c.floorTo} · {c.rise_m.toFixed(1)}m
                  {c.accessible && (
                    <Accessibility size={11} className="text-accent-green" aria-label="Accesible" />
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  deleteConnection(c.id)
                  setStatus('Conexión entre pisos eliminada.')
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
