import { useMemo, useState } from 'react'
import { Ruler } from 'lucide-react'
import { useNavmapStore } from '../store/useNavmapStore'

function formatNumber(n: number, digits = 3): string {
  if (!isFinite(n)) return '–'
  return n.toFixed(digits)
}

export function MeasurePanel() {
  const points = useNavmapStore((s) => s.measurePoints)
  const factor = useNavmapStore((s) => s.metersPerViewerUnit)
  const setFactor = useNavmapStore((s) => s.setMetersPerViewerUnit)
  const clearMeasure = useNavmapStore((s) => s.clearMeasure)
  const setStatus = useNavmapStore((s) => s.setStatus)
  const [realInput, setRealInput] = useState('')

  const distViewer = useMemo(() => {
    if (points.length !== 2) return null
    const [a, b] = points
    return Math.hypot(a.vx - b.vx, a.vy - b.vy, a.vz - b.vz)
  }, [points])

  const distMeters = distViewer != null && factor != null ? distViewer * factor : null

  const calibrate = () => {
    const real = parseFloat(realInput.replace(',', '.'))
    if (!isFinite(real) || real <= 0 || distViewer == null || distViewer < 1e-9) {
      setStatus('Valor inválido para calibración.')
      return
    }
    const f = real / distViewer
    setFactor(f)
    setStatus(`Calibración guardada: ${formatNumber(f, 6)} m por unidad visor.`)
    setRealInput('')
  }

  const reset = () => {
    setFactor(null)
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
          Modo Medir activo: clickeá dos puntos en el modelo.
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
            onClick={calibrate}
            className="rounded-md border border-accent-blue/60 bg-accent-blue/15 px-2.5 py-1 text-xs text-text hover:bg-accent-blue/25"
          >
            Calibrar
          </button>
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
    </div>
  )
}
