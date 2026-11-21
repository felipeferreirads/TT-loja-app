import { useCallback, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { TruckIcon } from '../../../components/icons'
import { fetchSuppliersWithStorefronts, storefrontLabel, SUPPLIERS_WITH_STOREFRONTS_KEY } from '../../suppliers/api'
import { SupplierPicker } from '../../suppliers/SupplierPicker'
import type { PartyRef, ProvenanceDraft } from '../provenance'
import { Field, Labeled, Section } from './Field'
import { ProvenanceEditor } from './ProvenanceEditor'
import type { Draft } from './draft'

/**
 * Aquisição e procedência (0036/0041) — fornecedor (cadastrado, com a loja de
 * onde veio, ou texto livre), código do fornecedor, data de aquisição e
 * cadeia de ex-donos, como na área privada do item no catálogo pessoal. A
 * lista de ex-donos é gravada no "Salvar" do produto (ver ProductPage).
 */
export function AcquisitionSection({
  draft,
  setMany,
  provenance,
  onProvenanceChange,
}: {
  draft: Draft
  setMany: (values: Draft) => void
  provenance: ProvenanceDraft[]
  onProvenanceChange: (rows: ProvenanceDraft[]) => void
}) {
  const { data: suppliers = [] } = useQuery({ queryKey: SUPPLIERS_WITH_STOREFRONTS_KEY, queryFn: fetchSuppliersWithStorefronts })

  const parties: PartyRef[] = useMemo(() => suppliers.map((s) => ({ id: s.id, name: s.name, aliases: s.aliases ?? [] })), [suppliers])
  const nameSuggestions = useCallback(
    async (q: string) => {
      const needle = q.trim().toLocaleLowerCase('pt-BR')
      return parties
        .flatMap((p) => [p.name, ...p.aliases])
        .filter((n) => !needle || n.toLocaleLowerCase('pt-BR').includes(needle))
        .slice(0, 20)
    },
    [parties],
  )

  // Fim da cadeia de ex-donos: quem vendeu para você (só lembrete, não grava nada).
  const supplier = suppliers.find((s) => s.id === draft.supplier_id)
  const storefront = supplier?.storefronts.find((f) => f.id === draft.supplier_storefront_id)
  const endNote = supplier ? (storefront ? `${supplier.name} (${storefrontLabel(storefront)})` : supplier.name) : draft.supplier_text?.trim() || null

  return (
    <Section title="Aquisição e procedência" icon={<TruckIcon />}>
      <Labeled label="Fornecedor">
        <div className="mt-1">
          <SupplierPicker
            allowText
            value={{
              supplierId: draft.supplier_id || null,
              storefrontId: draft.supplier_storefront_id || null,
              text: draft.supplier_text ?? '',
            }}
            onChange={(v) =>
              setMany({
                supplier_id: v.supplierId ?? '',
                supplier_storefront_id: v.storefrontId ?? '',
                supplier_text: v.text,
              })
            }
          />
        </div>
      </Labeled>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Código do fornecedor" value={draft.supplier_code} onChange={(v) => setMany({ supplier_code: v })} />
        <Field label="Data de aquisição" value={draft.acquisition_date} onChange={(v) => setMany({ acquisition_date: v })} type="date" />
      </div>

      <Labeled label="Ex-donos">
        <div className="mt-1">
          <ProvenanceEditor
            value={provenance}
            onChange={onProvenanceChange}
            nameSuggestions={nameSuggestions}
            parties={parties}
            endNote={endNote}
          />
        </div>
      </Labeled>
    </Section>
  )
}
