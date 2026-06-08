import { ModalShell } from './ModalShell'

interface Props {
  open: boolean
  title: string
  message: string
  onCancel: () => void
  onConfirm: () => void
  confirmLabel?: string
  danger?: boolean
}

export function ConfirmModal({ open, title, message, onCancel, onConfirm, confirmLabel = 'Confirmar', danger = false }: Props) {
  return (
    <ModalShell
      open={open}
      onClose={onCancel}
      onConfirm={onConfirm}
      title={title}
      footer={
        <>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm hover:border-muted"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`rounded-md px-4 py-1.5 text-sm font-medium text-white ${
              danger ? 'bg-accent-red/90 hover:bg-accent-red' : 'bg-accent-blue/90 hover:bg-accent-blue'
            }`}
          >
            {confirmLabel}
          </button>
        </>
      }
      maxWidth="max-w-sm"
    >
      <p className="text-sm text-muted">{message}</p>
    </ModalShell>
  )
}
