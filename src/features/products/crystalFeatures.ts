// Copiado do catálogo pessoal (src/features/specimens/crystalFeatures.ts) — mesmo vocabulário
// e mesmos valores gravados (PT), para a importação da coleção copiar sem conversão.
// Sem i18n: o rótulo exibido é o próprio valor; títulos de grupo em CRYSTAL_GROUP_LABELS.
// Características cristalográficas (0184) — vocabulário, hierarquia pai/filho e
// ajudantes de exibição. Módulo PURO (sem imports): é usado pelo formulário,
// pela lista, pelas estatísticas, pela Ficha técnica em PDF e pelo Modo de
// Exibição, e não pode puxar o `formFields.ts` inteiro junto.

/** "A, B; C" → ["A", "B", "C"] (mesmo split de `splitProps` em formFields.ts). */
const splitList = (s: string | null | undefined): string[] =>
  s ? s.split(/[;,]/).map((x) => x.trim()).filter(Boolean) : []

/**
 * Características cristalográficas (0184) — multi-seleção por EXEMPLAR, em
 * grupos. Vocabulário FECHADO (sem "criar novo"): busca, tradução e estatística
 * dependem de valores previsíveis. O `value` é o que se GRAVA (PT, sem vírgula
 * nem ponto-e-vírgula — `splitProps` separa por eles); `key` é a chave de
 * tradução em `crystalFeatures.options.*` (specimens.json). O grupo não é
 * gravado: é derivado daqui por `crystalFeatureGroupOf`.
 *
 * "Macla" (genérica) e "Zoneamento de Cor" vieram de Propriedades especiais na
 * 0184 — por isso mantêm exatamente o valor antigo.
 */
export interface CrystalFeatureItem {
  value: string
  key: string
  /**
   * Valor do item "pai" (ex.: "Macla de Contato" → "Macla"). Escolher o filho
   * grava o pai junto (`withImpliedCrystalParents`), mas a tela mostra só o
   * filho (`hideImpliedCrystalParents`); as estatísticas contam os dois.
   */
  parent?: string
}
export interface CrystalFeatureGroup {
  /** Chave de tradução em `crystalFeatures.groups.*`. */
  key: string
  items: CrystalFeatureItem[]
}

