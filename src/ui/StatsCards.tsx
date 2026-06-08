import { useNavmapStore } from '../store/useNavmapStore'

export function StatsCards() {
  const pois = useNavmapStore((s) => s.pois.length)
  const waypoints = useNavmapStore((s) => s.waypoints.length)
  const edges = useNavmapStore((s) => s.edges.length)
  return (
    <div className="grid grid-cols-3 gap-2">
      <Card label="POIs" value={pois} color="text-accent-blue" />
      <Card label="WPs" value={waypoints} color="text-accent-green" />
      <Card label="Edges" value={edges} color="text-accent-orange" />
    </div>
  )
}

function Card({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="rounded-lg border border-border bg-panel-2 p-3 text-center">
      <div className={`font-mono text-2xl ${color}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted">{label}</div>
    </div>
  )
}
