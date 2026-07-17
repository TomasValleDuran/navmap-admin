import { useRef, useState } from 'react'
import { Download, QrCode, Upload, Upload as FileUp } from 'lucide-react'
import { usePLYLoader } from '../hooks/usePLYLoader'
import { useNavmapStore } from '../store/useNavmapStore'
import { downloadJSON, parseImportJSON } from '../lib/jsonIO'
import { ModalShell } from './modals/ModalShell'

interface Notice {
  title: string
  message: string
}

export function Header() {
  const plyInputRef = useRef<HTMLInputElement>(null)
  const jsonInputRef = useRef<HTMLInputElement>(null)
  const loadPLY = usePLYLoader()
  const setStatus = useNavmapStore((s) => s.setStatus)
  const importState = useNavmapStore((s) => s.importState)
  const setQrSheetOpen = useNavmapStore((s) => s.setQrSheetOpen)

  // In-app modal state (replaces native confirm()/alert()).
  const [exportWarnings, setExportWarnings] = useState<string[] | null>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  const performExport = () => {
    const s = useNavmapStore.getState()
    downloadJSON({
      floors: s.floors,
      connections: s.connections,
      routingProfiles: s.routingProfiles,
    })
    const totalNodes = s.floors.reduce((n, f) => n + f.pois.length + f.waypoints.length, 0)
    setStatus(
      `Exportado: ${s.floors.length} pisos · ${totalNodes} nodos · ${s.connections.length} conexiones.`,
    )
  }

  const onExport = () => {
    const s = useNavmapStore.getState()
    const totalNodes = s.floors.reduce((n, f) => n + f.pois.length + f.waypoints.length, 0)
    if (totalNodes === 0) {
      setNotice({ title: 'Nada para exportar', message: 'Agregá POIs o waypoints primero.' })
      return
    }
    const issues = s.runValidation()
    const warnings = issues.filter((i) => i.severity === 'warn')
    if (warnings.length > 0) {
      setExportWarnings(warnings.map((i) => i.message))
      return
    }
    performExport()
  }

  const onImport = async (file: File) => {
    try {
      const text = await file.text()
      const r = parseImportJSON(text)
      importState({
        floors: r.floors,
        connections: r.connections,
        routingProfiles: r.routingProfiles,
      })
      const totalNodes = r.floors.reduce((n, f) => n + f.pois.length + f.waypoints.length, 0)
      setStatus(
        `Importado (v${r.version}): ${r.floors.length} pisos · ${totalNodes} nodos · ${r.connections.length} conexiones.`,
      )
      if (r.version !== '3.0') {
        setNotice({
          title: 'Mapa migrado',
          message: `Archivo v${r.version} importado como un solo piso. Volvé a cargar el .PLY de cada piso y re-exportá como v3.0.`,
        })
      } else {
        setNotice({
          title: 'Recargá las nubes',
          message: 'Anotaciones importadas. Cargá el .PLY de cada piso para volver a ver las nubes de puntos.',
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setNotice({ title: 'Error leyendo JSON', message: msg })
      setStatus('Error leyendo JSON.')
    }
  }

  return (
    <>
    <header className="flex h-12 items-center justify-between border-b border-border bg-panel px-4">
      <div className="flex items-center gap-3">
        <span className="rounded bg-accent-blue/15 px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-accent-blue">
          NavMap Admin
        </span>
        <span className="text-xs text-muted">v3 · react</span>
      </div>
      <div className="flex items-center gap-2">
        <HeaderButton onClick={() => plyInputRef.current?.click()} Icon={FileUp} label="Cargar .PLY" />
        <HeaderButton onClick={() => jsonInputRef.current?.click()} Icon={Upload} label="Importar JSON" />
        <HeaderButton onClick={() => setQrSheetOpen(true)} Icon={QrCode} label="Códigos QR" />
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

    {/* Validation warnings before export (replaces native confirm) */}
    <ModalShell
      open={exportWarnings !== null}
      onClose={() => {
        setExportWarnings(null)
        setStatus('Export cancelado: revisá los avisos de validación.')
      }}
      onConfirm={() => {
        setExportWarnings(null)
        performExport()
      }}
      title="Avisos de validación"
      footer={
        <>
          <button
            type="button"
            onClick={() => {
              setExportWarnings(null)
              setStatus('Export cancelado: revisá los avisos de validación.')
            }}
            className="rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm hover:border-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => {
              setExportWarnings(null)
              performExport()
            }}
            className="rounded-md bg-accent-blue/90 px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-blue"
          >
            Exportar igual
          </button>
        </>
      }
    >
      <p className="text-sm text-muted">
        La validación encontró {exportWarnings?.length} problema(s):
      </p>
      <ul className="max-h-60 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-muted">
        {exportWarnings?.map((m, i) => (
          <li key={i}>{m}</li>
        ))}
      </ul>
    </ModalShell>

    {/* Generic notice (replaces native alert) */}
    <ModalShell
      open={notice !== null}
      onClose={() => setNotice(null)}
      onConfirm={() => setNotice(null)}
      title={notice?.title ?? ''}
      maxWidth="max-w-sm"
      footer={
        <button
          type="button"
          onClick={() => setNotice(null)}
          className="rounded-md bg-accent-blue/90 px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-blue"
        >
          Entendido
        </button>
      }
    >
      <p className="text-sm text-muted">{notice?.message}</p>
    </ModalShell>
    </>
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
