import { useState } from 'react'
import { PersonStanding, Trash2 } from 'lucide-react'
import { useNavmapStore } from '../store/useNavmapStore'
import type { PersonMarker } from '../types/navmap'

/** Estable: `?? []` devolveria un array nuevo por render y re-renderizaria en cada cambio. */
const NO_PEOPLE: PersonMarker[] = []

/**
 * Planta una figura de 1.8 x 0.4 m en una coordenada COLMAP escrita a mano.
 *
 * Para que sirve: comparar a ojo una pose que devolvio el servidor contra el lugar donde
 * uno cree que esta. Las coordenadas son las mismas que muestra el readout del cursor
 * abajo a la derecha, asi que se puede ir y volver entre las dos sin convertir nada.
 *
 * Las figuras no se exportan ni se guardan: son andamio de diagnostico y desaparecen al
 * recargar la pagina.
 */
export function PersonPanel() {
  const mode = useNavmapStore((s) => s.mode)
  const activeFloorId = useNavmapStore((s) => s.activeFloorId)
  const people = useNavmapStore((s) => s.people[s.activeFloorId] ?? NO_PEOPLE)
  const addPerson = useNavmapStore((s) => s.addPerson)
  const removePerson = useNavmapStore((s) => s.removePerson)
  const clearPeople = useNavmapStore((s) => s.clearPeople)
  const setStatus = useNavmapStore((s) => s.setStatus)
  const coordHover = useNavmapStore((s) => s.coordHover)
  const metersPerViewerUnit = useNavmapStore((s) => s.metersPerViewerUnit)
  const modelLoaded = useNavmapStore((s) => s.modelLoaded)

  const [x, setX] = useState('')
  const [y, setY] = useState('')
  const [z, setZ] = useState('')
  const [label, setLabel] = useState('')

  if (mode !== 'person') return null

  const num = (v: string) => parseFloat(v.replace(',', '.'))
  const valid = [x, y, z].every((v) => isFinite(num(v)))

  const place = () => {
    if (!valid) {
      setStatus('Coordenadas inválidas: se esperan tres números (x, y, z).')
      return
    }
    addPerson({ x: num(x), y: num(y), z: num(z), label: label || undefined })
    setStatus(`Figura plantada en (${num(x).toFixed(3)}, ${num(y).toFixed(3)}, ${num(z).toFixed(3)}).`)
    setLabel('')
  }

  /** Pega los tres campos de una: acepta "1.6 0.26 -1.13" y "1.6, 0.26, -1.13". */
  const onPasteTriple = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const parts = e.clipboardData
      .getData('text')
      .trim()
      .split(/[\s,;]+/)
      .map((p) => parseFloat(p.replace(',', '.')))
      .filter((n) => isFinite(n))
    if (parts.length < 3) return
    e.preventDefault()
    setX(String(parts[0]))
    setY(String(parts[1]))
    setZ(String(parts[2]))
  }

  const useCursor = () => {
    if (!coordHover) {
      setStatus('Pasá el cursor por el modelo para tomar una coordenada.')
      return
    }
    setX(coordHover.x.toFixed(3))
    setY(coordHover.y.toFixed(3))
    setZ(coordHover.z.toFixed(3))
  }

  const field = (
    v: string,
    set: (s: string) => void,
    ph: string,
  ) => (
    <input
      value={v}
      onChange={(e) => set(e.target.value)}
      onPaste={onPasteTriple}
      placeholder={ph}
      inputMode="decimal"
      className="w-full rounded border border-border bg-panel px-1.5 py-1 font-mono text-xs text-text outline-none focus:border-accent-blue"
    />
  )

  return (
    <div className="space-y-2 rounded-lg border border-border bg-panel-2 p-3">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted">
        <PersonStanding size={14} />
        Persona de referencia
      </div>

      {!modelLoaded && <p className="text-xs text-muted">Cargá una nube para ubicarla.</p>}

      {metersPerViewerUnit == null && modelLoaded && (
        <p className="rounded border border-accent-orange/40 bg-accent-orange/10 px-2 py-1 text-[11px] leading-snug text-muted">
          Sin escala calibrada: la figura no puede medir 1.8 m de verdad. Calibrá con
          <span className="font-mono"> Medir (6)</span> y vuelve a ser fiel.
        </p>
      )}

      <div className="grid grid-cols-3 gap-1.5">
        {field(x, setX, 'x')}
        {field(y, setY, 'y')}
        {field(z, setZ, 'z')}
      </div>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="Etiqueta (opcional)"
        className="w-full rounded border border-border bg-panel px-1.5 py-1 text-xs text-text outline-none focus:border-accent-blue"
      />

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={place}
          disabled={!valid || !modelLoaded}
          className="flex-1 rounded border border-accent-blue/60 bg-accent-blue/15 px-2 py-1.5 text-xs text-text transition hover:bg-accent-blue/25 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Plantar
        </button>
        <button
          type="button"
          onClick={useCursor}
          title="Copiar la coordenada que está bajo el cursor"
          className="rounded border border-border bg-panel px-2 py-1.5 text-xs text-muted transition hover:text-text"
        >
          Del cursor
        </button>
      </div>

      <p className="text-[11px] leading-snug text-muted">
        Coordenadas COLMAP, las mismas del readout de abajo a la derecha. Pegar los tres
        números juntos llena los tres campos. El bloque se para en el piso; el punto amarillo
        marca la coordenada exacta (una pose del servidor es la cámara, ~1.3 m más arriba).
      </p>

      {people.length > 0 && (
        <div className="space-y-1 border-t border-border pt-2">
          {people.map((p) => (
            <div key={p.id} className="flex items-center gap-2 text-xs">
              <span className="flex-1 truncate text-text" title={p.label}>
                {p.label}
              </span>
              <span className="font-mono text-[10px] text-muted">
                {p.x.toFixed(2)} {p.y.toFixed(2)} {p.z.toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() => removePerson(p.id)}
                title="Quitar"
                className="rounded p-0.5 text-muted hover:text-accent-red"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => {
              clearPeople()
              setStatus('Figuras de referencia eliminadas.')
            }}
            className="w-full rounded border border-border px-2 py-1 text-[11px] text-muted transition hover:text-text"
          >
            Quitar todas ({people.length}) — piso {activeFloorId}
          </button>
        </div>
      )}
    </div>
  )
}
