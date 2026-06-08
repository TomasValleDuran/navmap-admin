import { useNavmapStore } from '../store/useNavmapStore'

export function StatusBar() {
  const statusText = useNavmapStore((s) => s.statusText)
  return (
    <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2">
      <div className="pointer-events-auto rounded-md border border-border bg-panel/90 px-3 py-1.5 font-mono text-xs text-muted backdrop-blur">
        {statusText}
      </div>
    </div>
  )
}
