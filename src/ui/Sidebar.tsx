import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { AnchorList } from './AnchorList'
import { AxesPanel } from './AxesPanel'
import { ClearAllButton } from './ClearAllButton'
import { ConnectionList } from './ConnectionList'
import { EdgeList } from './EdgeList'
import { FloorBar } from './FloorBar'
import { MeasurePanel } from './MeasurePanel'
import { ModeRail } from './ModeRail'
import { PersonPanel } from './PersonPanel'
import { POIList } from './POIList'
import { SightPanel } from './SightPanel'
import { ValidationPanel } from './ValidationPanel'
import { WallList } from './WallList'
import { WaypointList } from './WaypointList'

interface Props {
  width: number
  collapsed: boolean
  onToggle: () => void
}

/**
 * Left side of the editor: the mode rail (always visible) plus the panel of cards.
 *
 * The cards are one plain scrolling column on purpose — collapsing them into accordions hid the
 * lists behind an extra click and let flex squeeze them. Only the modes moved out, into the rail,
 * because they're the one control you reach for constantly and they shouldn't scroll away.
 */
export function Sidebar({ width, collapsed, onToggle }: Props) {
  return (
    <div className="flex shrink-0">
      <ModeRail />
      {collapsed ? (
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
      ) : (
        <aside
          className="flex shrink-0 flex-col gap-3 overflow-y-auto border-r border-border bg-panel p-3 [&>*]:shrink-0"
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
          <MeasurePanel />
          <PersonPanel />
          <AxesPanel />
          <POIList />
          <WaypointList />
          <EdgeList />
          <ConnectionList />
          <AnchorList />
          <WallList />
          <SightPanel />
          <ValidationPanel />
          <ClearAllButton />
        </aside>
      )}
    </div>
  )
}
