import { useState } from 'react'
import { useNavmapStore } from '../store/useNavmapStore'
import { ConfirmModal } from './modals/ConfirmModal'

export function ClearAllButton() {
  const [open, setOpen] = useState(false)
  const pois = useNavmapStore((s) => s.pois.length)
  const waypoints = useNavmapStore((s) => s.waypoints.length)
  const edges = useNavmapStore((s) => s.edges.length)
  const clearAll = useNavmapStore((s) => s.clearAll)
  const setStatus = useNavmapStore((s) => s.setStatus)

  const empty = pois + waypoints + edges === 0

  return (
    <>
      <button
        type="button"
        disabled={empty}
        onClick={() => setOpen(true)}
        className="w-full rounded-md border border-accent-red/30 bg-accent-red/10 px-3 py-2 text-sm font-medium text-accent-red transition hover:bg-accent-red/20 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Limpiar todo
      </button>
      <ConfirmModal
        open={open}
        title="¿Limpiar todo?"
        message={`Se eliminarán ${pois} POIs, ${waypoints} waypoints y ${edges} conexiones. Esta acción no se puede deshacer.`}
        onCancel={() => setOpen(false)}
        onConfirm={() => {
          clearAll()
          setStatus('Todo eliminado.')
          setOpen(false)
        }}
        confirmLabel="Limpiar"
        danger
      />
    </>
  )
}
