import { useNavmapStore } from '../store/useNavmapStore'
import { usePLYLoader } from '../hooks/usePLYLoader'
import { buildSampleLCorridor } from '../lib/sampleData'

interface Props {
  onPickFile: () => void
}

export function Dropzone({ onPickFile }: Props) {
  const modelLoaded = useNavmapStore((s) => s.modelLoaded)
  const isLoading = useNavmapStore((s) => s.isLoading)
  const setPointCloud = useNavmapStore((s) => s.setPointCloud)
  const setTransform = useNavmapStore((s) => s.setTransform)
  const setModelLoaded = useNavmapStore((s) => s.setModelLoaded)
  const setFloorHeightViewer = useNavmapStore((s) => s.setFloorHeightViewer)
  const setStatus = useNavmapStore((s) => s.setStatus)
  // Reserved for future async sample loading
  void usePLYLoader

  if (modelLoaded || isLoading) return null

  const loadSample = () => {
    const s = buildSampleLCorridor()
    setTransform({
      cx: s.info.cx,
      cy: s.info.cy,
      cz: s.info.cz,
      scale: s.info.scale,
      alignQ: s.info.alignQ,
    })
    setFloorHeightViewer(s.info.floorHeightViewer)
    setPointCloud({
      geometry: s.geometry,
      hasColor: true,
      pointSize: s.pointSize,
      modelRadius: s.info.modelRadius,
    })
    setModelLoaded(true)
    setStatus('Datos de prueba cargados.')
  }

  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
      <div className="pointer-events-auto flex flex-col items-center gap-4 rounded-2xl border border-border bg-panel/80 px-10 py-12 backdrop-blur">
        <div className="text-5xl">📦</div>
        <div className="text-center">
          <div className="text-lg font-medium text-text">Cargá un modelo .ply</div>
          <div className="mt-1 text-sm text-muted">
            Arrastrá el archivo aquí o usá los botones.
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onPickFile}
            className="rounded-md bg-accent-blue/90 px-4 py-2 text-sm font-medium text-white hover:bg-accent-blue"
          >
            Cargar .PLY
          </button>
          <button
            type="button"
            onClick={loadSample}
            className="rounded-md border border-border bg-panel-2 px-4 py-2 text-sm font-medium text-text hover:border-accent-green/60"
          >
            Datos de prueba
          </button>
        </div>
      </div>
    </div>
  )
}
