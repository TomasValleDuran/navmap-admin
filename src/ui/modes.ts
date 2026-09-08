import {
  Anchor,
  ArrowUpDown,
  BrickWall,
  Crosshair,
  Eye,
  GitBranch,
  MapPin,
  Navigation,
  PersonStanding,
  Ruler,
  ScanEye,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Mode } from '../types/navmap'

export interface ModeDef {
  key: Mode
  label: string
  hint: string
  Icon: LucideIcon
  shortcut: string
  /** Which rail group it belongs to — separators are drawn between groups. */
  group: 'view' | 'draw' | 'tools'
}

/**
 * The modes, in one place: the rail renders them, the keyboard shortcuts resolve them, and the
 * status bar quotes their hint. Adding a mode means adding a row here and nothing else.
 */
export const MODES: ModeDef[] = [
  { key: 'view', label: 'Ver', hint: 'Solo cámara, sin edición.', Icon: Eye, shortcut: '1', group: 'view' },
  { key: 'select', label: 'Seleccionar', hint: 'Click en un nodo para inspeccionarlo.', Icon: Crosshair, shortcut: '5', group: 'view' },

  { key: 'poi', label: 'POI', hint: 'Click en el piso para crear un POI.', Icon: MapPin, shortcut: '2', group: 'draw' },
  { key: 'waypoint', label: 'Waypoint', hint: 'Click en el piso para crear un waypoint.', Icon: Navigation, shortcut: '3', group: 'draw' },
  { key: 'edge', label: 'Conectar', hint: 'Click en dos nodos para conectarlos.', Icon: GitBranch, shortcut: '4', group: 'draw' },
  { key: 'connect-floors', label: 'Conectar pisos', hint: 'Click en un nodo, cambiá de piso y click en otro nodo para conectarlos (escaleras/ascensor).', Icon: ArrowUpDown, shortcut: '8', group: 'draw' },
  { key: 'wall', label: 'Pared', hint: 'Click en los dos extremos de una pared, sobre el piso. La nube sparse no las muestra: se marcan a mano.', Icon: BrickWall, shortcut: '0', group: 'draw' },

  { key: 'measure', label: 'Medir', hint: 'Click en dos puntos del modelo para medir.', Icon: Ruler, shortcut: '6', group: 'tools' },
  { key: 'anchor', label: 'Ancla AR', hint: 'Click en un punto físico identificable para crear un ancla de alineación AR.', Icon: Anchor, shortcut: '7', group: 'tools' },
  { key: 'sight', label: 'Visión', hint: 'Click en el piso donde estaría parado el usuario: se marca qué vería y qué le tapan las paredes.', Icon: ScanEye, shortcut: 'v', group: 'tools' },
  { key: 'person', label: 'Persona', hint: 'Escribí una coordenada COLMAP y plantá una figura de 1.8 m para comparar escala y posición.', Icon: PersonStanding, shortcut: '9', group: 'tools' },
]

export const MODE_LABELS = Object.fromEntries(MODES.map((m) => [m.key, m])) as Record<Mode, ModeDef>

export const MODE_KEYS: Record<string, Mode> = Object.fromEntries(
  MODES.map((m) => [m.shortcut, m.key]),
)
