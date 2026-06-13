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
      pois: s.pois,
      waypoints: s.waypoints,
      edges: s.edges,
      anchors: s.anchors,
      calibrationSamples: s.calibrationSamples,
      transform: s.transform,
      floorHeightViewer: s.floorHeightViewer,
      metersPerViewerUnit: s.metersPerViewerUnit,
      mirrorX: s.mirrorX,
      mirrorY: s.mirrorY,
      mirrorZ: s.mirrorZ,
    })
    setStatus(
      `Exportado: ${s.pois.length} POIs · ${s.waypoints.length} WPs · ${s.edges.length} edges · ${s.anchors.length} anclas.`,
    )
  }

  const onExport = () => {
    const s = useNavmapStore.getState()
    if (!s.pois.length && !s.waypoints.length) {
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
        pois: r.pois,
        waypoints: r.waypoints,
        edges: r.edges,
        anchors: r.anchors,
        calibrationSamples: r.calibrationSamples,
        transform: r.transform,
        floorHeightViewer: r.floorHeightViewer,
        metersPerViewerUnit: r.metersPerViewerUnit,
        mirrorX: r.mirrorX,
        mirrorY: r.mirrorY,
        mirrorZ: r.mirrorZ,
      })
      setStatus(
        `Importado (v${r.version}): ${r.pois.length} POIs · ${r.waypoints.length} WPs · ${r.edges.length} edges.`,
      )
      if (r.version === '1') {
        setNotice({
          title: 'Importación parcial',
          message: 'Formato v1 importado parcialmente (sin coordenadas originales COLMAP).',
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
        <span className="text-xs text-muted">v2 · react</span>
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
