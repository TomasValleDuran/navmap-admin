import { useCallback, useEffect, useState } from 'react'
import { Header } from './ui/Header'
import { Sidebar } from './ui/Sidebar'
import { RightPanel } from './ui/RightPanel'
import { CanvasArea } from './ui/CanvasArea'
import { ResizeHandle } from './ui/ResizeHandle'
import { POIModal } from './ui/modals/POIModal'
import { WaypointModal } from './ui/modals/WaypointModal'
import { AnchorModal } from './ui/modals/AnchorModal'
import { EditNodeModal } from './ui/modals/EditNodeModal'
import { ConnectionModal } from './ui/modals/ConnectionModal'
import { QRSheet } from './ui/QRSheet'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { usePersistence } from './hooks/usePersistence'

const MIN_PANEL_WIDTH = 200
const MAX_PANEL_WIDTH = 480
const LAYOUT_STORAGE_KEY = 'navmap.panelLayout'

interface PanelLayout {
  leftWidth: number
  rightWidth: number
  leftCollapsed: boolean
  rightCollapsed: boolean
}

const DEFAULT_LAYOUT: PanelLayout = {
  leftWidth: 260,
  rightWidth: 240,
  leftCollapsed: false,
  rightCollapsed: false,
}

const clampWidth = (n: number) =>
  Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, n))

function loadLayout(): PanelLayout {
  try {
    const raw = localStorage.getItem(LAYOUT_STORAGE_KEY)
    if (!raw) return DEFAULT_LAYOUT
    const parsed = JSON.parse(raw) as Partial<PanelLayout>
    return {
      leftWidth: clampWidth(parsed.leftWidth ?? DEFAULT_LAYOUT.leftWidth),
      rightWidth: clampWidth(parsed.rightWidth ?? DEFAULT_LAYOUT.rightWidth),
      leftCollapsed: !!parsed.leftCollapsed,
      rightCollapsed: !!parsed.rightCollapsed,
    }
  } catch {
    return DEFAULT_LAYOUT
  }
}

export default function App() {
  useKeyboardShortcuts()
  usePersistence()
  const [layout, setLayout] = useState<PanelLayout>(loadLayout)

  useEffect(() => {
    localStorage.setItem(LAYOUT_STORAGE_KEY, JSON.stringify(layout))
  }, [layout])

  const setLeftWidth = useCallback((w: number) => {
    setLayout((l) => ({ ...l, leftWidth: clampWidth(w) }))
  }, [])
  const setRightWidth = useCallback((w: number) => {
    setLayout((l) => ({ ...l, rightWidth: clampWidth(w) }))
  }, [])
  const toggleLeft = useCallback(
    () => setLayout((l) => ({ ...l, leftCollapsed: !l.leftCollapsed })),
    [],
  )
  const toggleRight = useCallback(
    () => setLayout((l) => ({ ...l, rightCollapsed: !l.rightCollapsed })),
    [],
  )

  return (
    <div className="flex h-full w-full flex-col bg-base text-text">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          width={layout.leftWidth}
          collapsed={layout.leftCollapsed}
          onToggle={toggleLeft}
        />
        {!layout.leftCollapsed && (
          <ResizeHandle
            side="left"
            width={layout.leftWidth}
            onResize={setLeftWidth}
          />
        )}
        <CanvasArea />
        {!layout.rightCollapsed && (
          <ResizeHandle
            side="right"
            width={layout.rightWidth}
            onResize={setRightWidth}
          />
        )}
        <RightPanel
          width={layout.rightWidth}
          collapsed={layout.rightCollapsed}
          onToggle={toggleRight}
        />
      </div>
      <POIModal />
      <WaypointModal />
      <AnchorModal />
      <EditNodeModal />
      <ConnectionModal />
      <QRSheet />
    </div>
  )
}
