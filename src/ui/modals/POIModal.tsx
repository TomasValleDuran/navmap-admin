import { useEffect, useState } from 'react'
import { useNavmapStore } from '../../store/useNavmapStore'
import type { POIType } from '../../types/navmap'
import { ModalShell } from './ModalShell'

const TYPES: { value: POIType; label: string }[] = [
  { value: 'bathroom', label: 'Baño' },
  { value: 'elevator', label: 'Ascensor' },
  { value: 'stairs', label: 'Escaleras' },
  { value: 'exit', label: 'Salida' },
  { value: 'classroom', label: 'Aula' },
  { value: 'office', label: 'Oficina' },
  { value: 'reception', label: 'Recepción' },
  { value: 'lab', label: 'Laboratorio' },
  { value: 'other', label: 'Otro' },
]

export function POIModal() {
  const mode = useNavmapStore((s) => s.mode)
  const pendingPoint = useNavmapStore((s) => s.pendingPoint)
  const setPendingPoint = useNavmapStore((s) => s.setPendingPoint)
  const addPOI = useNavmapStore((s) => s.addPOI)
  const setStatus = useNavmapStore((s) => s.setStatus)

  const open = !!pendingPoint && mode === 'poi'

  const [name, setName] = useState('')
  const [type, setType] = useState<POIType>('other')
  const [desc, setDesc] = useState('')
  const [floor, setFloor] = useState(0)

  useEffect(() => {
    if (open) {
      setName('')
      setType('other')
      setDesc('')
      setFloor(0)
    }
  }, [open])

  const close = () => setPendingPoint(null)
  const confirm = () => {
    const poi = addPOI({ name: name.trim() || 'POI', type, desc: desc.trim(), floor })
    if (poi) setStatus(`POI "${poi.name}" agregado.`)
  }

  return (
    <ModalShell
      open={open}
      onClose={close}
      onConfirm={confirm}
      title="Nuevo POI"
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
      <Field label="Nombre">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm focus:border-accent-blue focus:outline-none"
          placeholder="Ej: Baño planta baja"
        />
      </Field>
      <Field label="Tipo">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as POIType)}
          className="w-full rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm focus:border-accent-blue focus:outline-none"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Descripción (opcional)">
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          className="w-full rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm focus:border-accent-blue focus:outline-none"
        />
      </Field>
      <Field label="Piso">
        <input
          type="number"
          min={-5}
          max={50}
          value={floor}
          onChange={(e) => setFloor(parseInt(e.target.value || '0', 10))}
          className="w-24 rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm focus:border-accent-blue focus:outline-none"
        />
      </Field>
    </ModalShell>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  )
}
