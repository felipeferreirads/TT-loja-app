import { useState } from 'react'
import { DocumentIcon } from '../../../components/icons'
import { HintSelect } from '../../../components/HintSelect'
import { InfoTooltip } from '../../../components/InfoTooltip'
import type { StoreFiscalType } from '../../../types/db'
import { FISCAL_TYPE_LABELS, TAX_ORIGIN_OPTIONS, formatNcm, onlyDigits } from '../fiscal'
import { Labeled, Section } from './Field'
import type { Draft } from './draft'

const NCM_PORTAL_URL = 'https://portalunico.siscomex.gov.br/classif/#/sumario?perfil=publico'

/**
 * Dados fiscais do produto — espelham a seção "Nota fiscal" da Nuvemshop
 * (origem, tipo, NCM, CEST). A planilha de produtos da Nuvemshop não tem
 * colunas fiscais, então estes campos ficam como cadastro de referência no
 * app; o preenchimento na Nuvemshop continua sendo feito lá.
 */
export function FiscalSection({ draft, set }: { draft: Draft; set: (key: string) => (v: string) => void }) {
  const currentIsRare = draft.tax_origin !== '' && !TAX_ORIGIN_OPTIONS.find((o) => o.value === draft.tax_origin)?.common
  const [showAll, setShowAll] = useState(false)
  const options = showAll || currentIsRare ? TAX_ORIGIN_OPTIONS : TAX_ORIGIN_OPTIONS.filter((o) => o.common)

  const ncmDigits = onlyDigits(draft.ncm)
  const cestDigits = onlyDigits(draft.cest)
  const ncmInvalid = ncmDigits.length > 0 && ncmDigits.length !== 8
  const cestInvalid = cestDigits.length > 0 && cestDigits.length !== 7

  return (
    <Section title="Nota fiscal" icon={<DocumentIcon />}>
      <Labeled label="Origem">
        <div className="mt-1">
          <HintSelect
            value={draft.tax_origin}
            options={options}
            onChange={set('tax_origin')}
            placeholder="Selecionar"
            ariaLabel="Origem da mercadoria"
          />
        </div>
      </Labeled>
      {!showAll && !currentIsRare && (
        <button type="button" onClick={() => setShowAll(true)} className="-mt-1 text-xs text-amber-500 hover:underline">
          Mostrar outros códigos de origem
        </button>
      )}

      <Labeled label="Tipo">
        <div className="mt-1 flex flex-wrap gap-2">
          {(Object.keys(FISCAL_TYPE_LABELS) as StoreFiscalType[]).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={draft.fiscal_type === value}
              onClick={() => set('fiscal_type')(draft.fiscal_type === value ? '' : value)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition ${
                draft.fiscal_type === value ? 'bg-amber-600 text-white' : 'bg-stone-800 text-stone-300 hover:bg-stone-700'
              }`}
            >
              {FISCAL_TYPE_LABELS[value]}
            </button>
          ))}
        </div>
      </Labeled>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Labeled label="NCM">
          <input
            inputMode="numeric"
            value={formatNcm(draft.ncm)}
            onChange={(e) => set('ncm')(onlyDigits(e.target.value).slice(0, 8))}
            placeholder="0000.00.00"
            aria-invalid={ncmInvalid}
            className={`input mt-1 ${ncmInvalid ? 'border-red-500' : ''}`}
          />
          {ncmInvalid && <span className="mt-1 block text-xs text-red-400">O NCM deve ter 8 dígitos.</span>}
        </Labeled>
        <Labeled label="CEST">
          <input
            inputMode="numeric"
            value={cestDigits}
            onChange={(e) => set('cest')(onlyDigits(e.target.value).slice(0, 7))}
            placeholder="Opcional"
            aria-invalid={cestInvalid}
            className={`input mt-1 ${cestInvalid ? 'border-red-500' : ''}`}
          />
          {cestInvalid && <span className="mt-1 block text-xs text-red-400">O CEST deve ter 7 dígitos.</span>}
        </Labeled>
      </div>

      <p className="flex items-start gap-1.5 text-xs text-stone-500">
        <InfoTooltip
          text="O CEST é exigido apenas para produtos sujeitos à substituição tributária. Na maioria dos minerais, fósseis e meteoritos, o campo fica em branco."
          iconClassName="h-3.5 w-3.5"
          className="mt-0.5 shrink-0 text-stone-500 hover:text-stone-300"
        />
        <span>
          O CEST é necessário só para produtos com substituição tributária.{' '}
          <a href={NCM_PORTAL_URL} target="_blank" rel="noreferrer" className="text-amber-500 hover:underline">
            Consultar a NCM no Portal Único
          </a>
          .
        </span>
      </p>
    </Section>
  )
}
