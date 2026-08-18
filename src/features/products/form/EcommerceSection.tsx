import { GlobeIcon } from '../../../components/icons'
import { Field, Labeled, Section, Checkbox } from './Field'
import type { Draft } from './draft'

/**
 * Campos que só existem para alimentar a exportação de CSV pra Nuvemshop e
 * Shopify (`features/products/export/`) — nenhum tem equivalente no resto
 * do app comercial nem no catálogo pessoal. Preço, estoque, SKU e peso já
 * existem nas outras seções e são reaproveitados direto na exportação, sem
 * duplicar campo aqui.
 */
export function EcommerceSection({ draft, set }: { draft: Draft; set: (key: string) => (v: string) => void }) {
  return (
    <Section title="E-commerce" icon={<GlobeIcon />}>
      <Field
        label="Identificador da URL (handle)"
        value={draft.ecommerce_slug}
        onChange={set('ecommerce_slug')}
        placeholder="em branco = gerado do nome ao exportar"
      />

      <Labeled label="Descrição para a loja">
        <textarea
          value={draft.ecommerce_description}
          onChange={(e) => set('ecommerce_description')(e.target.value)}
          placeholder="Texto de vitrine pro cliente ver — diferente das Notas internas, lá embaixo."
          className="input mt-1 min-h-24"
        />
      </Labeled>

      <Field
        label="Categoria"
        value={draft.ecommerce_category_path}
        onChange={set('ecommerce_category_path')}
        placeholder='ex.: "Minerais > Quartzo"'
      />
      <Field
        label="Categoria Google Shopping"
        value={draft.ecommerce_google_category}
        onChange={set('ecommerce_google_category')}
        placeholder="ex.: Hobbies & Creative Arts > Collectibles > Rocks, Fossils & Minerals"
      />
      <Field label="Tags" value={draft.ecommerce_tags} onChange={set('ecommerce_tags')} placeholder="separadas por vírgula" />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Título SEO" value={draft.ecommerce_seo_title} onChange={set('ecommerce_seo_title')} />
        <Field label="Descrição SEO" value={draft.ecommerce_seo_description} onChange={set('ecommerce_seo_description')} />
      </div>

      <Labeled label="Dimensões do pacote (cm)">
        <div className="mt-1 grid grid-cols-3 gap-3">
          <input
            type="number"
            step="0.1"
            value={draft.ecommerce_package_height_cm}
            onChange={(e) => set('ecommerce_package_height_cm')(e.target.value)}
            placeholder="Altura"
            className="input"
          />
          <input
            type="number"
            step="0.1"
            value={draft.ecommerce_package_width_cm}
            onChange={(e) => set('ecommerce_package_width_cm')(e.target.value)}
            placeholder="Largura"
            className="input"
          />
          <input
            type="number"
            step="0.1"
            value={draft.ecommerce_package_length_cm}
            onChange={(e) => set('ecommerce_package_length_cm')(e.target.value)}
            placeholder="Comprimento"
            className="input"
          />
        </div>
      </Labeled>

      <div className="flex flex-wrap gap-4">
        <Checkbox
          label="Frete grátis"
          checked={draft.ecommerce_free_shipping === 'true'}
          onChange={(v) => set('ecommerce_free_shipping')(String(v))}
        />
        <Checkbox
          label="Publicado (visível na loja)"
          checked={draft.ecommerce_published === 'true'}
          onChange={(v) => set('ecommerce_published')(String(v))}
        />
      </div>

      <p className="text-xs text-stone-500">
        Peso, preço, estoque e SKU vêm das seções acima. Marca é preenchida automaticamente com o nome da empresa
        (Configurações da empresa) e condição sai sempre como "Novo" na hora de exportar.
      </p>
    </Section>
  )
}