export const CRYSTAL_FEATURE_GROUPS: CrystalFeatureGroup[] = [
  {
    key: 'habit',
    items: [
      { value: 'Prismático', key: 'prismatico' },
      { value: 'Colunar', key: 'colunar' },
      { value: 'Tabular', key: 'tabular' },
      { value: 'Acicular', key: 'acicular' },
      { value: 'Capilar', key: 'capilar' },
      { value: 'Lamelar', key: 'lamelar' },
      { value: 'Em Lâminas / Bladed', key: 'emLaminas' },
      { value: 'Equidimensional', key: 'equidimensional' },
      { value: 'Maciço', key: 'macico' },
    ],
  },
  {
    key: 'aggregation',
    items: [
      { value: 'Drusa', key: 'drusa' },
      { value: 'Geodo', key: 'geodo' },
      { value: 'Nódulo / Concreção', key: 'nodulo' },
      // Família Coloforme (Dana: colloform). Distinguir as formas é difícil; o pai
      // permite registrar só "Agregado Coloforme" quando a forma não é identificada.
      { value: 'Agregado Coloforme', key: 'coloforme' },
      { value: 'Globular', key: 'globular', parent: 'Agregado Coloforme' },
      { value: 'Mamilar', key: 'mamilar', parent: 'Agregado Coloforme' },
      { value: 'Botrioidal', key: 'botrioidal', parent: 'Agregado Coloforme' },
      { value: 'Reniforme', key: 'reniforme', parent: 'Agregado Coloforme' },
      { value: 'Crescimento Radial', key: 'radial' },
      // Filho de Radial: fica logo abaixo do pai (o seletor recua os filhos).
      { value: 'Roseta', key: 'roseta', parent: 'Crescimento Radial' },
      { value: 'Dendrítico', key: 'dendritico' },
      { value: 'Fibroso', key: 'fibroso' },
      { value: 'Estalactítico', key: 'estalactitico' },
      { value: 'Crista de Galo', key: 'cristaGalo' },
      { value: 'Agregado em Feixe', key: 'feixe' },
    ],
  },
  {
    key: 'termination',
    items: [
      { value: 'Biterminado', key: 'biterminado' },
      { value: 'Multiterminado', key: 'multiterminado' },
      { value: 'Terminação Quebrada', key: 'quebrado' },
      // Família Autocurado: o pai cobre qualquer quebra curada por crescimento
      // posterior; os filhos dizem ONDE (ponta/base, corpo) ou COMO (deslocado).
      { value: 'Cristal Autocurado', key: 'autocurado' },
      { value: 'Terminação Autocurada', key: 'terminacaoAutocurada', parent: 'Cristal Autocurado' },
      { value: 'Fratura Curada no Corpo', key: 'fraturaCurada', parent: 'Cristal Autocurado' },
      { value: 'Fragmento Deslocado e Curado', key: 'fragmentoDeslocado', parent: 'Cristal Autocurado' },
    ],
  },
  {
    key: 'growth',
    items: [
      { value: 'Cristal Fantasma', key: 'fantasma' },
      { value: 'Cristal em Cetro', key: 'cetro' },
      { value: 'Cristal Esquelético / Hopper', key: 'esqueleto' },
      { value: 'Cristal Oco / Tubular', key: 'oco' },
      { value: 'Faces em Janela / Fenster', key: 'janela' },
      { value: 'Gwindel', key: 'gwindel' },
      { value: 'Cristal Curvo', key: 'curvo' },
      { value: 'Faden', key: 'faden' },
      { value: 'Enhydro', key: 'enhydro' },
      { value: 'Pseudomorfo', key: 'pseudomorfo' },
      { value: 'Epimorfo', key: 'epimorfo', parent: 'Pseudomorfo' },
      { value: 'Sobrecrescimento', key: 'sobrecrescimento' },
      { value: 'Crescimento Epitaxial', key: 'epitaxial', parent: 'Sobrecrescimento' },
      { value: 'Crescimento Paralelo', key: 'paralelo' },
      { value: 'Crescimento em Fissura', key: 'fissura' },
      { value: 'Zoneamento de Cor', key: 'zoneamentoCor' },
      { value: 'Bandamento de Nível', key: 'bandamentoNivel' },
    ],
  },
  {
    key: 'twinning',
    items: [
      { value: 'Macla', key: 'macla' },
      { value: 'Macla de Contato', key: 'maclaContato', parent: 'Macla' },
      { value: 'Macla de Penetração', key: 'maclaPenetracao', parent: 'Macla' },
      { value: 'Macla Polissintética', key: 'maclaPolissintetica', parent: 'Macla' },
      { value: 'Macla Cíclica', key: 'maclaCiclica', parent: 'Macla' },
    ],
  },
  {
    key: 'surface',
    items: [
      { value: 'Faces Estriadas', key: 'estriada' },
      { value: 'Figuras de Corrosão', key: 'figurasCorrosao' },
      { value: 'Floater', key: 'floater' },
      { value: 'Cristal na Matriz', key: 'naMatriz' },
      { value: 'Cristal Rolado', key: 'rolado' },
      { value: 'Clivado', key: 'clivado' },
    ],
  },
]

/** Valor gravado → chave de tradução do item. */
export const CRYSTAL_FEATURE_LABEL_KEYS: Record<string, string> = Object.fromEntries(
  CRYSTAL_FEATURE_GROUPS.flatMap((g) => g.items.map((i) => [i.value, i.key])),
)

/** Valor gravado → chave do grupo (só valores do vocabulário). */
const CRYSTAL_FEATURE_GROUP_BY_VALUE: Record<string, string> = Object.fromEntries(
  CRYSTAL_FEATURE_GROUPS.flatMap((g) => g.items.map((i) => [i.value, g.key])),
)
export const crystalFeatureGroupOf = (value: string): string | undefined => CRYSTAL_FEATURE_GROUP_BY_VALUE[value]

