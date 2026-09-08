import { Eye, ScanEye, X } from 'lucide-react'
import { useSightSimulation } from '../hooks/useSightSimulation'
import { useNavmapStore } from '../store/useNavmapStore'
import { SIGHT_CLEARANCE_M } from '../lib/visibility'

/**
 * Resultado de la simulación de visibilidad, en palabras.
 *
 * El 3-D muestra los rayos; acá va lo que no se lee de un vistazo: cuántos nodos se caen y
 * cuáles, que es lo que después vas a ir a buscar al edificio.
 */
export function SightPanel() {
  const mode = useNavmapStore((s) => s.mode)
  const setMode = useNavmapStore((s) => s.setMode)
  const setStatus = useNavmapStore((s) => s.setStatus)
  const sightPoint = useNavmapStore((s) => s.sightPoint)
  const setSightPoint = useNavmapStore((s) => s.setSightPoint)
  const showVisible = useNavmapStore((s) => s.sightShowVisible)
  const toggleShowVisible = useNavmapStore((s) => s.toggleSightShowVisible)
  const pois = useNavmapStore((s) => s.pois)
  const waypoints = useNavmapStore((s) => s.waypoints)
  const walls = useNavmapStore((s) => s.walls)
  const edges = useNavmapStore((s) => s.edges)
  const sight = useSightSimulation()

  const total = pois.length + waypoints.length
  const opaqueWalls = walls.filter((w) => w.kind === 'wall').length

  const hiddenNames = sight
    ? [
        ...pois.filter((p) => sight.hidden.has(p.id)).map((p) => p.name),
        ...waypoints.filter((w) => sight.hidden.has(w.id)).map((w) => w.label || w.id),
      ]
    : []

  return (
    <div className="space-y-2 rounded-lg border border-border bg-panel-2 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
          <ScanEye size={12} /> Visibilidad
        </div>
        {sightPoint && (
          <button
            type="button"
            onClick={() => {
              setSightPoint(null)
              setStatus('Simulación de visibilidad limpiada.')
            }}
            title="Quitar el punto de vista"
            className="rounded p-1 text-muted hover:bg-panel hover:text-accent-red"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {!sightPoint ? (
        <>
          <p className="text-[10px] leading-relaxed text-muted">
            Marcá un punto en el piso y se calcula qué nodos y aristas dibujaría la app parada ahí:
            verde llega, rojo lo tapa un muro. Es la misma cuenta que corre el teléfono en cada
            frame, con {SIGHT_CLEARANCE_M} m de tolerancia en cada extremo del rayo.
          </p>
          <button
            type="button"
            onClick={() => {
              setMode('sight')
              setStatus('Click en el piso donde estaría parado el usuario.')
            }}
            className={`w-full rounded-md border px-2 py-1.5 text-xs transition ${
              mode === 'sight'
                ? 'border-accent-blue/60 bg-accent-blue/15 text-text'
                : 'border-border bg-panel text-muted hover:border-accent-blue/40 hover:text-text'
            }`}
          >
            Marcar punto de vista
          </button>
        </>
      ) : (
        <>
          <div className="flex items-baseline gap-1.5 text-sm text-text">
            <span className="font-mono text-accent-green">{sight?.visible.size ?? 0}</span>
            <span className="text-[11px] text-muted">de {total} nodos visibles</span>
          </div>
          {sight && sight.hiddenEdges.size > 0 && (
            <div className="text-[11px] text-muted">
              <span className="font-mono text-accent-red">{sight.hiddenEdges.size}</span> de{' '}
              {edges.length} aristas se ocultarían (basta con que un extremo quede tapado).
            </div>
          )}

          {hiddenNames.length > 0 ? (
            <div className="space-y-1">
              <div className="text-[10px] uppercase tracking-wider text-muted">No vería</div>
              <div className="max-h-[120px] space-y-1 overflow-y-auto pr-1">
                {hiddenNames.map((n, i) => (
                  <div
                    key={`${n}-${i}`}
                    className="truncate rounded border border-border bg-panel px-2 py-1 text-[11px] text-muted"
                  >
                    {n}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-muted">
              {opaqueWalls === 0
                ? 'Sin paredes opacas marcadas en este piso, así que desde acá se ve todo. Marcá las paredes (0) para que la simulación tenga algo con qué tapar.'
                : 'Desde este punto se ven todos los nodos del piso.'}
            </p>
          )}

          <label className="flex items-center gap-2 text-[11px] text-muted">
            <input
              type="checkbox"
              checked={showVisible}
              onChange={toggleShowVisible}
              className="accent-accent-green"
            />
            <Eye size={11} /> Mostrar también los rayos que llegan
          </label>

          <p className="text-[10px] leading-relaxed text-muted">
            Las barandas no tapan: cortan el paso, no la vista. En el teléfono hay una excepción
            más — el próximo paso de la ruta se dibuja aunque esté detrás de una pared, para no
            dejarte sin la flecha.
          </p>
        </>
      )}
    </div>
  )
}
