import { useMemo, useState } from 'react'
import { Ruler } from 'lucide-react'
import { useNavmapStore } from '../store/useNavmapStore'
import { sampleResidual } from '../lib/calibration'

function formatNumber(n: number, digits = 3): string {
  if (!isFinite(n)) return '–'
  return n.toFixed(digits)
}

export function MeasurePanel() {
  const points = useNavmapStore((s) => s.measurePoints)
  const factor = useNavmapStore((s) => s.metersPerViewerUnit)
  const samples = useNavmapStore((s) => s.calibrationSamples)
  const transform = useNavmapStore((s) => s.transform)
  const geometry = useNavmapStore((s) => s.pointCloudGeometry)
  const addCalibrationSample = useNavmapStore((s) => s.addCalibrationSample)
  const removeCalibrationSample = useNavmapStore((s) => s.removeCalibrationSample)
  const clearCalibration = useNavmapStore((s) => s.clearCalibration)
  const clearMeasure = useNavmapStore((s) => s.clearMeasure)
  const setStatus = useNavmapStore((s) => s.setStatus)
  const [realInput, setRealInput] = useState('')

  const distViewer = useMemo(() => {
    if (points.length !== 2) return null
    const [a, b] = points
    return Math.hypot(a.vx - b.vx, a.vy - b.vy, a.vz - b.vz)
  }, [points])

  const distMeters = distViewer != null && factor != null ? distViewer * factor : null

  const modelDims = useMemo(() => {
    if (factor == null || !geometry?.boundingBox) return null
    const bb = geometry.boundingBox
    return {
      x: (bb.max.x - bb.min.x) * factor,
      y: (bb.max.y - bb.min.y) * factor,
      z: (bb.max.z - bb.min.z) * factor,
    }
  }, [factor, geometry])

  const addSample = () => {
    const real = parseFloat(realInput.replace(',', '.'))
    if (!isFinite(real) || real <= 0 || distViewer == null || distViewer < 1e-9) {
      setStatus('Valor inválido para calibración.')
      return
    }
    const sample = addCalibrationSample(real)
    if (sample) {
      const n = useNavmapStore.getState().calibrationSamples.length
      setStatus(`Muestra agregada (${n} en total). Medí otra distancia para mejorar el ajuste.`)
      setRealInput('')
    }
  }

  const reset = () => {
    clearCalibration()
    setStatus('Calibración eliminada.')
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-panel-2 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
          <Ruler size={12} /> Medición
        </div>
        {points.length > 0 && (
          <button
            type="button"
            onClick={() => {
              clearMeasure()
              setStatus('Medición reiniciada.')
            }}
            className="rounded px-1.5 text-[11px] text-muted hover:text-text"
          >
            Limpiar
          </button>
        )}
      </div>

      {points.length === 0 && (
        <div className="text-[11px] text-muted">
          Modo Medir activo: clickeá dos puntos en el modelo. Cuantas más mediciones cargues
          (mejor si son largas), más preciso el ajuste.
        </div>
      )}
      {points.length === 1 && (
        <div className="text-[11px] text-muted">Punto A fijado. Click en el segundo punto.</div>
      )}

      {distViewer != null && (
        <div className="space-y-1 font-mono text-[11px] text-muted">
          <div>
            d (visor): <span className="text-text">{formatNumber(distViewer)}</span>
          </div>
          {distMeters != null && (
            <div>
              d (real): <span className="text-accent-blue">{formatNumber(distMeters)} m</span>
            </div>
          )}
        </div>
      )}

      {distViewer != null && (
        <div className="flex gap-1.5 pt-1">
          <input
            type="number"
            step="0.01"
            min="0"
            placeholder="m reales"
            value={realInput}
            onChange={(e) => setRealInput(e.target.value)}
            className="w-full rounded-md border border-border bg-panel px-2 py-1 text-xs text-text outline-none focus:border-accent-blue/60"
          />
          <button
            type="button"
            onClick={addSample}
            className="shrink-0 rounded-md border border-accent-blue/60 bg-accent-blue/15 px-2.5 py-1 text-xs text-text hover:bg-accent-blue/25"
          >
            + Muestra
          </button>
        </div>
      )}

      {samples.length > 0 && factor != null && (
        <div className="space-y-1 border-t border-border pt-2">
          <div className="text-[10px] uppercase tracking-wider text-muted">
            Muestras ({samples.length})
          </div>
          {samples.map((s, i) => {
            const residual = sampleResidual(s, transform, factor) * 100
            const bad = Math.abs(residual) > 3
            return (
              <div key={s.id} className="group flex items-center gap-2 font-mono text-[11px]">
                <span className="text-muted">#{i + 1}</span>
                <span className="flex-1 text-text">{formatNumber(s.realMeters, 2)} m</span>
                <span
                  className={bad ? 'text-accent-red' : 'text-muted'}
                  title={
                    bad
                      ? 'Esta muestra difiere mucho del ajuste: revisá la medición.'
                      : 'Desvío respecto del ajuste global.'
                  }
                >
                  {residual >= 0 ? '+' : ''}
                  {formatNumber(residual, 1)}%
                </span>
                <button
                  type="button"
                  onClick={() => {
                    removeCalibrationSample(s.id)
                    setStatus('Muestra eliminada; factor recalculado.')
                  }}
                  className="rounded px-1 text-muted opacity-0 hover:bg-accent-red/15 hover:text-accent-red group-hover:opacity-100"
                  title="Eliminar muestra"
                >
                  ×
                </button>
              </div>
            )
          })}
          {samples.length === 1 && (
            <div className="text-[10px] text-muted">
              Con una sola muestra no hay redundancia: agregá al menos otra para detectar errores.
            </div>
          )}
        </div>
      )}

      <div className="border-t border-border pt-2 font-mono text-[11px] text-muted">
        Factor:{' '}
        {factor != null ? (
          <span className="text-text">{formatNumber(factor, 6)} m/u</span>
        ) : (
          <span className="italic">sin calibrar</span>
        )}
        {factor != null && (
          <button
            type="button"
            onClick={reset}
            className="ml-2 rounded px-1.5 text-[11px] text-muted hover:text-accent-red"
          >
            Borrar
          </button>
        )}
      </div>

      {modelDims && (
        <div className="font-mono text-[11px] text-muted">
          Modelo: {formatNumber(modelDims.x, 1)} × {formatNumber(modelDims.y, 1)} ×{' '}
          {formatNumber(modelDims.z, 1)} m
          <div className="text-[10px] not-italic">
            Si estas dimensiones no parecen reales, revisá la calibración.
          </div>
        </div>
      )}
    </div>
  )
}
