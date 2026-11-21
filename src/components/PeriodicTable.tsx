import { useCallback, useEffect, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { BELOW_MD_QUERY, useMediaQuery } from '../lib/useMediaQuery'
import { CloseIcon, ExpandIcon } from './icons'
import { FullscreenOverlay } from './FullscreenOverlay'
import { CHEMICAL_ELEMENTS, categoryLabel, elementName, ELEMENT_CATEGORY_COLORS, type ElementLanguage as AppLanguage } from '../data/chemicalElements'
import { contrastTextColor } from '../features/categories/colors'

// Tabela periódica clicável. Arquivo COMPARTILHADO entre o catálogo e a loja
// (scripts/shared-ui.mjs): sem idioma próprio — os textos entram por `labels`
// e o idioma dos nomes por `lang`.

/** Textos da tabela (cada app passa os seus, no idioma dele). */
export interface PeriodicTableLabels {
  title: string
  expand: string
  fitToScreen: string
  fullscreen: string
  closeFullscreen: string
  atomicNumber: string
  noItems: string
  viewItems: string
  close: string
  tapHint: string
}

/** Maior nome de elemento no idioma, em caracteres — usado pra calibrar a
 *  fonte do nome por idioma (inglês tem nomes mais longos que português em
 *  vários elementos, ex. "Rutherfordium" vs "Rutherfórdio"). */
function longestElementNameLength(lang: AppLanguage): number {
  return Math.max(...CHEMICAL_ELEMENTS.map((el) => elementName(el.symbol, lang).length))
}

// Constante que converte "N% da largura da célula" em "multiplicador de cqw"
// pro nome do elemento nunca precisar quebrar linha nem truncar — `cqw` é
// relativo à largura da GRADE inteira (18 colunas, ver `containerType`
// abaixo), então 1 coluna = CW/18; com `paddingInline: 8%` de cada lado
// sobra 84% disso pro texto. 0.52 é uma estimativa conservadora da largura
// média de caractere (fração do font-size) pra fonte regular do app em
// texto título latino — alta o suficiente pra não estourar mesmo em nomes
// com muitos caracteres largos (m, w, acentos), baixa o suficiente pra não
// deixar o nome minúsculo à toa.
const NAME_FIT_CONSTANT = (100 * 0.84) / (18 * 0.52)

/** Multiplicador de `cqw` (ver `NAME_FIT_CONSTANT`) tal que o MAIOR nome de
 *  elemento daquele idioma sempre caiba numa linha só, em QUALQUER largura de
 *  coluna. */
function nameCqwMultiplier(lang: AppLanguage): number {
  return NAME_FIT_CONSTANT / longestElementNameLength(lang)
}

export interface PeriodicTableGridProps {
  /** Contagem de itens por símbolo de elemento — célula fica ativa/clicável
   *  quando > 0, esmaecida quando ausente/zero. */
  countBySymbol: Map<string, number>
  lang: AppLanguage
  minColRem: number
  itemLabelSingular: string
  itemLabelPlural: string
  /** Célula ativa vira `<Link to={linkTo(symbol)}>` — usar quando o clique
   *  navega pra outra rota (ex. categoria virtual "Química"). */
  linkTo?: (symbol: string) => string
  /** Célula ativa vira `<button onClick={() => onSelect(symbol)}>` — usar
   *  quando o clique só muda estado local (ex. filtro na mesma tela). */
  onSelect?: (symbol: string) => void
  selectedSymbol?: string | null
  /** Título do cabeçalho da tela cheia (default "Tabela periódica"). */
  fullscreenTitle?: string
  /** true = a grade NÃO mostra os controles do mobile; quem usa renderiza
   *  `PeriodicTableControls` em outro lugar da tela. */
  externalControls?: boolean
  labels: PeriodicTableLabels
}

const EXPANDED_STORAGE_KEY = 'periodicTable.mobileExpanded'

function readExpanded(): boolean {
  try {
    return localStorage.getItem(EXPANDED_STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeExpanded(value: boolean) {
  try {
    localStorage.setItem(EXPANDED_STORAGE_KEY, value ? '1' : '0')
  } catch {
    /* sem storage (aba privada etc.) — só não lembra a escolha */
  }
}

// Estado do modo mobile (Ajustar/Ampliar + tela cheia) num store de módulo:
// os controles podem morar FORA da grade (`PeriodicTableControls`, ex. na
// linha do "Excluir cromóforos" da Química) e a grade lê o mesmo estado.
type ModeState = { expanded: boolean; fullscreen: boolean }
let modeState: ModeState = { expanded: readExpanded(), fullscreen: false }
const modeListeners = new Set<() => void>()

function setModeState(patch: Partial<ModeState>) {
  modeState = { ...modeState, ...patch }
  if (patch.expanded !== undefined) writeExpanded(patch.expanded)
  modeListeners.forEach((l) => l())
}

function usePeriodicMode(): ModeState {
  return useSyncExternalStore(
    (l) => {
      modeListeners.add(l)
      return () => modeListeners.delete(l)
    },
    () => modeState,
  )
}

/**
 * Controles do modo mobile — alternar "Ajustar à tela / Ampliar" e abrir a
 * tela cheia. Só aparece abaixo de `md`. A grade já os mostra sozinha; quem
 * quiser posicioná-los em outro lugar passa `externalControls` na grade e
 * renderiza este componente onde quiser.
 */
export function PeriodicTableControls({ labels }: { labels: Pick<PeriodicTableLabels, 'expand' | 'fitToScreen' | 'fullscreen'> }) {
  const isMobile = useMediaQuery(BELOW_MD_QUERY)
  const { expanded } = usePeriodicMode()
  if (!isMobile) return null
  // Tela cheia é o 3º segmento da mesma pílula (não um botão à parte):
  // compacto o bastante pra dividir a linha com "Excluir cromóforos" num
  // celular de 375px.
  return (
    <div className="flex shrink-0 items-center rounded-lg bg-stone-800 p-0.5 text-xs font-semibold">
      {([false, true] as const).map((value) => (
        <button
          key={String(value)}
          type="button"
          aria-pressed={expanded === value}
          onClick={() => setModeState({ expanded: value })}
          className={`rounded-md px-2 py-1.5 whitespace-nowrap transition ${expanded === value ? 'bg-stone-600 text-stone-50' : 'text-stone-400'}`}
        >
          {value ? labels.expand : labels.fitToScreen}
        </button>
      ))}
      <span className="mx-0.5 h-4 w-px bg-stone-700" aria-hidden="true" />
      <button
        type="button"
        onClick={() => setModeState({ fullscreen: true })}
        title={labels.fullscreen}
        aria-label={labels.fullscreen}
        className="flex items-center rounded-md px-2 py-1.5 text-sm text-stone-400 transition hover:text-stone-100"
      >
        <ExpandIcon />
      </button>
    </div>
  )
}

/**
 * Grade de tabela periódica clicável, compartilhada entre a categoria
 * virtual "Química" (`ChemistryCategoryPage`, agrupando os espécimes do
 * usuário) e o catálogo de minerais (`MineralsAdminPage`, agrupando as
 * linhas do catálogo global `minerals_reference`) — mesmo componente
 * visual, cada lugar decide como agrupar (`countBySymbol`) e o que fazer ao
 * clicar numa célula ativa (`linkTo` ou `onSelect`). Visual inspirado na
 * tabela periódica em 3D do Google Arts & Culture (referência dada pelo
 * dono): toda célula sempre mostra símbolo + nome, coloridos pela família
 * química (`ELEMENT_CATEGORY_COLORS`); elemento sem nenhum item fica
 * esmaecido, só para contexto.
 */
export function PeriodicTableGrid({
  countBySymbol,
  lang,
  minColRem,
  itemLabelSingular,
  itemLabelPlural,
  linkTo,
  onSelect,
  selectedSymbol,
  fullscreenTitle,
  externalControls,
  labels,
}: PeriodicTableGridProps) {
  const isMobile = useMediaQuery(BELOW_MD_QUERY)
  const { expanded, fullscreen } = usePeriodicMode()
  const closeFullscreen = useCallback(() => setModeState({ fullscreen: false }), [])
  const compact = isMobile && !expanded
  // Sair da tela (navegou pra um elemento etc.) fecha a tela cheia — senão
  // o store ficaria "aberto" e a próxima tabela já abriria em tela cheia.
  useEffect(() => () => setModeState({ fullscreen: false }), [])

  // Controles (só mobile) — mesmo FullscreenOverlay do mapa-múndi mobile.
  // `sticky left-0` fica parado com a grade ampliada rolando pro lado.
  const toolbar =
    isMobile && !externalControls ? (
      <div className="sticky left-0 mb-2 w-fit">
        <PeriodicTableControls labels={labels} />
      </div>
    ) : null

  // Tela cheia = sempre a grade completa, com coluna mínima maior (5rem):
  // sem o resto do app disputando espaço, cabe célula maior — sobretudo
  // com o aparelho deitado. Escolher um elemento fecha a tela cheia.
  const overlay =
    isMobile && fullscreen ? (
      <FullscreenOverlay title={fullscreenTitle ?? labels.title} closeLabel={labels.closeFullscreen} onClose={closeFullscreen} bodyClassName="min-h-0 flex-1 overflow-auto p-2">
        <FullPeriodicGrid
          countBySymbol={countBySymbol}
          lang={lang}
          minColRem={5}
          itemLabelSingular={itemLabelSingular}
          itemLabelPlural={itemLabelPlural}
          linkTo={linkTo}
          onSelect={
            onSelect
              ? (symbol) => {
                  closeFullscreen()
                  onSelect(symbol)
                }
              : undefined
          }
          onNavigate={closeFullscreen}
          selectedSymbol={selectedSymbol}
          labels={labels}
        />
      </FullscreenOverlay>
    ) : null

  if (compact) {
    return (
      <>
        {toolbar}
        {overlay}
        <CompactPeriodicGrid
          countBySymbol={countBySymbol}
          lang={lang}
          itemLabelSingular={itemLabelSingular}
          itemLabelPlural={itemLabelPlural}
          linkTo={linkTo}
          onSelect={onSelect}
          selectedSymbol={selectedSymbol}
          labels={labels}
        />
      </>
    )
  }

  return (
    <>
      {toolbar}
      {overlay}
      <FullPeriodicGrid
        countBySymbol={countBySymbol}
        lang={lang}
        minColRem={minColRem}
        itemLabelSingular={itemLabelSingular}
        itemLabelPlural={itemLabelPlural}
        linkTo={linkTo}
        onSelect={onSelect}
        selectedSymbol={selectedSymbol}
        labels={labels}
      />
    </>
  )
}

/**
 * Modo "Ajustar à tela" (mobile): as 18 colunas cabem na largura (célula de
 * ~18px num celular), só o símbolo. Célula pequena demais pra acertar de
 * primeira e sem hover pra dica — então o toque em QUALQUER célula (ativa ou
 * não) só abre o painel de detalhes embaixo; a ação (`linkTo`/`onSelect`)
 * fica no botão "Ver itens" do painel.
 */
function CompactPeriodicGrid({
  countBySymbol,
  lang,
  itemLabelSingular,
  itemLabelPlural,
  linkTo,
  onSelect,
  selectedSymbol,
  labels,
}: Omit<PeriodicTableGridProps, 'minColRem' | 'fullscreenTitle' | 'externalControls'>) {
  const [detail, setDetail] = useState<string | null>(selectedSymbol ?? null)
  const detailEl = detail ? CHEMICAL_ELEMENTS.find((el) => el.symbol === detail) : undefined
  const detailCount = detail ? countBySymbol.get(detail) ?? 0 : 0
  const actionClass = 'shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white transition active:bg-amber-700'

  return (
    <div>
      <div className="grid gap-[2px]" style={{ gridTemplateColumns: 'repeat(18, minmax(0, 1fr))', containerType: 'inline-size' }}>
        {CHEMICAL_ELEMENTS.map((el) => {
          const count = countBySymbol.get(el.symbol) ?? 0
          const active = count > 0
          const bg = ELEMENT_CATEGORY_COLORS[el.category]
          const isDetail = detail === el.symbol
          return (
            <button
              key={el.symbol}
              type="button"
              onClick={() => setDetail(isDetail ? null : el.symbol)}
              aria-label={elementName(el.symbol, lang)}
              aria-pressed={isDetail}
              style={{
                gridColumn: el.col,
                gridRow: el.row,
                marginTop: el.row === 8 ? '0.4rem' : undefined,
                backgroundColor: bg,
                color: contrastTextColor(bg),
                fontSize: 'clamp(0.5rem, 3.1cqw, 0.95rem)',
                lineHeight: 1,
              }}
              className={`flex aspect-square items-center justify-center rounded-[3px] font-bold ${
                isDetail ? 'z-10 ring-2 ring-amber-400' : active ? 'ring-1 ring-white/80' : 'opacity-30'
              }`}
            >
              {el.symbol}
            </button>
          )
        })}
      </div>

      {detailEl ? (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-stone-700 bg-stone-950/80 p-3">
          <div
            className="relative flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-lg"
            style={{ backgroundColor: ELEMENT_CATEGORY_COLORS[detailEl.category], color: contrastTextColor(ELEMENT_CATEGORY_COLORS[detailEl.category]) }}
          >
            <span className="absolute top-1 left-1.5 text-[0.6rem] leading-none tabular-nums opacity-70">{detailEl.atomicNumber}</span>
            <span className="text-2xl leading-none font-bold">{detailEl.symbol}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-stone-100">{elementName(detailEl.symbol, lang)}</p>
            <p className="truncate text-xs text-stone-400">
              {labels.atomicNumber} {detailEl.atomicNumber} · {categoryLabel(detailEl.category, lang)}
            </p>
            <p className="text-xs text-stone-400">
              {detailCount > 0 ? `${detailCount} ${detailCount === 1 ? itemLabelSingular : itemLabelPlural}` : labels.noItems}
            </p>
          </div>
          {detailCount > 0 && linkTo && (
            <Link to={linkTo(detailEl.symbol)} className={actionClass}>
              {labels.viewItems}
            </Link>
          )}
          {detailCount > 0 && !linkTo && onSelect && (
            <button type="button" onClick={() => onSelect(detailEl.symbol)} className={actionClass}>
              {labels.viewItems}
            </button>
          )}
          <button
            type="button"
            onClick={() => setDetail(null)}
            title={labels.close}
            aria-label={labels.close}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-stone-400 transition active:bg-stone-800"
          >
            <CloseIcon />
          </button>
        </div>
      ) : (
        <p className="mt-3 text-center text-xs text-stone-500">{labels.tapHint}</p>
      )}
    </div>
  )
}

/** Modo completo (desktop, e "Ampliar" no mobile): símbolo + nome + número, rolagem lateral no celular. */
function FullPeriodicGrid({
  countBySymbol,
  lang,
  minColRem,
  itemLabelSingular,
  itemLabelPlural,
  linkTo,
  onSelect,
  selectedSymbol,
  onNavigate,
}: Omit<PeriodicTableGridProps, 'fullscreenTitle' | 'externalControls'> & { /** Clique num `<Link>` de célula (tela cheia fecha). */ onNavigate?: () => void }) {
  const nameMultiplier = nameCqwMultiplier(lang)
  return (
    <div
      className="grid gap-1.5"
      style={{ gridTemplateColumns: `repeat(18, minmax(${minColRem}rem, 1fr))`, containerType: 'inline-size' }}
    >
      {CHEMICAL_ELEMENTS.map((el) => {
        const count = countBySymbol.get(el.symbol) ?? 0
        const active = count > 0
        const selected = active && selectedSymbol === el.symbol
        const name = elementName(el.symbol, lang)
        const bg = ELEMENT_CATEGORY_COLORS[el.category]
        const fg = contrastTextColor(bg)
        const cellStyle: CSSProperties = {
          gridColumn: el.col,
          gridRow: el.row,
          marginTop: el.row === 8 ? '0.75rem' : undefined,
          backgroundColor: bg,
          color: fg,
        }
        const itemLabel = count === 1 ? itemLabelSingular : itemLabelPlural
        const titleText = `${name} (${el.symbol}) · ${categoryLabel(el.category, lang)}${active ? ` · ${count} ${itemLabel}` : ''}`
        const content: ReactNode = (
          <>
            {/* Símbolo e número atômico: reforço de tamanho só abaixo do
                breakpoint `md` — ver ChemistryCategoryPage (origem deste
                componente) pro histórico do ajuste. */}
            <span className="absolute top-[6%] left-[6%] leading-none tabular-nums opacity-70 text-[clamp(0.62rem,0.95cqw,1.1rem)] md:text-[clamp(0.5rem,0.8cqw,1rem)]">
              {el.atomicNumber}
            </span>
            <span className="font-bold text-[clamp(0.85rem,2.3cqw,2.4rem)] md:text-[clamp(0.6rem,2cqw,2.2rem)]" style={{ lineHeight: 1 }}>
              {el.symbol}
            </span>
            {/* Nome sempre uma palavra só (pt/en/es) — nunca quebra linha;
                o tamanho vem de `nameCqwMultiplier` pra sempre caber. */}
            <span
              className="box-border block max-w-full overflow-hidden text-center leading-tight text-ellipsis whitespace-nowrap"
              style={{ fontSize: `clamp(0.32rem, ${nameMultiplier}cqw, 1.2rem)`, marginTop: '4%', paddingInline: '8%' }}
            >
              {name}
            </span>
            {active && (
              <span className="absolute top-[6%] right-[6%] leading-none tabular-nums opacity-40" style={{ fontSize: 'clamp(0.45rem, 0.65cqw, 0.9rem)' }}>
                ({count})
              </span>
            )}
          </>
        )
        const className = `relative flex aspect-square flex-col items-center justify-center rounded-lg transition ${
          active ? `ring-2 ${selected ? 'ring-amber-400' : 'ring-white/70'} hover:brightness-110` : 'opacity-30'
        }`
        if (active && linkTo) {
          return (
            <Link key={el.symbol} to={linkTo(el.symbol)} onClick={onNavigate} style={cellStyle} title={titleText} className={className}>
              {content}
            </Link>
          )
        }
        if (active && onSelect) {
          return (
            <button key={el.symbol} type="button" onClick={() => onSelect(el.symbol)} style={cellStyle} title={titleText} className={className}>
              {content}
            </button>
          )
        }
        return (
          <div key={el.symbol} style={cellStyle} title={titleText} className={className}>
            {content}
          </div>
        )
      })}
    </div>
  )
}
