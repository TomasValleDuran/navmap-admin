import { useState } from 'react'

interface Props {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  /** Slider granularity. The number input is free-form and only clamped to [min, max]. */
  step: number
  /** Decimal places shown in the number field. */
  precision?: number
  /** Optional unit suffix shown after the label (e.g. "m"). */
  unit?: string
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * A range slider paired with a manual number input bound to the same value.
 * The slider gives coarse/fast adjustment; the number field allows precise typing.
 * Typed values are clamped to [min, max] on commit (blur / Enter).
 */
export function SliderWithNumber({ label, value, onChange, min, max, step, precision = 3, unit }: Props) {
  const [text, setText] = useState(value.toFixed(precision))
  // Re-sync the text field when the value changes from elsewhere (slider, store), without an
  // effect — React's "adjust state during render" pattern (react.dev/learn/you-might-not-need-an-effect).
  const [lastValue, setLastValue] = useState(value)
  if (value !== lastValue) {
    setLastValue(value)
    setText(value.toFixed(precision))
  }

  const commit = () => {
    const parsed = parseFloat(text)
    if (Number.isFinite(parsed)) {
      const next = clamp(parsed, min, max)
      onChange(next)
      setText(next.toFixed(precision))
    } else {
      setText(value.toFixed(precision))
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 font-mono text-xs text-muted">
        <span>
          {label}
          {unit ? ` (${unit})` : ''}
        </span>
        <input
          type="number"
          step={step}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          className="w-24 rounded-md border border-border bg-panel px-2 py-0.5 text-right text-xs text-text outline-none focus:border-accent-blue/60"
        />
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={clamp(value, min, max)}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-accent-green"
      />
    </div>
  )
}
