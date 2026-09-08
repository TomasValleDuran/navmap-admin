import { useNavmapStore } from '../store/useNavmapStore'
import { MODES } from './modes'
import type { Mode } from '../types/navmap'

/**
 * The mode picker as a narrow icon rail, always visible.
 *
 * It used to be a stacked list of labelled buttons that ate the top third of the sidebar and
 * scrolled away as soon as any list grew. Modes are the one control you reach for constantly,
 * so they get fixed screen space and everything else gets the collapsible panel.
 */
export function ModeRail() {
  const mode = useNavmapStore((s) => s.mode)
  const setMode = useNavmapStore((s) => s.setMode)
  const setStatus = useNavmapStore((s) => s.setStatus)

  const pick = (m: Mode, hint: string) => {
    setMode(m)
    setStatus(hint)
  }

  return (
    <nav className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-panel py-2">
      {MODES.map((m, i) => {
        const active = mode === m.key
        const Icon = m.Icon
        const newGroup = i > 0 && MODES[i - 1].group !== m.group
        return (
          <div key={m.key} className="flex w-full flex-col items-center">
            {newGroup && <div className="my-1 h-px w-6 bg-border" />}
            <button
              type="button"
              title={`${m.label} — ${m.hint} (${m.shortcut})`}
              aria-label={m.label}
              aria-pressed={active}
              onClick={() => pick(m.key, m.hint)}
              className={`relative flex h-9 w-9 items-center justify-center rounded-md border transition ${
                active
                  ? 'border-accent-blue/60 bg-accent-blue/15 text-accent-blue'
                  : 'border-transparent text-muted hover:border-border hover:bg-panel-2 hover:text-text'
              }`}
            >
              <Icon size={17} />
              <span className="absolute bottom-0 right-0.5 font-mono text-[8px] leading-none text-muted/70">
                {m.shortcut}
              </span>
            </button>
          </div>
        )
      })}
    </nav>
  )
}
