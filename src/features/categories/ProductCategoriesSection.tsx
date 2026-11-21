import { CategoryChipPicker } from '../../components/CategoryChipPicker'
import { CategoryIcon } from '../../components/icons'
import { Section } from '../products/form/Field'
import { createCategory, useCategories } from './api'

/** Categorias do produto (0042) — mesmo seletor de chips da ficha do catálogo pessoal. */
export function ProductCategoriesSection({
  value,
  onChange,
  onError,
}: {
  value: string[]
  onChange: (ids: string[]) => void
  onError: (message: string) => void
}) {
  const { data: categories = [] } = useCategories()
  return (
    <Section title="Categorias" icon={<CategoryIcon />}>
      <CategoryChipPicker
        categories={categories}
        allCategories={categories}
        value={value}
        onChange={onChange}
        onError={onError}
        onCreate={async (name, parentId) => (await createCategory(name, parentId)).id}
        labels={{
          hint: 'Um produto pode estar em mais de uma categoria (como álbuns de uma galeria).',
          newCategory: 'Nova categoria',
          insideOptional: 'Dentro de (opcional)',
          topLevel: '— nível principal —',
          create: 'Criar',
          cancel: 'Cancelar',
        }}
      />
    </Section>
  )
}
