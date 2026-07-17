import { useMemo, useState } from 'react'
import { Route } from 'lucide-react'
import { useNavmapStore } from '../store/useNavmapStore'
import { computeRoute } from '../lib/routing'

type ProfileKey = 'default' | 'accessible'

interface NodeOption {
  id: string
  label: string
  level: number
}

export function RoutePreviewPanel() {
  const floors = useNavmapStore((s) => s.floors)
  const connections = useNavmapStore((s) => s.connections)
  const routingProfiles = useNavmapStore((s) => s.routingProfiles)

  const options = useMemo<NodeOption[]>(() => {
    const out: NodeOption[] = []
    for (const f of [...floors].sort((a, b) => a.level - b.level)) {
      for (const p of f.pois) out.push({ id: p.id, label: `P${f.level} · ${p.name}`, level: f.level })
      for (const w of f.waypoints) out.push({ id: w.id, label: `P${f.level} · ${w.label}`, level: f.level })
    }
    return out
  }, [floors])

  const [startId, setStartId] = useState('')
  const [endId, setEndId] = useState('')
  const [profile, setProfile] = useState<ProfileKey>('default')

  const result = useMemo(() => {
    if (!startId || !endId || startId === endId) return null
    return computeRoute({
      floors,
      connections,
      profile: routingProfiles[profile],
      startId,
      endId,
    })
  }, [startId, endId, profile, floors, connections, routingProfiles])

  const labelOf = (id: string) => options.find((o) => o.id === id)?.label ?? id
  const connKind = (id: string) => connections.find((c) => c.id === id)?.kind ?? '?'

  return (
    <div className="space-y-2 rounded-lg border border-border bg-panel-2 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
        <Route size={13} /> Vista previa de ruta
      </div>

      {options.length < 2 ? (
        <div className="py-2 text-center text-[11px] text-muted">
          Agregá al menos dos nodos para previsualizar rutas.
        </div>
      ) : (
        <>
          <label className="block">
            <span className="mb-0.5 block text-[10px] uppercase tracking-wider text-muted">Desde</span>
            <select
              value={startId}
              onChange={(e) => setStartId(e.target.value)}
              className="w-full rounded-md border border-border bg-panel px-2 py-1 text-xs text-text outline-none focus:border-accent-blue/60"
            >
              <option value="">—</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-0.5 block text-[10px] uppercase tracking-wider text-muted">Hasta</span>
            <select
              value={endId}
              onChange={(e) => setEndId(e.target.value)}
              className="w-full rounded-md border border-border bg-panel px-2 py-1 text-xs text-text outline-none focus:border-accent-blue/60"
            >
              <option value="">—</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.label}</option>
              ))}
            </select>
          </label>

          <div className="flex gap-1">
            {(['default', 'accessible'] as ProfileKey[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setProfile(p)}
                className={`flex-1 rounded-md border px-2 py-1 text-[11px] ${
                  profile === p
                    ? 'border-accent-blue/60 bg-accent-blue/15 text-text'
                    : 'border-border bg-panel text-muted hover:text-text'
                }`}
              >
                {p === 'default' ? 'Normal' : 'Accesible'}
              </button>
            ))}
          </div>

          {result && (
            <div className="space-y-1 rounded-md border border-border bg-panel px-2 py-2 text-xs">
              {result.found ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted">Costo</span>
                    <span className="font-mono text-text">{result.cost.toFixed(1)} m-eq</span>
                  </div>
                  <div className="text-muted">
                    {result.path.length} nodos
                    {result.connectionsUsed.length > 0
                      ? ` · ${result.connectionsUsed.map(connKind).join(', ')}`
                      : ' · mismo piso'}
                  </div>
                  <div className="max-h-24 overflow-y-auto text-[10px] text-muted">
                    {result.path.map((id) => labelOf(id)).join('  →  ')}
                  </div>
                </>
              ) : (
                <div className="text-accent-orange">
                  Sin ruta {profile === 'accessible' ? '(accesible)' : ''} entre esos nodos.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
