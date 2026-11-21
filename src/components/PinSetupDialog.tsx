// Diálogo para ligar, trocar ou desligar um PIN com o teclado numérico —
// COMPARTILHADO entre o catálogo e a loja (ver scripts/shared-ui.mjs; editar
// no catálogo e rodar `npm run ui:sync`). Textos por props.
//
// Passos: `enable` = novo → confirmar; `change` = atual → novo → confirmar;
// `disable` = atual. Quando a confirmação não bate, volta ao passo "novo".

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { PinPrompt, type PinPadLabels } from './PinPad'

export type PinSetupMode = 'enable' | 'change' | 'disable'

export interface PinSetupLabels extends PinPadLabels {
  titleEnable: string
  titleChange: string
  titleDisable: string
  stepCurrent: string
  stepNew: string
  stepNewDescription?: string
  stepConfirm: string
  wrongPin: string
  minLength: string
  mismatch: string
  cancel: string
}

type Step = 'current' | 'new' | 'confirm'

const STEPS: Record<PinSetupMode, Step[]> = {
  enable: ['new', 'confirm'],
  change: ['current', 'new', 'confirm'],
  disable: ['current'],
}

interface PinSetupDialogProps {
  mode: PinSetupMode
  minLength: number
  maxLength: number
  labels: PinSetupLabels
  /** Confere o PIN atual (passos de trocar e desligar). */
  verifyCurrent: (pin: string) => Promise<boolean>
  /** Conclusão: o PIN novo (ligar/trocar) ou null (desligar). */
  onComplete: (newPin: string | null) => Promise<void> | void
  onClose: () => void
}

export function PinSetupDialog({ mode, minLength, maxLength, labels, verifyCurrent, onComplete, onClose }: PinSetupDialogProps) {
  const steps = STEPS[mode]
  const [index, setIndex] = useState(0)
  const [firstPin, setFirstPin] = useState('')
  const [carriedError, setCarriedError] = useState<string | null>(null)
  // Muda a cada passo para remontar o PinPrompt com o campo vazio.
  const [attempt, setAttempt] = useState(0)
  const step = steps[index]

  // Esc fecha só este diálogo (fase de captura: não chega ao diálogo de baixo).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      e.preventDefault()
      e.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  const goTo = (next: number, error: string | null = null) => {
    setCarriedError(error)
    setIndex(next)
    setAttempt((a) => a + 1)
  }

  const finish = async (pin: string | null) => {
    await onComplete(pin)
    onClose()
    return null
  }

  const handleSubmit = async (pin: string): Promise<string | null> => {
    if (step === 'current') {
      if (!(await verifyCurrent(pin))) return labels.wrongPin
      if (mode === 'disable') return finish(null)
      goTo(index + 1)
      return null
    }
    if (step === 'new') {
      if (pin.length < minLength) return labels.minLength
      setFirstPin(pin)
      goTo(index + 1)
      return null
    }
    if (pin !== firstPin) {
      goTo(steps.indexOf('new'), labels.mismatch)
      return null
    }
    return finish(pin)
  }

  const title = mode === 'enable' ? labels.titleEnable : mode === 'change' ? labels.titleChange : labels.titleDisable
  const stepTitle = step === 'current' ? labels.stepCurrent : step === 'new' ? labels.stepNew : labels.stepConfirm

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-stone-700/70 bg-stone-900 p-6 shadow-2xl"
      >
        <p className="text-center text-xs font-medium uppercase tracking-wide text-stone-500">{title}</p>
        <PinPrompt
          key={attempt}
          title={stepTitle}
          description={step === 'new' ? labels.stepNewDescription : undefined}
          minLength={step === 'current' ? 1 : minLength}
          maxLength={maxLength}
          labels={labels}
          initialError={carriedError}
          onSubmit={handleSubmit}
        />
        <button type="button" onClick={onClose} className="btn-secondary w-full">
          {labels.cancel}
        </button>
      </div>
    </div>,
    document.body,
  )
}
