import { useNavmapStore } from '../store/useNavmapStore'

export function CameraBadge() {
  const cameraMode = useNavmapStore((s) => s.cameraMode)
  const modelLoaded = useNavmapStore((s) => s.modelLoaded)
  if (!modelLoaded) return null
  return (
    <div className="pointer-events-none absolute right-3 top-3 rounded-md border border-border bg-panel/90 px-2.5 py-1 font-mono text-[11px] text-muted backdrop-blur">
      {cameraMode === 'orbit' ? 'Órbita' : 'Caminar'} <span className="opacity-50">(P)</span>
    </div>
  )
}
