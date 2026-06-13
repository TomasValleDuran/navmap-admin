import { useEffect, useState } from 'react'
import { useNavmapStore } from '../../store/useNavmapStore'
import { ModalShell } from './ModalShell'

export function WaypointModal() {
  const mode = useNavmapStore((s) => s.mode)
  const pendingPoint = useNavmapStore((s) => s.pendingPoint)
  const setPendingPoint = useNavmapStore((s) => s.setPendingPoint)
  const addWaypoint = useNavmapStore((s) => s.addWaypoint)
  const setStatus = useNavmapStore((s) => s.setStatus)

  const open = !!pendingPoint && mode === 'waypoint'

  const [label, setLabel] = useState('')
  const [floor, setFloor] = useState(0)
  const [qr, setQr] = useState('')

  useEffect(() => {
    if (open) {
      setLabel('')
      setFloor(0)
      setQr('')
    }
  }, [open])

  const close = () => setPendingPoint(null)
  const confirm = () => {
    const wp = addWaypoint({ label: label.trim(), floor, qr })
    if (wp) setStatus(`Waypoint "${wp.label}" agregado (id: ${wp.id}).`)
  }

  return (
    <ModalShell
      open={open}
      onClose={close}
      onConfirm={confirm}
      title="Nuevo Waypoint"
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
            className="rounded-md bg-accent-green/90 px-4 py-1.5 text-sm font-medium text-base hover:bg-accent-green"
          >
            Agregar
          </button>
        </>
      }
    >
      {pendingPoint && (
        <div className="rounded-md border border-border bg-panel-2 px-3 py-2 font-mono text-xs text-muted">
          x: {pendingPoint.x.toFixed(3)} &nbsp; y: {pendingPoint.y.toFixed(3)} &nbsp; z: {pendingPoint.z.toFixed(3)}
        </div>
      )}
      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wider text-muted">Etiqueta (opcional)</span>
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Auto: WP-N"
          className="w-full rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm focus:border-accent-green focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wider text-muted">Piso</span>
        <input
          type="number"
          min={-5}
          max={50}
          value={floor}
          onChange={(e) => setFloor(parseInt(e.target.value || '0', 10))}
          className="w-24 rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm focus:border-accent-green focus:outline-none"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wider text-muted">Código QR (opcional)</span>
        <input
          value={qr}
          onChange={(e) => setQr(e.target.value)}
          placeholder="Vacío = se usa el ID del nodo"
          className="w-full rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm focus:border-accent-green focus:outline-none"
        />
      </label>
    </ModalShell>
  )
}
