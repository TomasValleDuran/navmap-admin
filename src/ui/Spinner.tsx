import { useNavmapStore } from '../store/useNavmapStore'

export function Spinner() {
  const isLoading = useNavmapStore((s) => s.isLoading)
  if (!isLoading) return null
  return (
    <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-base/50 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-lg border border-border bg-panel px-5 py-4">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-blue border-t-transparent" />
        <span className="text-sm text-text">Cargando modelo...</span>
      </div>
    </div>
  )
}
