import { BrickWall, Eye, EyeOff, Fence, Trash2 } from 'lucide-react'
import { useNavmapStore } from '../store/useNavmapStore'
import { formatColmapDistance } from '../lib/coordTransforms'
import type { WallKind } from '../types/navmap'

const KIND_META: Record<WallKind, { label: string; hint: string; Icon: typeof Fence }> = {
  wall: {
    label: 'Pared',
    hint: 'Muro opaco: corta el paso y la vista.',
    Icon: BrickWall,
  },
  railing: {
    label: 'Baranda',
    hint: 'Baranda o vidrio: corta el paso, pero se ve a través.',
    Icon: Fence,
  },
}

export function WallList() {
  const walls = useNavmapStore((s) => s.walls)
  const wallKind = useNavmapStore((s) => s.wallKind)
  const setWallKind = useNavmapStore((s) => s.setWallKind)
  const deleteWall = useNavmapStore((s) => s.deleteWall)
  const showWalls = useNavmapStore((s) => s.showWalls)
  const toggleShowWalls = useNavmapStore((s) => s.toggleShowWalls)
  const mode = useNavmapStore((s) => s.mode)
  const setMode = useNavmapStore((s) => s.setMode)
  const setStatus = useNavmapStore((s) => s.setStatus)
  const transform = useNavmapStore((s) => s.transform)
  const metersPerViewerUnit = useNavmapStore((s) => s.metersPerViewerUnit)
  const selectedWallId = useNavmapStore((s) => s.selectedWallId)
  const selectWall = useNavmapStore((s) => s.selectWall)
  const setHoveredWall = useNavmapStore((s) => s.setHoveredWall)

  const drawing = mode === 'wall'

  return (
    <div className="space-y-2 rounded-lg border border-border bg-panel-2 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
          <BrickWall size={12} /> Paredes
        </div>
        <div className="ml-auto font-mono text-[11px] text-muted">{walls.length}</div>
        <button
          type="button"
          onClick={toggleShowWalls}
          title={showWalls ? 'Ocultar en el visor' : 'Mostrar en el visor'}
          className="rounded p-1 text-muted hover:bg-panel-2 hover:text-text"
        >
          {showWalls ? <Eye size={13} /> : <EyeOff size={13} />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {(Object.keys(KIND_META) as WallKind[]).map((k) => {
          const { label, hint, Icon } = KIND_META[k]
          const active = wallKind === k
          return (
            <button
              key={k}
              type="button"
              title={hint}
              onClick={() => {
                setWallKind(k)
                if (!drawing) setMode('wall')
                setStatus(`${hint} Click en los dos extremos.`)
              }}
              className={`flex items-center gap-1.5 rounded-md border px-2 py-1.5 text-xs transition ${
                active
                  ? 'border-accent-blue/60 bg-accent-blue/15 text-text'
                  : 'border-border bg-panel text-muted hover:border-accent-blue/40 hover:text-text'
              }`}
            >
              <Icon size={13} className={active ? 'text-accent-blue' : ''} />
              {label}
            </button>
          )
        })}
      </div>

      <p className="text-[10px] leading-relaxed text-muted">
        {drawing
          ? 'Click en los dos extremos de la pared, sobre el piso. Esc cancela el segmento a medias.'
          : 'La nube sparse no muestra las paredes lisas: marcalas a mano. La baranda corta el paso pero no la vista, así que la app sigue mostrando lo que hay del otro lado.'}
      </p>

      {walls.length > 0 && (
        <div
          className="max-h-[160px] space-y-1 overflow-y-auto pr-1"
          onMouseLeave={() => setHoveredWall(null)}
        >
          {walls.map((w, i) => {
            const { Icon, label } = KIND_META[w.kind]
            const len = Math.hypot(w.bx - w.ax, w.by - w.ay, w.bz - w.az)
            const lit = selectedWallId === w.id
            return (
              <div
                key={w.id}
                onMouseEnter={() => setHoveredWall(w.id)}
                className={`flex items-center gap-2 rounded-md border px-2 py-1 text-[11px] transition ${
                  lit ? 'border-accent-yellow/70 bg-accent-yellow/10' : 'border-border bg-panel'
                }`}
              >
                {/* La fila entera prende la pared en el 3-D: sin nombre, ésa es la única forma
                    de saber cuál de todas es. Volver a tocarla la apaga. */}
                <button
                  type="button"
                  onClick={() => selectWall(w.id)}
                  title={lit ? 'Dejar de resaltarla' : 'Resaltarla en el visor'}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <Icon
                    size={12}
                    className={
                      lit
                        ? 'text-accent-yellow'
                        : w.kind === 'railing'
                          ? 'text-accent-green'
                          : 'text-accent-red'
                    }
                  />
                  <span className={`truncate ${lit ? 'text-text' : 'text-muted'}`}>
                    {label} {i + 1} ·{' '}
                    {formatColmapDistance(len, transform.scale, metersPerViewerUnit, 1)}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => deleteWall(w.id)}
                  title="Borrar"
                  className="rounded p-0.5 text-muted hover:bg-panel-2 hover:text-accent-red"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
