import type { StoreItemKind } from '../../../types/db'

/**
 * Ocorrência do mineral NO ITEM (`store_product_minerals.role`, 0041) — mesmo
 * vocabulário de `MINERAL_ROLES` do catálogo pessoal (formFields.ts): o valor
 * gravado é o código em inglês, idêntico ao de `specimen_minerals.role`, então a
 * importação da coleção copia sem conversão. Se o mineral é o foco da peça NÃO
 * está aqui: é o campo `is_main`. "Minerais da amostra" existe em mineral,
 * fóssil e meteorito (como no catálogo).
 */
export const MINERAL_ROLES: Partial<Record<StoreItemKind, readonly string[]>> = {
  mineral: ['host', 'inclusion', 'replaced'],
  fossil: ['replacement', 'permineralization', 'cavity_crystals', 'matrix_associated', 'original_material'],
  meteorite: ['constituent', 'inclusion', 'alteration', 'replaced'],
}

export const MINERAL_ROLE_LABELS: Record<string, string> = {
  replacement: 'Substituição do material original',
  permineralization: 'Permineralização',
  cavity_crystals: 'Cristais em cavidade',
  matrix_associated: 'Associado na matriz',
  constituent: 'Constituinte',
  host: 'Hospedeiro',
  inclusion: 'Inclusão',
  alteration: 'Produto de alteração',
  replaced: 'Mineral original (substituído ou dissolvido)',
  original_material: 'Material original preservado',
}

export const MINERAL_ROLE_HINTS: Record<string, string> = {
  host: 'Mineral que envolve ou contém outro mineral.',
  inclusion: 'Mineral contido no interior de outro.',
  alteration: 'Produto da alteração de outro mineral, como os óxidos formados pelo intemperismo terrestre.',
  replaced: 'Mineral original que foi substituído por outro ou dissolvido, e que mantém apenas a forma (pseudomorfose).',
  replacement: 'Mineral que tomou o lugar do material original do fóssil.',
  permineralization: 'Mineral depositado nos poros do material original, que é preservado.',
  cavity_crystals: 'Cristais formados no interior de uma cavidade do fóssil ou da rocha que o contém.',
  matrix_associated: 'Mineral presente na rocha que envolve o fóssil, sem fazer parte do fóssil.',
  original_material: 'Mineral que ainda compõe o fóssil, sem ter sido substituído.',
  constituent: 'Mineral que compõe a massa do meteorito.',
}

export const MINERAL_MAIN_HINT =
  'Mineral que define o item. É usado para classificar o item nas categorias. Mais de um mineral pode ser marcado.'

/** A seção "Minerais da amostra" se aplica a este tipo de item? */
export const mineralsSectionApplies = (kind: StoreItemKind): boolean => kind in MINERAL_ROLES

/** Papel válido para o tipo, ou '' (valor de outro tipo ou legado fica oculto, sem apagar). */
export function normalizeMineralRole(kind: StoreItemKind, role: string | null | undefined): string {
  return role && (MINERAL_ROLES[kind] ?? []).includes(role) ? role : ''
}
