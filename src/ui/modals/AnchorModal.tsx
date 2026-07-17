import { useEffect, useState } from 'react'
import { useNavmapStore } from '../../store/useNavmapStore'
import { ModalShell } from './ModalShell'

export function AnchorModal() {
  const mode = useNavmapStore((s) => s.mode)
  const pendingPoint = useNavmapStore((s) => s.pendingPoint)
  const setPendingPoint = useNavmapStore((s) => s.setPendingPoint)
  const addAnchor = useNavmapStore((s) => s.addAnchor)
  const setStatus = useNavmapStore((s) => s.setStatus)
  const activeFloor = useNavmapStore((s) => s.floors.find((f) => f.id === s.activeFloorId))

  const open = !!pendingPoint && mode === 'anchor'

  const [label, setLabel] = useState('')
  const [desc, setDesc] = useState('')

  useEffect(() => {
    if (open) {
      setLabel('')
      setDesc('')
    }
  }, [open])

  const close = () => setPendingPoint(null)
  const confirm = () => {
    const a = addAnchor({ label: label.trim(), desc: desc.trim(), floor: activeFloor?.level ?? 0 })
    if (a) setStatus(`Punto de anclaje "${a.label}" agregado.`)
  }

  return (
    <ModalShell
      open={open}
      onClose={close}
      onConfirm={confirm}
      title="Nuevo punto de anclaje"
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
            className="rounded-md bg-accent-pink/90 px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-pink"
          >
            Agregar
          </button>
        </>
      }
    >
      <p className="text-[11px] text-muted">
        Marcá un punto físico fácil de identificar en el lugar real (esquina de puerta, cartel,
        QR pegado). El viewer AR usa 2–3 anclas para alinear el mapa con el mundo real.
      </p>
      {pendingPoint && (
        <div className="rounded-md border border-border bg-panel-2 px-3 py-2 font-mono text-xs text-muted">
          x: {pendingPoint.x.toFixed(3)} &nbsp; y: {pendingPoint.y.toFixed(3)} &nbsp; z: {pendingPoint.z.toFixed(3)}
        </div>
      )}
      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wider text-muted">Etiqueta</span>
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Auto: ANCLA-N"
          className="w-full rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm focus:border-accent-blue focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wider text-muted">
          Cómo ubicarlo en el lugar (opcional)
        </span>
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="Ej: esquina inferior derecha de la puerta del aula 3"
          className="w-full rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm focus:border-accent-blue focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wider text-muted">Piso</span>
        <div className="rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm text-muted">
          {activeFloor ? `${activeFloor.name} (nivel ${activeFloor.level})` : '—'}
        </div>
      </label>
    </ModalShell>
  )
}
