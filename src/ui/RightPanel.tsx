import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { FloorControls } from './FloorControls'
import { RoutePreviewPanel } from './RoutePreviewPanel'
import { SelectedNodeInfo } from './SelectedNodeInfo'
import { StatsCards } from './StatsCards'

interface Props {
  width: number
  collapsed: boolean
  onToggle: () => void
}

export function RightPanel({ width, collapsed, onToggle }: Props) {
  if (collapsed) {
    return (
      <aside className="flex w-8 shrink-0 flex-col items-center border-l border-border bg-panel py-2">
        <button
          type="button"
          onClick={onToggle}
          title="Expandir panel"
          className="rounded p-1 text-muted hover:bg-panel-2 hover:text-text"
        >
          <ChevronsLeft size={14} />
        </button>
      </aside>
    )
  }
  return (
    <aside
      className="flex shrink-0 flex-col gap-3 overflow-y-auto border-l border-border bg-panel p-3"
      style={{ width }}
    >
      <div className="flex justify-start">
        <button
          type="button"
          onClick={onToggle}
          title="Colapsar panel"
          className="rounded p-1 text-muted hover:bg-panel-2 hover:text-text"
        >
          <ChevronsRight size={14} />
        </button>
      </div>
      <StatsCards />
      <SelectedNodeInfo />
      <FloorControls />
      <RoutePreviewPanel />
    </aside>
  )
}
