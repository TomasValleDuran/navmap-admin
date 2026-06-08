import { useEffect } from 'react'
import type { ReactNode } from 'react'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm?: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
  maxWidth?: string
}

export function ModalShell({ open, onClose, onConfirm, title, children, footer, maxWidth = 'max-w-md' }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && onConfirm) {
        const tag = (e.target as HTMLElement | null)?.tagName
        if (tag !== 'TEXTAREA') {
          e.preventDefault()
          onConfirm()
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onConfirm])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className={`w-full ${maxWidth} rounded-xl border border-border bg-panel p-5 shadow-2xl`}>
        <div className="mb-3 text-sm font-medium uppercase tracking-wider text-muted">{title}</div>
        <div className="space-y-3">{children}</div>
        {footer && <div className="mt-4 flex justify-end gap-2">{footer}</div>}
      </div>
    </div>
  )
}
