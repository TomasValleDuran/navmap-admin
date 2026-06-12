import { useCallback, useState } from 'react'
import { Scene } from '../three/Scene'
import { Dropzone } from './Dropzone'
import { Spinner } from './Spinner'
import { StatusBar } from './StatusBar'
import { CoordReadout } from './CoordReadout'
import { CameraBadge } from './CameraBadge'
import { usePLYLoader } from '../hooks/usePLYLoader'
import { useNavmapStore } from '../store/useNavmapStore'

const CURSORS: Record<string, string> = {
  view: 'cursor-default',
  poi: 'cursor-crosshair',
  waypoint: 'cursor-crosshair',
  edge: 'cursor-crosshair',
  select: 'cursor-pointer',
  measure: 'cursor-crosshair',
  anchor: 'cursor-crosshair',
}

export function CanvasArea() {
  const loadPLY = usePLYLoader()
  const [dragOver, setDragOver] = useState(false)

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])
  const onDragLeave = useCallback(() => setDragOver(false), [])
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files?.[0]
      if (file && file.name.toLowerCase().endsWith('.ply')) loadPLY(file)
    },
    [loadPLY],
  )

  const onPickFile = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.ply'
    input.onchange = () => {
      const f = input.files?.[0]
      if (f) loadPLY(f)
    }
    input.click()
  }, [loadPLY])

  const mode = useNavmapStore((s) => s.mode)
  const cursorClass = CURSORS[mode] ?? 'cursor-default'

  return (
    <div
      className={`relative min-w-0 flex-1 ${cursorClass} ${dragOver ? 'ring-2 ring-inset ring-accent-blue/70' : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <Scene />
      <Dropzone onPickFile={onPickFile} />
      <Spinner />
      <StatusBar />
      <CoordReadout />
      <CameraBadge />
    </div>
  )
}
