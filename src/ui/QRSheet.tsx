import { useEffect, useMemo, useState } from 'react'
import QRCode from 'qrcode'
import { Printer, X } from 'lucide-react'
import { useNavmapStore } from '../store/useNavmapStore'

interface QREntry {
  id: string
  payload: string // what the QR actually encodes (custom qr field, else the node id)
  title: string
  subtitle: string
}

/**
 * Printable sheet of one QR per POI. The QR encodes the POI's `qr` field (or its id),
 * which is exactly what the AR app matches on scan. Print it, cut out the cards, and stick
 * each on the wall at that POI's physical location. Waypoints are internal path nodes and
 * are intentionally excluded.
 */
export function QRSheet() {
  const open = useNavmapStore((s) => s.qrSheetOpen)
  const setOpen = useNavmapStore((s) => s.setQrSheetOpen)
  const pois = useNavmapStore((s) => s.pois)

  const entries: QREntry[] = useMemo(() => {
    if (!open) return []
    return pois.map((p) => ({
      id: p.id,
      payload: p.qr || p.id,
      title: p.name,
      subtitle: `POI · ${p.type}`,
    }))
  }, [open, pois])

  const [codes, setCodes] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) {
      setCodes({})
      return
    }
    let cancelled = false
    Promise.all(
      entries.map(
        async (e) =>
          [
            e.id,
            await QRCode.toDataURL(e.payload, {
              margin: 1,
              width: 320,
              errorCorrectionLevel: 'M',
            }),
          ] as const,
      ),
    ).then((pairs) => {
      if (!cancelled) setCodes(Object.fromEntries(pairs))
    })
    return () => {
      cancelled = true
    }
  }, [open, entries])

  if (!open) return null

  const ready = entries.length > 0 && Object.keys(codes).length === entries.length

  return (
    <div className="qr-print-root fixed inset-0 z-50 overflow-auto bg-base">
      {/* Toolbar — hidden when printing */}
      <div className="qr-print-hide sticky top-0 z-10 flex items-center justify-between border-b border-border bg-panel px-6 py-3">
        <div>
          <h2 className="text-sm font-medium text-text">Códigos QR de los nodos</h2>
          <p className="text-xs text-muted">
            {entries.length} código(s). Cada QR contiene el ID del nodo — pegalo en la pared
            donde está ese punto.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!ready}
            className="flex items-center gap-1.5 rounded-md bg-accent-blue/90 px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-blue disabled:opacity-40"
          >
            <Printer size={14} />
            Imprimir
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex items-center gap-1.5 rounded-md border border-border bg-panel-2 px-3 py-1.5 text-sm text-text hover:border-muted"
          >
            <X size={14} />
            Cerrar
          </button>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="p-10 text-center text-sm text-muted">
          No hay POIs todavía. Agregá POIs para generar sus códigos QR.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-3 md:grid-cols-4 print:grid-cols-3 print:gap-3">
          {entries.map((e) => (
            <div
              key={e.id}
              className="flex break-inside-avoid flex-col items-center gap-2 rounded-lg border border-border bg-white p-4 text-center text-black"
            >
              {codes[e.id] ? (
                <img src={codes[e.id]} alt={e.payload} className="h-40 w-40" />
              ) : (
                <div className="flex h-40 w-40 items-center justify-center text-xs text-gray-400">
                  generando…
                </div>
              )}
              <div className="text-sm font-semibold leading-tight">{e.title}</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-500">
                {e.subtitle}
              </div>
              <div className="font-mono text-xs text-gray-700">{e.payload}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
