import { useEffect, useState } from 'react'
import { parseMoney } from '../format'

interface Props {
  id: string
  label: string
  hint?: string
  value: number | null
  onChange: (v: number | null) => void
  suffix?: string
  autoFocus?: boolean
  placeholder?: string
}

/** Text field that accepts "$85,000", "85k" or "1.2m" and shows a formatted value on blur. */
export function MoneyInput({ id, label, hint, value, onChange, suffix, autoFocus, placeholder = '$0' }: Props) {
  const [text, setText] = useState(value == null ? '' : value.toLocaleString('en-US'))
  useEffect(() => {
    if (parseMoney(text) !== value) setText(value == null ? '' : value.toLocaleString('en-US'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <span className="money">
        <span aria-hidden="true">$</span>
        <input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder={placeholder.replace('$', '')}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            onChange(parseMoney(e.target.value))
          }}
          onBlur={() => setText(value == null ? '' : value.toLocaleString('en-US'))}
        />
        {suffix && <span className="suffix">{suffix}</span>}
      </span>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}

interface NumProps {
  id: string
  label: string
  value: number | null
  onChange: (v: number | null) => void
  min: number
  max: number
  autoFocus?: boolean
}

export function NumberInput({ id, label, value, onChange, min, max, autoFocus }: NumProps) {
  return (
    <label className="field" htmlFor={id}>
      <span className="field-label">{label}</span>
      <input
        id={id}
        className="num-input"
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        autoFocus={autoFocus}
        value={value ?? ''}
        onChange={(e) => {
          const n = parseInt(e.target.value, 10)
          onChange(Number.isFinite(n) ? n : null)
        }}
      />
    </label>
  )
}
