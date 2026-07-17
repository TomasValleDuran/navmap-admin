import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { AnchorList } from './AnchorList'
import { AxesPanel } from './AxesPanel'
import { ClearAllButton } from './ClearAllButton'
import { ConnectionList } from './ConnectionList'
import { EdgeList } from './EdgeList'
import { FloorBar } from './FloorBar'
import { MeasurePanel } from './MeasurePanel'
import { ModePicker } from './ModePicker'
import { POIList } from './POIList'
import { ValidationPanel } from './ValidationPanel'
import { WaypointList } from './WaypointList'

interface Props {
  width: number
  collapsed: boolean
  onToggle: () => void
}

export function Sidebar({ width, collapsed, onToggle }: Props) {
  if (collapsed) {
    return (
      <aside className="flex w-8 shrink-0 flex-col items-center border-r border-border bg-panel py-2">
        <button
          type="button"
          onClick={onToggle}
          title="Expandir panel"
          className="rounded p-1 text-muted hover:bg-panel-2 hover:text-text"
        >
          <ChevronsRight size={14} />
        </button>
      </aside>
    )
  }
  return (
    <aside
      className="flex shrink-0 flex-col gap-3 overflow-y-auto border-r border-border bg-panel p-3"
      style={{ width }}
    >
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onToggle}
          title="Colapsar panel"
          className="rounded p-1 text-muted hover:bg-panel-2 hover:text-text"
        >
          <ChevronsLeft size={14} />
        </button>
      </div>
      <FloorBar />
      <ModePicker />
      <MeasurePanel />
      <AxesPanel />
      <POIList />
      <WaypointList />
      <EdgeList />
      <ConnectionList />
      <AnchorList />
      <ValidationPanel />
      <ClearAllButton />
    </aside>
  )
}
