// Teclado numérico de PIN — COMPARTILHADO entre o catálogo e a loja (ver
// scripts/shared-ui.mjs; editar no catálogo e rodar `npm run ui:sync`).
// Sem i18n e sem domínio: todos os textos entram por props. Ícones inline
// (o `icons.tsx` de cada app diverge e não pode ser importado daqui).
//
// `PinPad`   — teclado controlado (indicador de dígitos + 0–9, apagar, confirmar).
// `PinPrompt` — título, descrição, erro e teclado, com o valor sob controle
//               próprio; devolve o PIN digitado em `onSubmit`.

import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface PinPadLabels {
  /** Rótulo acessível do botão de apagar o último dígito. */
  delete: string
  /** Rótulo acessível do botão de confirmar. */
  submit: string
}

interface PinPadProps {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  minLength: number
  maxLength: number
  labels: PinPadLabels
  disabled?: boolean
  /** Aceita também o teclado físico: dígitos, Backspace e Enter. */
  captureKeyboard?: boolean
}

function BackspaceIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 5H9l-6 7 6 7h12a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1Z" />
      <path d="m17 9-6 6M11 9l6 6" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7.5" />
    </svg>
  )
}

const DIGITS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

const keyClass =
  'flex h-16 w-16 items-center justify-center rounded-full text-2xl font-medium transition select-none disabled:opacity-40 sm:h-[4.5rem] sm:w-[4.5rem]'

export function PinPad({ value, onChange, onSubmit, minLength, maxLength, labels, disabled = false, captureKeyboard = false }: PinPadProps) {
  const canSubmit = !disabled && value.length >= minLength

  // Refs para o listener do teclado físico enxergar sempre o valor atual sem
  // ser recriado a cada dígito.
  const latest = useRef({ value, onChange, onSubmit, canSubmit, disabled, maxLength })
  latest.current = { value, onChange, onSubmit, canSubmit, disabled, maxLength }

  useEffect(() => {
    if (!captureKeyboard) return
    const onKey = (e: KeyboardEvent) => {
      const cur = latest.current
      if (cur.disabled || e.ctrlKey || e.metaKey || e.altKey) return
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault()
        if (cur.value.length < cur.maxLength) cur.onChange(cur.value + e.key)
      } else if (e.key === 'Backspace') {
        e.preventDefault()
        cur.onChange(cur.value.slice(0, -1))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (cur.canSubmit) cur.onSubmit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [captureKeyboard])

  const press = (digit: string) => {
    if (!disabled && value.length < maxLength) onChange(value + digit)
  }

  const slots = Math.max(minLength, value.length)

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex h-4 items-center gap-3" aria-hidden="true">
        {Array.from({ length: slots }, (_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border transition ${
              i < value.length ? 'border-amber-400 bg-amber-400' : 'border-stone-600 bg-transparent'
            }`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-4">
        {DIGITS.map((d) => (
          <button
            key={d}
            type="button"
            disabled={disabled}
            onClick={() => press(d)}
            className={`${keyClass} bg-stone-800/80 text-stone-100 hover:bg-stone-700 active:bg-stone-600`}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          disabled={disabled || value.length === 0}
          onClick={() => onChange(value.slice(0, -1))}
          aria-label={labels.delete}
          title={labels.delete}
          className={`${keyClass} text-stone-300 hover:bg-stone-800 active:bg-stone-700`}
        >
          <BackspaceIcon />
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => press('0')}
          className={`${keyClass} bg-stone-800/80 text-stone-100 hover:bg-stone-700 active:bg-stone-600`}
        >
          0
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={onSubmit}
          aria-label={labels.submit}
          title={labels.submit}
          className={`${keyClass} bg-amber-600 text-white hover:bg-amber-500 active:bg-amber-700 disabled:bg-stone-800`}
        >
          <CheckIcon />
        </button>
      </div>
    </div>
  )
}

interface PinPromptProps {
  title: ReactNode
  description?: ReactNode
  minLength: number
  maxLength: number
  labels: PinPadLabels
  /** Recebe o PIN digitado. Devolve o texto de erro (o campo é limpo) ou null quando aceito. */
  onSubmit: (pin: string) => Promise<string | null> | string | null
  /** Erro exibido ao montar (ex.: "os PINs não coincidem" ao voltar um passo). */
  initialError?: string | null
  captureKeyboard?: boolean
}

export function PinPrompt({
  title,
  description,
  minLength,
  maxLength,
  labels,
  onSubmit,
  initialError = null,
  captureKeyboard = true,
}: PinPromptProps) {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(initialError)
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (busy || value.length < minLength) return
    setBusy(true)
    try {
      const result = await onSubmit(value)
      if (result) {
        setError(result)
        setValue('')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-stone-100">{title}</h2>
        {description && <p className="mx-auto max-w-xs text-sm leading-relaxed text-stone-400">{description}</p>}
      </div>
      <PinPad
        value={value}
        onChange={(v) => {
          setValue(v)
          if (error) setError(null)
        }}
        onSubmit={() => void submit()}
        minLength={minLength}
        maxLength={maxLength}
        labels={labels}
        disabled={busy}
        captureKeyboard={captureKeyboard}
      />
      <p role="alert" className="min-h-5 text-sm text-red-400">
        {error}
      </p>
    </div>
  )
}