/** Valor gravado do filho → valor do pai (só itens com `parent`). */
const CRYSTAL_FEATURE_PARENT: Record<string, string> = Object.fromEntries(
  CRYSTAL_FEATURE_GROUPS.flatMap((g) => g.items.filter((i) => i.parent).map((i) => [i.value, i.parent as string])),
)

/** Acrescenta o pai de cada filho presente (ex.: "Macla de Contato" → também "Macla"), sem repetir. */
export const withImpliedCrystalParents = (values: string[]): string[] => {
  const out = [...values]
  for (const v of values) {
    const p = CRYSTAL_FEATURE_PARENT[v]
    if (p && !out.includes(p)) out.push(p)
  }
  return out
}

/** Tira o pai quando algum filho dele está presente — é o que a tela mostra (o pai fica implícito). */
export const hideImpliedCrystalParents = (values: string[]): string[] =>
  values.filter((v) => !values.some((o) => CRYSTAL_FEATURE_PARENT[o] === v))

/** Grupos já traduzidos, no formato do `HierarchicalMultiSelect` (rótulo, dica e pai de cada item). */
export interface CrystalFeatureGroupView {
  key: string
  label: string
  items: { value: string; label: string; parent?: string; hint?: string }[]
}

/** `t` recebe chaves do namespace `specimens` (ex.: `crystalFeatures.options.drusa`). */
export const buildCrystalFeatureGroups = (t: (key: string) => string): CrystalFeatureGroupView[] =>
  CRYSTAL_FEATURE_GROUPS.map((g) => ({
    key: g.key,
    label: t(`crystalFeatures.groups.${g.key}`),
    items: g.items.map((i) => ({
      value: i.value,
      label: t(`crystalFeatures.options.${i.key}`),
      parent: i.parent,
      hint: t(`crystalFeatures.hints.${i.key}`),
    })),
  }))

/** Texto gravado → lista do que a tela mostra (sem o pai implícito), no valor canônico em PT. */
export const visibleCrystalFeatures = (s: string | null | undefined): string[] => hideImpliedCrystalParents(splitList(s))

/** Texto gravado → lista COMPLETA, com o pai de cada filho (é o que as estatísticas contam). */
export const allCrystalFeatures = (s: string | null | undefined): string[] => withImpliedCrystalParents(splitList(s))

/** "Biterminado, Drusa" (texto gravado, sempre PT) → mesmo texto traduzido para exibição, sem pai repetido. */
export const translateCrystalFeatures = (t: (key: string) => string, s: string | null | undefined): string => {
  const label = (v: string) => (CRYSTAL_FEATURE_LABEL_KEYS[v] ? t(`crystalFeatures.options.${CRYSTAL_FEATURE_LABEL_KEYS[v]}`) : v)
  const norm = (x: string) => x.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const values = withImpliedCrystalParents(splitList(s))
  const out: string[] = []
  for (const v of values) {
    // Pai com filho presente não aparece sozinho: vira o caminho do filho.
    if (values.some((o) => CRYSTAL_FEATURE_PARENT[o] === v)) continue
    const parent = CRYSTAL_FEATURE_PARENT[v]
    if (!parent) {
      out.push(label(v))
      continue
    }
    // "Macla > Macla de Contato" repete o nome: nesse caso mostra só o filho.
    const parentLabel = label(parent)
    const childLabel = label(v)
    out.push(norm(childLabel).includes(norm(parentLabel)) ? childLabel : `${parentLabel} > ${childLabel}`)
  }
  return out.join(', ')
}

export const CRYSTAL_GROUP_LABELS: Record<string, string> = {
  habit: "Hábito do cristal",
  aggregation: "Agregação",
  termination: "Terminação e quebras",
  growth: "Crescimento",
  twinning: "Maclas",
  surface: "Superfície e apresentação",
}

