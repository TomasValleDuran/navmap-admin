import { Anchor, ArrowUpDown, Crosshair, Eye, GitBranch, MapPin, Navigation, Ruler } from 'lucide-react'
import { useNavmapStore } from '../store/useNavmapStore'
import type { Mode } from '../types/navmap'
import type { LucideIcon } from 'lucide-react'

const MODES: { key: Mode; label: string; hint: string; Icon: LucideIcon; shortcut: string }[] = [
  { key: 'view', label: 'Ver', hint: 'Solo cámara, sin edición.', Icon: Eye, shortcut: '1' },
  { key: 'poi', label: 'POI', hint: 'Click en el piso para crear un POI.', Icon: MapPin, shortcut: '2' },
  { key: 'waypoint', label: 'Waypoint', hint: 'Click en el piso para crear un waypoint.', Icon: Navigation, shortcut: '3' },
  { key: 'edge', label: 'Conectar', hint: 'Click en dos nodos para conectarlos.', Icon: GitBranch, shortcut: '4' },
  { key: 'select', label: 'Seleccionar', hint: 'Click en un nodo para inspeccionarlo.', Icon: Crosshair, shortcut: '5' },
  { key: 'measure', label: 'Medir', hint: 'Click en dos puntos del modelo para medir.', Icon: Ruler, shortcut: '6' },
  { key: 'anchor', label: 'Ancla AR', hint: 'Click en un punto físico identificable para crear un ancla de alineación AR.', Icon: Anchor, shortcut: '7' },
  { key: 'connect-floors', label: 'Conectar pisos', hint: 'Click en un nodo, cambiá de piso y click en otro nodo para conectarlos (escaleras/ascensor).', Icon: ArrowUpDown, shortcut: '8' },
]

export function ModePicker() {
  const mode = useNavmapStore((s) => s.mode)
  const setMode = useNavmapStore((s) => s.setMode)
  const setStatus = useNavmapStore((s) => s.setStatus)

  const onPick = (m: Mode) => {
    setMode(m)
    const def = MODES.find((x) => x.key === m)
    if (def) setStatus(def.hint)
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-panel-2 p-3">
      <div className="text-xs font-medium uppercase tracking-wider text-muted">Modo</div>
      <div className="flex flex-col gap-1">
        {MODES.map((m) => {
          const active = mode === m.key
          const Icon = m.Icon
          return (
            <button
              key={m.key}
              type="button"
              title={`${m.label} (${m.shortcut})`}
              onClick={() => onPick(m.key)}
              className={`flex items-center gap-2.5 rounded-md border px-2.5 py-2 text-left text-sm transition ${
                active
                  ? 'border-accent-blue/60 bg-accent-blue/15 text-text'
                  : 'border-border bg-panel text-muted hover:border-accent-blue/40 hover:text-text'
              }`}
            >
              <Icon size={16} className={active ? 'text-accent-blue' : ''} />
              <span className="flex-1">{m.label}</span>
              <span
                className={`rounded px-1.5 font-mono text-[10px] ${
                  active ? 'bg-accent-blue/20 text-accent-blue' : 'bg-panel-2 text-muted'
                }`}
              >
                {m.shortcut}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const MODE_LABELS = Object.fromEntries(MODES.map((m) => [m.key, m])) as Record<
  Mode,
  (typeof MODES)[number]
>
