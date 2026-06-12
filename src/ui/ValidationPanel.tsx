import { AlertTriangle, CheckCircle2, Info, ShieldCheck } from 'lucide-react'
import { useNavmapStore } from '../store/useNavmapStore'

export function ValidationPanel() {
  const issues = useNavmapStore((s) => s.validationIssues)
  const runValidation = useNavmapStore((s) => s.runValidation)
  const modelLoaded = useNavmapStore((s) => s.modelLoaded)
  const setStatus = useNavmapStore((s) => s.setStatus)

  const onRun = () => {
    const found = runValidation()
    setStatus(
      found.length === 0
        ? 'Validación OK: sin problemas detectados.'
        : `Validación: ${found.length} aviso(s).`,
    )
  }

  return (
    <div className="space-y-2 rounded-lg border border-border bg-panel-2 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
          <ShieldCheck size={12} /> Validación
        </div>
        <button
          type="button"
          onClick={onRun}
          disabled={!modelLoaded}
          className="rounded-md border border-border bg-panel px-2 py-0.5 text-[11px] text-muted hover:border-accent-blue/60 hover:text-text disabled:opacity-40"
        >
          Validar
        </button>
      </div>
      {issues == null ? (
        <div className="text-[11px] text-muted">
          Chequea nodos huérfanos, grafo desconectado, calibración, anclas y conexiones que
          atraviesan paredes.
        </div>
      ) : issues.length === 0 ? (
        <div className="flex items-center gap-1.5 text-[11px] text-accent-green">
          <CheckCircle2 size={12} /> Sin problemas detectados.
        </div>
      ) : (
        <div className="max-h-[140px] space-y-1 overflow-y-auto pr-1">
          {issues.map((issue, i) => (
            <div key={i} className="flex items-start gap-1.5 text-[11px] text-muted">
              {issue.severity === 'warn' ? (
                <AlertTriangle size={12} className="mt-0.5 shrink-0 text-accent-orange" />
              ) : (
                <Info size={12} className="mt-0.5 shrink-0 text-accent-blue" />
              )}
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
