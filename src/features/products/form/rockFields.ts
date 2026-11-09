// "Rochas da amostra" (0032) — vocabulário, regras de visibilidade e conversões.
// Cópia, só em PT (sem i18n), de `src/features/specimens/rockFields.ts` + dos
// textos `rocks.options.*` / `rocks.hints.*` do catálogo pessoal: os valores
// gravados são as MESMAS chaves em inglês (ex.: 'igneous', 'plutonic'), para a
// importação da coleção (`importFromCollection.ts`) copiar sem conversão.
// `texture` é multi-valor (texto separado por vírgula).

import type { StoreItemKind, StoreProductRock, StoreProductRockInput } from '../../../types/db'

export interface RockOption {
  value: string
  label: string
  hint: string
}

const o = (value: string, label: string, hint: string): RockOption => ({ value, label, hint })

export const ROCK_TYPES: RockOption[] = [
  o('igneous', 'Ígnea', 'Formada pelo resfriamento e solidificação de magma ou lava. Costuma ter cristais entrelaçados ou aspecto de vidro.'),
  o('sedimentary', 'Sedimentar', 'Formada pela compactação de grãos, restos orgânicos ou precipitação química. Costuma apresentar camadas.'),
  o('metamorphic', 'Metamórfica', 'Rocha transformada por calor e pressão. Costuma apresentar bandas ou minerais alinhados.'),
  o('impact', 'Impacto', 'Rocha ou vidro formado ou alterado pela colisão de um meteorito com a superfície.'),
]

export const ROCK_SUBTYPES: Record<string, RockOption[]> = {
  igneous: [
    o('plutonic', 'Plutônica', 'Ígnea que resfriou lentamente em profundidade. Cristais grandes e visíveis, como no granito.'),
    o('volcanic', 'Vulcânica', 'Ígnea que resfriou rapidamente na superfície. Grãos muito finos ou aspecto de vidro, como no basalto.'),
    o('hypabyssal', 'Hipabissal', 'Ígnea que resfriou a pouca profundidade. Textura intermediária, geralmente com cristais maiores dentro de massa fina.'),
    o('pyroclastic', 'Piroclástica', 'Formada por fragmentos expelidos em erupções explosivas, como tufos e cinzas consolidadas.'),
  ],
  sedimentary: [
    o('clastic', 'Clástica', 'Sedimentar formada por fragmentos de outras rochas, como arenito e conglomerado.'),
    o('chemical', 'Química', 'Sedimentar formada pela precipitação de minerais dissolvidos na água.'),
    o('biochemical', 'Bioquímica', 'Sedimentar formada pela ação ou pelos restos de organismos, como alguns calcários.'),
    o('organic', 'Orgânica', 'Sedimentar formada pelo acúmulo de matéria orgânica, como o carvão.'),
    o('evaporitic', 'Evaporítica', 'Sedimentar formada pela evaporação da água, como o sal-gema e o gesso.'),
  ],
  metamorphic: [
    o('regional', 'Regional', 'Metamórfica formada em grandes áreas por calor e pressão, geralmente com foliação.'),
    o('contact', 'De contato', 'Metamórfica formada pelo calor de uma intrusão de magma. Geralmente sem foliação.'),
    o('dynamic', 'Dinâmica', 'Metamórfica formada por deformação em zonas de falha, com minerais esmagados ou estirados.'),
    o('hydrothermal', 'Hidrotermal', 'Metamórfica alterada pela circulação de fluidos quentes ricos em minerais.'),
  ],
  impact: [
    o('tektite', 'Tectito', 'Vidro natural formado pela fusão de rocha terrestre no impacto, ejetado e resfriado no ar.'),
    o('suevite', 'Suevito', 'Brecha de impacto com fragmentos de rocha e vidro, encontrada em crateras.'),
    o('impact_breccia', 'Brecha de impacto', 'Rocha de fragmentos angulosos quebrados pelo impacto e depois cimentados.'),
    o('impact_melt', 'Fusão de impacto', 'Rocha formada pelo resfriamento da rocha fundida pelo impacto.'),
  ],
}

