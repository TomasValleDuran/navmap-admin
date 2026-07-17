import { useRef } from 'react'
import { Layers, Plus, Trash2, Upload } from 'lucide-react'
import { useNavmapStore } from '../store/useNavmapStore'
import { usePLYLoader } from '../hooks/usePLYLoader'

export function FloorBar() {
  const floors = useNavmapStore((s) => s.floors)
  const activeFloorId = useNavmapStore((s) => s.activeFloorId)
  const floorClouds = useNavmapStore((s) => s.floorClouds)
  const setActiveFloor = useNavmapStore((s) => s.setActiveFloor)
  const addFloor = useNavmapStore((s) => s.addFloor)
  const deleteFloor = useNavmapStore((s) => s.deleteFloor)
  const renameFloor = useNavmapStore((s) => s.renameFloor)
  const setStatus = useNavmapStore((s) => s.setStatus)
  const loadPLY = usePLYLoader()
  const fileRef = useRef<HTMLInputElement>(null)

  // floors sorted top-down (highest level first) like a building elevation
  const ordered = [...floors].sort((a, b) => b.level - a.level)

  const triggerLoad = (floorId: string) => {
    setActiveFloor(floorId)
    fileRef.current?.click()
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-panel-2 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
          <Layers size={13} /> Pisos
        </div>
        <button
          type="button"
          onClick={() => {
            const f = addFloor()
            setStatus(`Piso "${f.name}" agregado. Cargá su .PLY.`)
          }}
          className="flex items-center gap-1 rounded-md border border-border bg-panel px-2 py-0.5 text-[11px] text-text hover:border-accent-green/50"
          title="Agregar piso"
        >
          <Plus size={12} /> Piso
        </button>
      </div>

      <div className="space-y-1">
        {ordered.map((f) => {
          const active = f.id === activeFloorId
          const hasCloud = !!floorClouds[f.id]
          return (
            <div
              key={f.id}
              onClick={() => setActiveFloor(f.id)}
              className={`group flex cursor-pointer items-center gap-2 rounded-md border px-2 py-1.5 text-xs ${
                active
                  ? 'border-accent-blue/60 bg-accent-blue/10'
                  : 'border-transparent hover:border-border hover:bg-panel'
              }`}
            >
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${hasCloud ? 'bg-accent-green' : 'bg-muted/40'}`}
                title={hasCloud ? 'Nube cargada' : 'Sin nube'}
              />
              <span className="w-7 shrink-0 font-mono text-[10px] text-muted">P{f.level}</span>
              {active ? (
                <input
                  value={f.name}
                  onChange={(e) => renameFloor(f.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="min-w-0 flex-1 rounded border border-border bg-panel px-1 py-0.5 text-xs text-text outline-none focus:border-accent-blue/60"
                />
              ) : (
                <span className="min-w-0 flex-1 truncate text-text">{f.name}</span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  triggerLoad(f.id)
                }}
                title="Cargar .PLY en este piso"
                className="rounded px-1 text-muted hover:text-accent-blue"
              >
                <Upload size={12} />
              </button>
              {floors.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    deleteFloor(f.id)
                    setStatus(`Piso "${f.name}" eliminado.`)
                  }}
                  title="Eliminar piso"
                  className="rounded px-1 text-muted opacity-0 hover:text-accent-red group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          )
        })}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept=".ply"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) loadPLY(f)
          e.target.value = ''
        }}
      />
    </div>
  )
}
