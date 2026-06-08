import { useEffect, useRef } from 'react'

interface Props {
  side: 'left' | 'right'
  width: number
  onResize: (newWidth: number) => void
}

export function ResizeHandle({ side, width, onResize }: Props) {
  const draggingRef = useRef(false)
  const startXRef = useRef(0)
  const startWidthRef = useRef(0)

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    draggingRef.current = true
    startXRef.current = e.clientX
    startWidthRef.current = width
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return
      const dx = e.clientX - startXRef.current
      const next = side === 'left' ? startWidthRef.current + dx : startWidthRef.current - dx
      onResize(next)
    }
    const onUp = () => {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [onResize, side])

  return (
    <div
      onMouseDown={onMouseDown}
      role="separator"
      aria-orientation="vertical"
      className="group relative w-px shrink-0 cursor-col-resize bg-border hover:bg-accent-blue/60"
    >
      <div className="absolute inset-y-0 -left-1 -right-1 z-10" />
    </div>
  )
}
