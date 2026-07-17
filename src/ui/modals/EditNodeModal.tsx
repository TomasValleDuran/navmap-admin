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

export function EditNodeModal() {
  const editingNode = useNavmapStore((s) => s.editingNode)
  const cancelEdit = useNavmapStore((s) => s.cancelEdit)
  const pois = useNavmapStore((s) => s.pois)
  const waypoints = useNavmapStore((s) => s.waypoints)
  const editPOI = useNavmapStore((s) => s.editPOI)
  const editWaypoint = useNavmapStore((s) => s.editWaypoint)
  const deleteNode = useNavmapStore((s) => s.deleteNode)
  const setStatus = useNavmapStore((s) => s.setStatus)

  const open = !!editingNode
  const node = editingNode
    ? editingNode.nodeType === 'poi'
      ? pois.find((p) => p.id === editingNode.id)
      : waypoints.find((w) => w.id === editingNode.id)
    : null

  const [name, setName] = useState('')
  const [type, setType] = useState<POIType>('other')
  const [desc, setDesc] = useState('')
  const [label, setLabel] = useState('')
  const [floor, setFloor] = useState(0)
  const [qr, setQr] = useState('')

  useEffect(() => {
    if (!node || !editingNode) return
    if (editingNode.nodeType === 'poi') {
      const p = node as (typeof pois)[number]
      setName(p.name); setType(p.type); setDesc(p.desc); setFloor(p.floor); setQr(p.qr ?? '')
    } else {
      const w = node as (typeof waypoints)[number]
      setLabel(w.label); setFloor(w.floor); setQr(w.qr ?? '')
    }
  }, [editingNode, node, pois, waypoints])

  if (!open || !node || !editingNode) return null

  const confirm = () => {
    const qrValue = qr.trim() || undefined
    if (editingNode.nodeType === 'poi') {
      editPOI(editingNode.id, { name: name.trim() || 'POI', type, desc: desc.trim(), floor, qr: qrValue })
      setStatus(`POI "${name}" actualizado.`)
    } else {
      editWaypoint(editingNode.id, { label: label.trim() || 'WP', floor, qr: qrValue })
      setStatus(`Waypoint actualizado.`)
    }
    cancelEdit()
  }

  const remove = () => {
    deleteNode(editingNode.id, editingNode.nodeType)
    setStatus('Nodo eliminado.')
    cancelEdit()
  }

  return (
    <ModalShell
      open={open}
      onClose={cancelEdit}
      onConfirm={confirm}
      title={editingNode.nodeType === 'poi' ? 'Editar POI' : 'Editar Waypoint'}
      footer={
        <>
          <button
            type="button"
            onClick={remove}
            className="mr-auto rounded-md border border-accent-red/40 bg-accent-red/10 px-3 py-1.5 text-sm text-accent-red hover:bg-accent-red/20"
          >
            Eliminar
          </button>
          <button
            type="button"
            onClick={cancelEdit}
            className="rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm hover:border-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            className="rounded-md bg-accent-blue/90 px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-blue"
          >
            Guardar
          </button>
        </>
      }
    >
      <div className="rounded-md border border-border bg-panel-2 px-3 py-2 font-mono text-xs text-muted">
        <div>id: {node.id}</div>
        <div>x: {node.x.toFixed(3)} &nbsp; y: {node.y.toFixed(3)} &nbsp; z: {node.z.toFixed(3)}</div>
      </div>
      {editingNode.nodeType === 'poi' ? (
        <>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-muted">Nombre</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm focus:border-accent-blue focus:outline-none"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-muted">Tipo</span>
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
          </label>
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-muted">Descripción</span>
            <input
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              className="w-full rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm focus:border-accent-blue focus:outline-none"
            />
          </label>
        </>
      ) : (
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-muted">Etiqueta</span>
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm focus:border-accent-green focus:outline-none"
          />
        </label>
      )}
      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wider text-muted">Piso (nivel)</span>
        <div className="rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm text-muted">
          {floor}
        </div>
      </label>
      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wider text-muted">Código QR (opcional)</span>
        <input
          value={qr}
          onChange={(e) => setQr(e.target.value)}
          placeholder="Vacío = se usa el ID del nodo"
          className="w-full rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm focus:border-accent-blue focus:outline-none"
        />
      </label>
    </ModalShell>
  )
}
