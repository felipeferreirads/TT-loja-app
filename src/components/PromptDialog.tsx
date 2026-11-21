import { useState, type FormEvent } from 'react'

/**
 * Substituto flutuante para `window.prompt` — mesmo modelo visual dos demais
 * diálogos do app (`fixed inset-0` + card `rounded-xl bg-stone-900`). Erro do
 * `onConfirm` fica DENTRO do diálogo (não `window.alert`) e mantém o valor
 * digitado; sucesso é responsabilidade do chamador fechar (`onClose`) — o
 * diálogo não sabe distinguir "ainda processando" de "fechar sozinho".
 */
export function PromptDialog({
  title,
  description,
  label,
  initialValue = '',
  placeholder,
  confirmLabel,
  cancelLabel,
  savingLabel,
  onConfirm,
  onClose,
}: {
  title: string
  description?: string
  label?: string
  initialValue?: string
  placeholder?: string
  confirmLabel: string
  cancelLabel: string
  /** Rótulo do botão de confirmar enquanto `onConfirm` está em andamento. */
  savingLabel?: string
  onConfirm: (value: string) => Promise<void> | void
  onClose: () => void
}) {
  const [value, setValue] = useState(initialValue)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const trimmed = value.trim()
    if (!trimmed || busy) return
    setBusy(true)
    setError(null)
    try {
      await onConfirm(trimmed)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        className="w-full max-w-sm space-y-4 rounded-xl bg-stone-900 p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-stone-100">{title}</h2>
        {description && <p className="text-sm text-stone-400">{description}</p>}
        <label className="block">
          {label && <span className="mb-1 block text-xs text-stone-400">{label}</span>}
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder={placeholder}
            className="input"
          />
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="btn-secondary flex-1 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button type="submit" disabled={busy || !value.trim()} className="btn-primary flex-1 disabled:opacity-50">
            {busy && savingLabel ? savingLabel : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}
