import { useNavmapStore } from '../store/useNavmapStore'

export function CoordReadout() {
  const c = useNavmapStore((s) => s.coordHover)
  const modelLoaded = useNavmapStore((s) => s.modelLoaded)
  if (!modelLoaded) return null
  return (
    <div className="pointer-events-none absolute bottom-3 right-3 rounded-md border border-border bg-panel/90 px-2.5 py-1.5 font-mono text-[11px] text-muted backdrop-blur">
      {c ? (
        <span>
          x: {c.x.toFixed(3)} &nbsp; y: {c.y.toFixed(3)} &nbsp; z: {c.z.toFixed(3)}
        </span>
      ) : (
        <span>x: — &nbsp; y: — &nbsp; z: —</span>
      )}
    </div>
  )
}
