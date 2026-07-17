import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { useNavmapStore } from '../../store/useNavmapStore'
import { defaultAccessibleForKind } from '../../store/useNavmapStore'
import type { ConnectionKind } from '../../types/navmap'
import { ModalShell } from './ModalShell'

const KINDS: { value: ConnectionKind; label: string }[] = [
  { value: 'stairs', label: 'Escaleras' },
  { value: 'elevator', label: 'Ascensor' },
  { value: 'ramp', label: 'Rampa' },
  { value: 'escalator', label: 'Escalera mecánica' },
]

/** Look up a node's display name across all floors. */
function nodeName(id: string | undefined, floors: ReturnType<typeof useNavmapStore.getState>['floors']): string {
  if (!id) return '—'
  for (const f of floors) {
    const p = f.pois.find((n) => n.id === id)
    if (p) return p.name
    const w = f.waypoints.find((n) => n.id === id)
    if (w) return w.label
  }
  return id
}

export function ConnectionModal() {
  const mode = useNavmapStore((s) => s.mode)
  const connectStart = useNavmapStore((s) => s.connectStart)
  const selectedNode = useNavmapStore((s) => s.selectedNode)
  const activeFloorId = useNavmapStore((s) => s.activeFloorId)
  const floors = useNavmapStore((s) => s.floors)
  const addConnection = useNavmapStore((s) => s.addConnection)
  const selectNode = useNavmapStore((s) => s.selectNode)
  const setStatus = useNavmapStore((s) => s.setStatus)

  const open =
    mode === 'connect-floors' &&
    !!connectStart &&
    !!selectedNode &&
    selectedNode.id !== connectStart.id &&
    connectStart.floorId !== activeFloorId

  const startFloor = floors.find((f) => f.id === connectStart?.floorId)
  const targetFloor = floors.find((f) => f.id === activeFloorId)
  const defaultRise = useMemo(() => {
    if (!startFloor || !targetFloor) return 0
    return Math.abs(targetFloor.elevation_m - startFloor.elevation_m)
  }, [startFloor, targetFloor])

  const [kind, setKind] = useState<ConnectionKind>('stairs')
  const [accessible, setAccessible] = useState(false)
  const [rise, setRise] = useState('0')
  const [steps, setSteps] = useState('')
  const [length, setLength] = useState('')
  const [showOptional, setShowOptional] = useState(false)
  const [wasOpen, setWasOpen] = useState(false)

  // Reset fields when the modal opens (set-state-during-render, no effect needed).
  if (open && !wasOpen) {
    setWasOpen(true)
    setKind('stairs')
    setAccessible(defaultAccessibleForKind('stairs'))
    setRise(defaultRise.toFixed(2))
    setSteps('')
    setLength('')
    setShowOptional(false)
  } else if (!open && wasOpen) {
    setWasOpen(false)
  }

  if (!open) return null

  const close = () => selectNode(null)

  const confirm = () => {
    const conn = addConnection({
      kind,
      accessible,
      rise_m: parseFloat(rise) || 0,
      steps: steps.trim() ? parseInt(steps, 10) : undefined,
      length_m: length.trim() ? parseFloat(length) : undefined,
    })
    selectNode(null)
    setStatus(conn ? `Conexión ${kind} creada entre pisos.` : 'Conexión duplicada o inválida.')
  }

  return (
    <ModalShell
      open={open}
      onClose={close}
      onConfirm={confirm}
      title="Conexión entre pisos"
      footer={
        <>
          <button
            type="button"
            onClick={close}
            className="rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm hover:border-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            className="rounded-md bg-accent-blue/90 px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-blue"
          >
            Crear conexión
          </button>
        </>
      }
    >
      <div className="rounded-md border border-border bg-panel-2 px-3 py-2 text-xs text-muted">
        <div>
          <span className="text-text">{nodeName(connectStart?.id, floors)}</span>{' '}
          (P{startFloor?.level}) →{' '}
          <span className="text-text">{nodeName(selectedNode?.id, floors)}</span>{' '}
          (P{targetFloor?.level})
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wider text-muted">Tipo</span>
        <select
          value={kind}
          onChange={(e) => {
            const k = e.target.value as ConnectionKind
            setKind(k)
            setAccessible(defaultAccessibleForKind(k))
          }}
          className="w-full rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm focus:border-accent-blue focus:outline-none"
        >
          {KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={accessible}
          onChange={(e) => setAccessible(e.target.checked)}
          className="accent-accent-green"
        />
        Accesible (sin escalones — ascensor / rampa)
      </label>

      <p className="text-[11px] text-muted">
        El costo de la ruta lo definen los perfiles de navegación según el tipo — no hace falta
        medir la escalera. Altura estimada automáticamente:{' '}
        <span className="font-mono text-text">{(parseFloat(rise) || 0).toFixed(1)} m</span>{' '}
        (de las elevaciones de piso).
      </p>

      <button
        type="button"
        onClick={() => setShowOptional((v) => !v)}
        className="flex items-center gap-1 text-[11px] text-muted hover:text-text"
      >
        {showOptional ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        Datos opcionales (no afectan la ruta)
      </button>

      {showOptional && (
        <div className="grid grid-cols-3 gap-2 rounded-md border border-border bg-panel px-2 py-2">
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted">Altura (m)</span>
            <input
              type="number"
              step={0.1}
              value={rise}
              onChange={(e) => setRise(e.target.value)}
              className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm focus:border-accent-blue focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted">Escalones</span>
            <input
              type="number"
              step={1}
              value={steps}
              placeholder="—"
              onChange={(e) => setSteps(e.target.value)}
              className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm focus:border-accent-blue focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted">Largo (m)</span>
            <input
              type="number"
              step={0.1}
              value={length}
              placeholder="—"
              onChange={(e) => setLength(e.target.value)}
              className="w-full rounded-md border border-border bg-panel-2 px-2 py-1.5 text-sm focus:border-accent-blue focus:outline-none"
            />
          </label>
        </div>
      )}
    </ModalShell>
  )
}