/** Dica curta por valor (ⓘ), quando existe no catálogo pessoal. */
export const CRYSTAL_FEATURE_HINTS: Record<string, string> = {
  "Prismático": "Cristal alongado, com faces paralelas ao eixo de maior comprimento.",
  "Colunar": "Prismas longos e finos, em geral reunidos e paralelos entre si.",
  "Tabular": "Cristal achatado, em forma de placa, com duas faces largas e paralelas.",
  "Acicular": "Cristais muito finos e alongados, em forma de agulha.",
  "Capilar": "Cristais extremamente finos, semelhantes a fios de cabelo. São mais delgados que os aciculares.",
  "Lamelar": "Cristal formado por lâminas finas, empilhadas como folhas. Inclui a hematita especular, de placas pequenas e brilhantes.",
  "Em Lâminas / Bladed": "Cristal alongado e achatado em uma direção, como a lâmina de uma faca. Difere do lamelar, que forma folhas largas empilhadas.",
  "Equidimensional": "Cristal com dimensões semelhantes nas três direções, sem alongamento nem achatamento.",
  "Maciço": "Massa de mineral sem forma cristalina externa visível.",
  "Drusa": "Camada de cristais pequenos e de tamanho semelhante, lado a lado, que recobre a superfície de uma rocha. Cristais de tamanhos muito variados não formam drusa.",
  "Geodo": "Cavidade na rocha com as paredes forradas de cristais.",
  "Nódulo / Concreção": "Massa mineral arredondada ou irregular, formada por precipitação ao redor de um centro, no sedimento ou na rocha. Difere do geodo, que é oco e forrado de cristais.",
  "Agregado Coloforme": "Massas arredondadas ou quase esféricas. Reúne as formas globular, mamilar, botrioidal e reniforme. Também chamado de coloidal.",
  "Globular": "Massas esféricas, isoladas ou agrupadas, às vezes em forma de meia esfera sobre a matriz.",
  "Mamilar": "Massas arredondadas maiores, em forma de seio, que se fundem entre si.",
  "Botrioidal": "Esferas pequenas reunidas, semelhantes a um cacho de uvas.",
  "Reniforme": "Lóbulos arredondados em forma de rim, de superfície lisa.",
  "Crescimento Radial": "Cristais que partem de um centro comum e se abrem em forma de leque ou esfera.",
  "Roseta": "Cristais tabulares dispostos em torno de um centro, como as pétalas de uma flor. É um tipo de agregado radial.",
  "Dendrítico": "Crescimento ramificado, semelhante a uma samambaia ou a uma árvore.",
  "Fibroso": "Fibras finas, paralelas ou radiadas, muito compactadas.",
  "Estalactítico": "Formas alongadas e cônicas, semelhantes a estalactites ou estalagmites, em geral com estrutura interna em camadas concêntricas.",
  "Crista de Galo": "Cristais tabulares ou lamelares muito próximos, dispostos em fileiras como a crista de um galo.",
  "Agregado em Feixe": "Cristais reunidos em feixe, como um maço de trigo amarrado no centro.",
  "Biterminado": "Cristal com terminação natural nas duas extremidades.",
  "Multiterminado": "Várias terminações na mesma extremidade do cristal.",
  "Terminação Quebrada": "Extremidade do cristal fraturada, sem terminação natural preservada. A quebra pode ser natural ou causada pela extração.",
  "Cristal Autocurado": "Cristal que quebrou durante a formação e voltou a crescer sobre a quebra, em qualquer parte do cristal. Selecione esta opção quando o tipo de cura não for identificado.",
  "Terminação Autocurada": "A ponta ou a base do cristal quebrou e regenerou uma nova terminação ou novas faces.",
  "Fratura Curada no Corpo": "A quebra no meio do cristal foi selada por crescimento posterior e deixa uma cicatriz visível.",
  "Fragmento Deslocado e Curado": "Um pedaço do cristal quebrou, mudou de posição e foi selado por novo crescimento, que deixa um degrau ou desalinhamento.",
  "Cristal Fantasma": "Contorno de uma fase anterior de crescimento, visível como um cristal dentro do cristal.",
  "Cristal em Cetro": "Cristal que se alarga no topo, sobre uma haste mais estreita, como um cetro. Resulta de um novo crescimento sobre a ponta de um cristal anterior.",
  "Cristal Esquelético / Hopper": "Cristal com bordas bem desenvolvidas e faces ocas ou rebaixadas em degraus, chamado de hopper. Resulta de crescimento rápido.",
  "Cristal Oco / Tubular": "Cristal com canal ou cavidade interna ao longo do eixo, formada por crescimento ou por dissolução. Difere do esquelético, cujas faces são rebaixadas.",
  "Faces em Janela / Fenster": "Face do cristal com uma depressão que forma uma moldura, como uma janela. Em alemão, Fenster.",
  "Gwindel": "Quartzo alpino torcido em torno do eixo longitudinal, formado por subindivíduos levemente girados entre si. Ocorre nos Alpes.",
  "Cristal Curvo": "Cristal com o eixo curvo ou dobrado, por crescimento irregular ou por deformação posterior.",
  "Faden": "Quartzo, em geral achatado, com uma linha branca fina de inclusões de gás e fluido ao longo do cristal. A linha marca o crescimento sobre uma fissura.",
  "Enhydro": "Cavidade fechada no cristal ou na ágata, com líquido, em geral água, e uma bolha de gás que se move ao inclinar a peça.",
  "Pseudomorfo": "Cristal que mantém a forma de um mineral, mas foi substituído quimicamente por outro.",
  "Epimorfo": "Tipo de pseudomorfo em que um mineral recobre o cristal original, que depois se dissolve e deixa uma casca oca. Também chamado de pseudomorfo de incrustação.",
  "Sobrecrescimento": "Mineral que cristalizou sobre a superfície de outro, formando uma borda ou camada.",
  "Crescimento Epitaxial": "Sobrecrescimento orientado de um mineral sobre a superfície de outro, que segue a estrutura cristalina do mineral de base.",
  "Crescimento Paralelo": "Vários cristais da mesma espécie crescem lado a lado, com os eixos paralelos, e formam um só conjunto.",
  "Crescimento em Fissura": "Cristais, agregados ou massas minerais que cresceram dentro de uma fratura e a preencheram, formando um veio.",
  "Zoneamento de Cor": "Variação de cor em zonas ou camadas dentro do mesmo cristal, causada por mudanças na composição durante o crescimento.",
  "Bandamento de Nível": "Camadas horizontais e retas no fundo da cavidade, depositadas pela gravidade, em geral de calcedônia.",
  "Macla": "Intercrescimento regular de dois ou mais cristais da mesma espécie, com orientações relacionadas por simetria. Selecione esta opção quando o tipo de macla não for identificado.",
  "Macla de Contato": "Dois cristais unidos por um plano bem definido, como duas metades espelhadas.",
  "Macla de Penetração": "Cristais que se atravessam, com partes de um dentro do outro.",
  "Macla Polissintética": "Várias lâminas de macla repetidas em paralelo, visíveis como estrias finas na superfície.",
  "Macla Cíclica": "Maclas repetidas em torno de um eixo, formando uma figura de simetria radial, como uma roda ou uma estrela.",
  "Faces Estriadas": "Linhas finas e paralelas nas faces do cristal, formadas durante o crescimento.",
  "Figuras de Corrosão": "Marcas de dissolução na superfície, como pequenos triângulos ou quadrados. A corrosão pode ser natural, causada por fluidos ou intemperismo, ou artificial, causada por ácido.",
  "Floater": "Cristal formado solto, sem matriz, com faces naturais em todos ou quase todos os lados.",
  "Cristal na Matriz": "Cristal ainda preso à rocha em que se formou.",
  "Cristal Rolado": "Cristal desgastado pelo transporte na água, com arestas e faces arredondadas. É comum em material de aluvião.",
  "Clivado": "Exemplar com superfícies planas e regulares, resultantes da quebra ao longo de planos de clivagem. Difere de uma fratura irregular.",
}