const GRAIN_CRYSTALLINE: RockOption[] = [
  o('not_visible', 'Não visível', 'Grãos ou cristais que não se distinguem a olho nu nem com lupa.'),
  o('fine', 'Fina', 'Grãos mal distinguíveis a olho nu.'),
  o('medium', 'Média', 'Grãos distinguíveis a olho nu, de cerca de 1 a 5 mm.'),
  o('coarse', 'Grossa', 'Grãos grandes, maiores que 5 mm.'),
]
const GRAIN_SEDIMENTARY: RockOption[] = [
  o('clay', 'Argila', 'Partículas menores que 0,004 mm. A rocha tem toque liso e os grãos não são visíveis.'),
  o('silt', 'Silte', 'Partículas entre 0,004 e 0,06 mm, perceptíveis apenas como aspereza fina ao toque.'),
  o('sand', 'Areia', 'Grãos entre 0,06 e 2 mm, visíveis a olho nu ou com lupa.'),
  o('gravel', 'Cascalho', 'Fragmentos maiores que 2 mm, como seixos.'),
]
export const grainSizeOptions = (rockType: string): RockOption[] => (rockType === 'sedimentary' ? GRAIN_SEDIMENTARY : GRAIN_CRYSTALLINE)
export const subtypeOptions = (rockType: string): RockOption[] => ROCK_SUBTYPES[rockType] ?? []

export const ROCK_TEXTURES: RockOption[] = [
  o('visible_crystals', 'Cristais visíveis', 'Cristais individuais distinguíveis a olho nu.'),
  o('invisible_crystals', 'Cristais não visíveis', 'Cristais pequenos demais para serem vistos sem microscópio.'),
  o('porphyritic', 'Porfirítica', 'Cristais grandes dentro de uma massa de grãos finos.'),
  o('glassy', 'Vítrea', 'Aspecto de vidro, sem cristais visíveis, como na obsidiana.'),
  o('vesicular', 'Vesicular', 'Cheia de pequenas cavidades deixadas por bolhas de gás.'),
  o('clastic', 'Clástica', 'Formada por fragmentos ou grãos de outras rochas unidos.'),
  o('foliated', 'Foliada', 'Minerais alinhados em planos paralelos.'),
  o('brecciated', 'Brechada', 'Fragmentos angulosos unidos por material mais fino.'),
]

export const ROCK_STRUCTURES: RockOption[] = [
  o('massive', 'Maciça', 'Sem camadas, bandas ou orientação visível.'),
  o('bedded', 'Acamadada', 'Camadas paralelas visíveis, geralmente espessas.'),
  o('laminated', 'Laminada', 'Camadas paralelas muito finas.'),
  o('banded', 'Bandada', 'Faixas alternadas de cores ou composições diferentes.'),
  o('schistose', 'Xistosa', 'Minerais achatados, como micas, que fazem a rocha se separar em lâminas.'),
  o('gneissic', 'Gnáissica', 'Faixas alternadas de minerais claros e escuros, típicas do gnaisse.'),
  o('flow', 'Fluidal', 'Bandas curvas formadas pelo fluxo de lava ou magma viscoso.'),
]

export const ROCK_COLOR_INDEXES: RockOption[] = [
  o('light', 'Claro', 'Predominam minerais claros, como quartzo e feldspato (ex.: granito).'),
  o('intermediate', 'Intermediário', 'Mistura equilibrada de minerais claros e escuros (ex.: diorito).'),
  o('dark', 'Escuro', 'Predominam minerais escuros, como piroxênio e olivina (ex.: basalto).'),
  o('very_dark', 'Muito escuro', 'Quase só minerais escuros, ricos em ferro e magnésio (ex.: peridotito).'),
]

export const ROCK_HCL_REACTIONS: RockOption[] = [
  o('none', 'Nenhuma', 'Não há efervescência: a rocha não contém carbonato em quantidade perceptível.'),
  o('weak', 'Fraca', 'Efervescência fraca ou apenas no pó: carbonato em pequena quantidade.'),
  o('strong', 'Forte', 'Efervescência intensa na rocha inteira, típica de calcário e mármore.'),
]

