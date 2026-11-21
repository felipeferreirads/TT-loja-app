import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchGeologicalTime, formatAgeRange, GEO_TIME_STALE_TIME, geoTimeRangeNode } from '../../../lib/geologicalTime'
import { GeologicalTimeSelect } from './GeologicalTimeSelect'
import { Field } from './Field'
import type { Draft } from './draft'

/**
 * Tempo Geológico do fóssil como um todo (0041): seletor em cascata ICS com
 * faixa opcional (início → fim) e a Idade, que é preenchida a partir do nó
 * escolhido e continua editável. Mesmo comportamento do bloco "Detalhes por
 * tipo" do formulário do catálogo pessoal.
 */
export function FossilTimeFields({ draft, setMany }: { draft: Draft; setMany: (values: Draft) => void }) {
  const { data: geoAll } = useQuery({ queryKey: ['geological-time'], queryFn: fetchGeologicalTime, staleTime: GEO_TIME_STALE_TIME })
  const [rangeOn, setRangeOn] = useState(false)
  const hasEnd = !!draft.geological_time_end_id
  const showRange = (rangeOn || hasEnd) && !!draft.geological_time_id

  return (
    <div className="space-y-3">
      <div>
        <span className="mb-1 block text-xs text-stone-400">Tempo Geológico</span>
        <GeologicalTimeSelect
          value={draft.geological_time_id || null}
          onChange={(node) => {
            const range = node && geoAll ? geoTimeRangeNode(geoAll, node.id, draft.geological_time_end_id) : null
            setMany({
              geological_time_id: node?.id ?? '',
              fossil_age: node ? formatAgeRange(range ?? node) : draft.fossil_age,
            })
          }}
        />
        <label className="mt-2 flex items-center gap-2 text-xs text-stone-400">
          <input
            type="checkbox"
            checked={rangeOn || hasEnd}
            disabled={!draft.geological_time_id}
            onChange={(e) => {
              setRangeOn(e.target.checked)
              // Desmarcar descarta o fim e volta a idade ao nó inicial.
              if (!e.target.checked && hasEnd) {
                const start = geoAll?.find((n) => n.id === draft.geological_time_id)
                setMany({ geological_time_end_id: '', fossil_age: start ? formatAgeRange(start) : draft.fossil_age })
              }
            }}
          />
          Abrange uma faixa (do tempo acima até outro)
        </label>
        {showRange && (
          <div className="mt-2">
            <span className="mb-1 block text-xs text-stone-400">Tempo Geológico (fim da faixa)</span>
            <GeologicalTimeSelect
              value={draft.geological_time_end_id || null}
              onChange={(node) => {
                const range = node && geoAll ? geoTimeRangeNode(geoAll, draft.geological_time_id, node.id) : null
                const start = geoAll?.find((n) => n.id === draft.geological_time_id)
                setMany({
                  geological_time_end_id: node?.id ?? '',
                  fossil_age: range ? formatAgeRange(range) : start ? formatAgeRange(start) : draft.fossil_age,
                })
              }}
            />
          </div>
        )}
      </div>
      <Field label="Idade" value={draft.fossil_age} onChange={(v) => setMany({ fossil_age: v })} />
    </div>
  )
}
