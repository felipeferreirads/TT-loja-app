import { useEffect, useMemo, useState } from 'react'
import { CloseIcon } from '../../../components/icons'
import { FilterPill } from '../../../components/ListToolbar'

/**
 * Localizar e substituir no modo planilha — versão PT da loja do
 * `FindReplaceDialog.tsx` do catálogo pessoal. Texto literal (sem regex), só
 * em colunas editáveis; quem monta as alterações é o `ProductSheet`.
 */
export interface ReplaceOptions {
  find: string
  replace: string
  matchCase: boolean
  /** Exige que a célula inteira seja igual ao termo. */
  wholeCell: boolean
  selectionOnly: boolean
}

export function replaceText(text: string, o: ReplaceOptions): string {
  if (o.find === '') return text
  if (o.wholeCell) {
    const same = o.matchCase ? text === o.find : text.toLocaleLowerCase() === o.find.toLocaleLowerCase()
    return same ? o.replace : text
  }
  if (o.matchCase) return text.split(o.find).join(o.replace)
  const hay = text.toLocaleLowerCase()
  const needle = o.find.toLocaleLowerCase()
  let out = ''
  let i = 0
  for (;;) {
    const at = hay.indexOf(needle, i)
    if (at === -1) return out + text.slice(i)
    out += text.slice(i, at) + o.replace
    i = at + needle.length
  }
}

export function FindReplaceDialog({
  hasSelection,
  onPreview,
  onApply,
  onClose,
}: {
  hasSelection: boolean
  /** Quantas células seriam alteradas, sem gravar nada. */
  onPreview: (o: ReplaceOptions) => number
  /** Grava e devolve quantas células mudaram. */
  onApply: (o: ReplaceOptions) => number
  onClose: () => void
}) {
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [matchCase, setMatchCase] = useState(false)
  const [wholeCell, setWholeCell] = useState(false)
  const [selectionOnly, setSelectionOnly] = useState(hasSelection)
  const [done, setDone] = useState<number | null>(null)

  useEffect(() => {
    if (!hasSelection) setSelectionOnly(false)
  }, [hasSelection])

  const opts: ReplaceOptions = { find, replace, matchCase, wholeCell, selectionOnly }
  const preview = useMemo(
    () => (find === '' ? 0 : onPreview(opts)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [find, replace, matchCase, wholeCell, selectionOnly],
  )
  const cells = (n: number) => `${n} ${n === 1 ? 'célula' : 'células'}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="find-replace-title"
        className="w-full max-w-md rounded-xl bg-stone-900"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-stone-800 p-5 pb-4">
          <div>
            <h2 id="find-replace-title" className="text-lg font-bold text-stone-100">
              Localizar e substituir
            </h2>
            <p className="mt-1 text-xs text-stone-500">Substitui o texto nas colunas editáveis da lista.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fechar" className="tap-icon text-stone-400 hover:text-stone-200">
            <CloseIcon />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <label className="block">
            <span className="section-title">Localizar</span>
            <input
              autoFocus
              value={find}
              onChange={(e) => {
                setFind(e.target.value)
                setDone(null)
              }}
              className="input mt-1"
            />
          </label>
          <label className="block">
            <span className="section-title">Substituir por</span>
            <input
              value={replace}
              onChange={(e) => {
                setReplace(e.target.value)
                setDone(null)
              }}
              className="input mt-1"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <FilterPill active={matchCase} onClick={() => setMatchCase((v) => !v)}>
              Diferenciar maiúsculas
            </FilterPill>
            <FilterPill active={wholeCell} onClick={() => setWholeCell((v) => !v)}>
              Célula inteira
            </FilterPill>
            {hasSelection && (
              <FilterPill active={selectionOnly} onClick={() => setSelectionOnly((v) => !v)}>
                Somente na seleção
              </FilterPill>
            )}
          </div>

          <div className="min-h-5 text-sm">
            {done != null ? (
              <span className="text-emerald-400">{cells(done)} {done === 1 ? 'alterada' : 'alteradas'}.</span>
            ) : find === '' ? null : preview === 0 ? (
              <span className="text-stone-500">Nenhuma ocorrência encontrada.</span>
            ) : (
              <span className="text-amber-400">{cells(preview)} {preview === 1 ? 'será alterada' : 'serão alteradas'}.</span>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-800 p-4">
          <button type="button" onClick={onClose} className="btn-secondary">
            Fechar
          </button>
          <button type="button" onClick={() => setDone(onApply(opts))} disabled={preview === 0} className="btn-primary">
            Substituir tudo
          </button>
        </div>
      </div>
    </div>
  )
}
