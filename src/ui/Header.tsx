import { useRef } from 'react'
import { Download, Upload, Upload as FileUp } from 'lucide-react'
import { usePLYLoader } from '../hooks/usePLYLoader'
import { useNavmapStore } from '../store/useNavmapStore'
import { downloadJSON, parseImportJSON } from '../lib/jsonIO'

export function Header() {
  const plyInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const loadPLY = usePLYLoader()
  const setStatus = useNavmapStore((s) => s.setStatus)
  const importState = useNavmapStore((s) => s.importState)

  const onExport = () => {
    const s = useNavmapStore.getState()
    if (!s.pois.length && !s.waypoints.length) {
      alert('Nada para exportar. Agregá POIs o waypoints primero.')
      return
    }
    downloadJSON({
      pois: s.pois,
      waypoints: s.waypoints,
      edges: s.edges,
      transform: s.transform,
      floorHeightViewer: s.floorHeightViewer,
      metersPerViewerUnit: s.metersPerViewerUnit,
    })
    setStatus(`Exportado: ${s.pois.length} POIs · ${s.waypoints.length} WPs · ${s.edges.length} edges.`)
  }

  const onImport = async (file: File) => {
    try {
      const text = await file.text()
      const r = parseImportJSON(text)
      importState({
        pois: r.pois,
        waypoints: r.waypoints,
        edges: r.edges,
        transform: r.transform,
        floorHeightViewer: r.floorHeightViewer,
        metersPerViewerUnit: r.metersPerViewerUnit,
      })
      setStatus(
        `Importado (v${r.version}): ${r.pois.length} POIs · ${r.waypoints.length} WPs · ${r.edges.length} edges.`,
      )
      if (r.version === '1') {
        alert('Formato v1 importado parcialmente (sin coordenadas originales COLMAP).')
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      alert('Error leyendo JSON: ' + msg)
      setStatus('Error leyendo JSON.')
    }
  }

  return (
    <header className="flex h-12 items-center justify-between border-b border-border bg-panel px-4">
      <div className="flex items-center gap-3">
        <span className="rounded bg-accent-blue/15 px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-accent-blue">
          NavMap Admin
        </span>
        <span className="text-xs text-muted">v2 · react</span>
      </div>
      <div className="flex items-center gap-2">
        <HeaderButton onClick={() => plyInputRef.current?.click()} Icon={FileUp} label="Cargar .PLY" />
        <HeaderButton onClick={() => jsonInputRef.current?.click()} Icon={Upload} label="Importar JSON" />
        <HeaderButton onClick={onExport} Icon={Download} label="Exportar JSON" />
      </div>
      <input
        ref={plyInputRef}
        type="file"
        accept=".ply"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) loadPLY(f)
          e.target.value = ''
        }}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onImport(f)
          e.target.value = ''
        }}
      />
    </header>
  )
}

function HeaderButton({
  Icon,
  label,
  onClick,
}: {
  Icon: typeof Download
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm text-text hover:border-accent-blue/60"
    >
      <Icon size={14} />
      {label}
    </button>
  )
}