export const ROCK_ROLES: RockOption[] = [
  o('main', 'Rocha principal', 'Rocha que constitui a maior parte do item.'),
  o('matrix', 'Matriz', 'Rocha que envolve ou sustenta um fóssil ou mineral.'),
  o('host', 'Hospedeira', 'Rocha onde o mineral se formou, como o gnaisse que contém um cristal.'),
  o('clast', 'Clasto', 'Fragmento incluído dentro de outra rocha.'),
]

export const ROCK_CEMENTS: RockOption[] = [
  o('siliceous', 'Silicoso', 'Cimento de sílica: rocha muito dura que não reage ao ácido.'),
  o('carbonate', 'Carbonático', 'Cimento de calcita: reage ao ácido clorídrico.'),
  o('ferruginous', 'Ferruginoso', 'Cimento de óxido de ferro: tom avermelhado ou amarronzado.'),
  o('argillaceous', 'Argiloso', 'Cimento de argila: rocha mais macia, que se desfaz com facilidade.'),
  o('not_visible', 'Não visível', 'Cimento que não se distingue; os grãos parecem apenas compactados.'),
]

export const ROCK_ROUNDNESS: RockOption[] = [
  o('angular', 'Anguloso', 'Grãos com arestas vivas, indicando transporte curto.'),
  o('subangular', 'Subanguloso', 'Grãos com arestas levemente desgastadas.'),
  o('rounded', 'Arredondado', 'Grãos com forma suavizada, indicando transporte longo.'),
]

/** Nomes comuns, para autocompletar "Nome da rocha". */
export const COMMON_ROCK_NAMES = [
  'Granito', 'Basalto', 'Riolito', 'Andesito', 'Diorito', 'Gabro', 'Peridotito', 'Obsidiana', 'Pedra-pomes', 'Tufo',
  'Arenito', 'Folhelho', 'Siltito', 'Argilito', 'Conglomerado', 'Brecha', 'Calcário', 'Dolomito', 'Chert', 'Gesso',
  'Carvão', 'Travertino', 'Diamictito', 'Itabirito', 'Laterita', 'Mármore', 'Quartzito', 'Gnaisse', 'Xisto', 'Ardósia',
  'Filito', 'Anfibolito', 'Migmatito', 'Serpentinito',
]

export const IMPACTITE_CATEGORY = 'Impactito'
export const isImpactite = (category: string | null | undefined): boolean => category === IMPACTITE_CATEGORY

/** Campos de classificação de meteorito que não se aplicam a impactito (origem terrestre) — chaves de `Draft`/`store_products`. */
export const IMPACTITE_HIDDEN_DRAFT_FIELDS: readonly string[] = [
  'met_group',
  'met_type',
  'met_type_group',
  'met_shock',
  'met_parent_body',
  'met_crust_fusion',
  'met_chondrules_visible',
  'met_metal_matrix_visible',
  'met_olivine_visible',
  'met_acid_etched',
]

// Corpo de origem (0032). Chaves em inglês, iguais às do catálogo.
export const MET_PARENT_BODIES: { value: string; label: string }[] = [
  { value: 'mars', label: 'Marte' },
  { value: 'moon', label: 'Lua' },
  { value: 'vesta', label: 'Vesta (4 Vesta)' },
  { value: 'asteroid_belt', label: 'Cinturão de asteroides' },
  { value: 'unknown', label: 'Desconhecido' },
]
export const META_PARENT_BODY_HINT =
  'Corpo de onde o meteorito se originou. Vem da classificação oficial, não da aparência. Marte e Lua: meteoritos marcianos e lunares. Vesta: grupo HED (howarditos, eucritos e diogenitos). Cinturão de asteroides: origem da maioria dos meteoritos, quando o asteroide específico não é identificado.'

/**
 * A seção "Rochas da amostra" vale para mineral, fóssil e "outro". Em meteorito só na
 * categoria Impactito; em joia nunca.
 */
export function rocksSectionApplies(kind: StoreItemKind, metCategory?: string | null): boolean {
  if (kind === 'meteorite') return isImpactite(metCategory)
  return kind === 'mineral' || kind === 'fossil' || kind === 'other'
}

