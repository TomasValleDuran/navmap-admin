import { FlipHorizontal2 } from 'lucide-react'
import { useNavmapStore } from '../store/useNavmapStore'

export function AxesPanel() {
  const mirrorX = useNavmapStore((s) => s.mirrorX)
  const mirrorY = useNavmapStore((s) => s.mirrorY)
  const mirrorZ = useNavmapStore((s) => s.mirrorZ)
  const setMirror = useNavmapStore((s) => s.setMirror)
  const setStatus = useNavmapStore((s) => s.setStatus)

  const toggle = (axis: 'x' | 'y' | 'z') => {
    const current = axis === 'x' ? mirrorX : axis === 'y' ? mirrorY : mirrorZ
    const next = !current
    setMirror(axis, next)
    setStatus(`Eje ${axis.toUpperCase()} ${next ? 'espejado' : 'normal'}.`)
  }

  const buttonClass = (on: boolean) =>
    `flex-1 rounded-md border px-2 py-1 text-xs transition ${
      on
        ? 'border-accent-blue/60 bg-accent-blue/15 text-text'
        : 'border-border bg-panel text-muted hover:border-accent-blue/40 hover:text-text'
    }`

  return (
    <div className="space-y-2 rounded-lg border border-border bg-panel-2 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted">
        <FlipHorizontal2 size={12} /> Ejes
      </div>
      <div className="text-[10px] leading-snug text-muted">
        Si el viewer se ve espejado vs. realidad, activá el eje correspondiente.
        Y suele estar espejado por convención COLMAP.
      </div>
      <div className="flex gap-1.5">
        <button type="button" onClick={() => toggle('x')} className={buttonClass(mirrorX)}>
          Espejar X
        </button>
        <button type="button" onClick={() => toggle('y')} className={buttonClass(mirrorY)}>
          Espejar Y
        </button>
        <button type="button" onClick={() => toggle('z')} className={buttonClass(mirrorZ)}>
          Espejar Z
        </button>
      </div>
    </div>
  )
}