export const splitList = (s: string | null | undefined): string[] => (s ? s.split(/[;,]/).map((x) => x.trim()).filter(Boolean) : [])

/** Linha do formulário: tudo texto; '' = vazio. `key`/`id` ficam fora do que vai pro banco. */
export interface RockRowDraft {
  key: string
  id?: string
  name: string
  rock_type: string
  subtype: string
  grain_size: string
  texture: string
  structure: string
  color_index: string
  hcl_reaction: string
  role: string
  protolith: string
  cement: string
  grain_roundness: string
  crater: string
  notes: string
}

const ROCK_TEXT_KEYS = [
  'name', 'rock_type', 'subtype', 'grain_size', 'texture', 'structure', 'color_index', 'hcl_reaction',
  'role', 'protolith', 'cement', 'grain_roundness', 'crater', 'notes',
] as const

export function emptyRockRow(): RockRowDraft {
  const row = { key: crypto.randomUUID() } as RockRowDraft
  for (const k of ROCK_TEXT_KEYS) row[k] = ''
  return row
}

export function rockRowToDraft(r: StoreProductRock): RockRowDraft {
  const d = { key: r.id, id: r.id } as RockRowDraft
  for (const k of ROCK_TEXT_KEYS) d[k] = r[k] ?? ''
  return d
}

export const isBlankRockRow = (r: RockRowDraft): boolean => ROCK_TEXT_KEYS.every((k) => r[k].trim() === '')

/** Condicionais: quando cada campo se aplica, dado o tipo (e subtipo) da rocha. */
export const ROCK_VISIBLE = {
  color_index: (r: Pick<RockRowDraft, 'rock_type' | 'subtype'>) => r.rock_type === 'igneous',
  hcl_reaction: (r: Pick<RockRowDraft, 'rock_type' | 'subtype'>) => r.rock_type === 'sedimentary' || r.rock_type === 'metamorphic',
  protolith: (r: Pick<RockRowDraft, 'rock_type' | 'subtype'>) => r.rock_type === 'metamorphic',
  cement: (r: Pick<RockRowDraft, 'rock_type' | 'subtype'>) => r.rock_type === 'sedimentary' && r.subtype === 'clastic',
  grain_roundness: (r: Pick<RockRowDraft, 'rock_type' | 'subtype'>) => r.rock_type === 'sedimentary' && r.subtype === 'clastic',
  crater: (r: Pick<RockRowDraft, 'rock_type' | 'subtype'>) => r.rock_type === 'impact',
} as const

/** Linha do formulário → gravação. Campos que não se aplicam ao tipo/subtipo atual vão nulos (sem valor "fantasma"). */
export function rockRowToInput(r: RockRowDraft): StoreProductRockInput {
  const txt = (v: string) => (v.trim() === '' ? null : v.trim())
  const subtypeOk = subtypeOptions(r.rock_type).some((x) => x.value === r.subtype)
  const grainOk = grainSizeOptions(r.rock_type).some((x) => x.value === r.grain_size)
  return {
    name: txt(r.name),
    rock_type: txt(r.rock_type),
    subtype: subtypeOk ? txt(r.subtype) : null,
    grain_size: grainOk ? txt(r.grain_size) : null,
    texture: txt(splitList(r.texture).join(', ')),
    structure: txt(r.structure),
    color_index: ROCK_VISIBLE.color_index(r) ? txt(r.color_index) : null,
    hcl_reaction: ROCK_VISIBLE.hcl_reaction(r) ? txt(r.hcl_reaction) : null,
    role: txt(r.role),
    protolith: ROCK_VISIBLE.protolith(r) ? txt(r.protolith) : null,
    cement: ROCK_VISIBLE.cement(r) ? txt(r.cement) : null,
    grain_roundness: ROCK_VISIBLE.grain_roundness(r) ? txt(r.grain_roundness) : null,
    crater: ROCK_VISIBLE.crater(r) ? txt(r.crater) : null,
    notes: txt(r.notes),
  }
}
