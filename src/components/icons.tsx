// Ícones SVG em linha da UI. Regra do projeto (claude.md §4): ícones são SVG
// inline, herdam a cor via `currentColor` e o tamanho do contexto (`1em`), com
// `aria-label`/`title` a cargo do botão quando ele fica só com ícone.
//
// Todos compartilham o mesmo traço (stroke 1.5, cantos/juntas arredondados) e a
// mesma viewBox 24×24 para ficarem visualmente coerentes entre si.

import type { SVGProps } from 'react'

export type IconProps = SVGProps<SVGSVGElement>

function base(props: IconProps): IconProps {
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    width: '1em',
    height: '1em',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    'aria-hidden': true,
    ...props,
  }
}

/** Exportar / compartilhar (seta saindo de uma caixa). */
export function ExportIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 15V3" />
      <path d="m8 7 4-4 4 4" />
      <path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
    </svg>
  )
}

/** Lua (tema escuro). */
export function MoonIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" />
    </svg>
  )
}

/** Sol (tema claro). */
export function SunIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  )
}

/** Seta circular de "desfazer" — restaurar um campo editado à mão para automático. */
export function RestoreAutoIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  )
}

/** Expandir (setas apontando pros 4 cantos) — botão de "abrir em tamanho maior". */
export function ExpandIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M15 3h6v6" />
      <path d="M9 21H3v-6" />
      <path d="M21 3l-7 7" />
      <path d="M3 21l7-7" />
    </svg>
  )
}

/** Globo (seletor de idioma). */
export function GlobeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
    </svg>
  )
}

/** Wi-Fi cortado (sem conexão) — arcos do sinal com a barra diagonal por cima. */
export function WifiOffIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 4l18 18" />
      <path d="M2.5 8.5a16 16 0 0 1 5-3.1" />
      <path d="M21.5 8.5a16 16 0 0 0-9.9-3.4" />
      <path d="M5.5 12.5a11 11 0 0 1 3-2" />
      <path d="M18.5 12.5a11 11 0 0 0-3.3-2.1" />
      <path d="M8.8 16.2a6 6 0 0 1 6.4 0" />
      <path d="M12 20h.01" />
    </svg>
  )
}

/** Seta pra baixo (expandir/recolher seções) — rotacionar via CSS quando recolhido. */
export function ChevronDownIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

/** Seta pra esquerda (paginação/carrossel — ex.: foto anterior na pré-visualização de espécime). */
export function ChevronLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

/** Seta pra direita (paginação/carrossel — ex.: próxima foto na pré-visualização de espécime). */
export function ChevronRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

/** Adicionar (mais). Traço mais grosso que o padrão — ícone pequeno e sozinho, precisa de peso visual. */
export function PlusIcon(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 2.5, ...props })}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  )
}

/** Câmera (criar em massa por fotos). */
export function CameraIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 8a2 2 0 0 1 2-2h1.5l1-2h5l1 2H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z" />
      <circle cx="12" cy="12.5" r="3" />
    </svg>
  )
}

/** Dividir em N peças (retângulo repartido em colunas). */
export function SplitIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
      <path d="M15 4v16" />
    </svg>
  )
}

/** Colunas congeladas (tabela com a borda esquerda reforçada, indicando a coluna fixa). */
export function FreezeColumnsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M9 5v14" strokeWidth={2.5} />
    </svg>
  )
}

/** Controles deslizantes (preset de ajuste em lote). */
export function SlidersIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 8h10" />
      <path d="M18 8h2" />
      <circle cx="16" cy="8" r="2" />
      <path d="M4 16h2" />
      <path d="M10 16h10" />
      <circle cx="8" cy="16" r="2" />
    </svg>
  )
}

/**
 * Ficha/documento (gerar ficha A4 em PDF). Ícone preenchido (não seguindo o
 * padrão de traço dos demais) — fornecido pelo dono como arquivo próprio.
 */
export function FichaIcon(props: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="1em"
      height="1em"
      viewBox="0 0 512.000000 512.000000"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
      {...props}
    >
      <g
        transform="translate(0.000000,512.000000) scale(0.100000,-0.100000)"
        fill="currentColor"
        stroke="currentColor"
        strokeWidth={40}
        strokeLinejoin="round"
      >
        <path d="M985 5108 c-41 -23 -44 -38 -45 -185 l0 -143 -221 0 c-223 0 -249 -4 -276 -39 -10 -12 -12 -531 -13 -2348 0 -1282 3 -2339 6 -2348 18 -47 -59 -45 1869 -45 1354 0 1812 3 1828 12 45 23 46 32 47 271 l0 227 214 0 c217 0 258 5 282 38 11 14 13 330 14 1672 l0 1655 -623 622 -622 623 -1220 0 c-899 -1 -1225 -4 -1240 -12z m2345 -727 l0 -570 24 -28 24 -28 571 -3 571 -3 0 -1534 0 -1535 -1705 0 -1705 0 0 2135 0 2135 1110 0 1110 0 0 -569z m620 -6 l445 -445 -448 0 -447 0 0 445 c0 245 1 445 3 445 1 0 202 -200 447 -445z m-3010 -1784 l0 -2020 24 -28 24 -28 1511 -3 1511 -2 0 -170 0 -170 -1705 0 -1705 0 0 2220 0 2220 170 0 170 0 0 -2019z" />
        <path d="M1489 4337 c-36 -28 -39 -51 -39 -332 l0 -277 29 -29 29 -29 285 0 284 0 27 25 26 24 0 291 0 291 -25 24 -24 25 -288 0 c-211 -1 -292 -4 -304 -13z m471 -327 l0 -170 -170 0 -170 0 0 170 0 170 170 0 170 0 0 -170z" />
        <path d="M1500 3488 c-53 -28 -62 -97 -18 -138 19 -18 35 -20 140 -20 113 0 120 1 143 25 34 33 34 83 -1 116 -23 22 -35 24 -132 27 -74 2 -115 -1 -132 -10z" />
        <path d="M2012 3490 c-31 -13 -55 -71 -43 -104 23 -59 -44 -56 1107 -56 l1051 0 27 26 c33 34 34 74 2 111 l-24 28 -1049 2 c-626 1 -1057 -2 -1071 -7z" />
        <path d="M1502 2976 c-55 -25 -66 -92 -22 -136 18 -18 34 -20 140 -20 115 0 122 1 145 25 32 31 32 75 1 112 -23 26 -28 28 -127 30 -76 3 -113 -1 -137 -11z" />
        <path d="M2014 2976 c-20 -9 -35 -25 -42 -45 -13 -36 -8 -56 21 -88 l20 -23 1059 0 1059 0 24 25 c32 31 32 75 1 112 l-24 28 -1044 2 c-863 2 -1048 0 -1074 -11z" />
        <path d="M1480 2450 c-28 -28 -34 -63 -16 -98 22 -43 68 -55 183 -50 89 4 97 6 119 32 31 36 31 80 -1 111 -23 24 -30 25 -145 25 -106 0 -122 -2 -140 -20z" />
        <path d="M1998 2456 c-54 -41 -37 -127 29 -146 27 -8 334 -10 1071 -8 l1034 3 24 28 c31 37 31 81 -1 112 l-24 25 -1058 0 c-852 -1 -1061 -3 -1075 -14z" />
        <path d="M1482 1940 c-29 -27 -37 -63 -20 -96 21 -46 51 -55 170 -52 97 3 109 5 132 27 35 33 35 83 1 116 -23 24 -30 25 -143 25 -105 0 -121 -2 -140 -20z" />
        <path d="M1993 1938 c-11 -13 -23 -31 -26 -41 -11 -29 17 -82 49 -95 22 -9 284 -12 1072 -10 l1044 3 24 28 c31 36 31 77 -1 111 l-24 26 -1059 0 -1059 0 -20 -22z" />
        <path d="M1479 1421 c-17 -18 -29 -40 -29 -56 0 -16 12 -38 29 -56 29 -28 32 -29 136 -29 106 0 138 8 162 39 22 28 15 76 -13 105 -26 25 -31 26 -141 26 -113 0 -115 0 -144 -29z" />
        <path d="M1994 1426 c-21 -18 -28 -32 -28 -61 0 -29 7 -43 28 -61 l27 -24 1045 0 c1078 0 1071 0 1101 39 16 21 16 71 0 92 -30 39 -23 39 -1101 39 l-1045 0 -27 -24z" />
      </g>
    </svg>
  )
}

/**
 * YouTube (logo oficial "full-color", 2017). Ícone com cores fixas (não segue
 * o padrão de traço/currentColor dos demais) — mesmo caso de FichaIcon.
 */
export function YouTubeIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 28.57 20" aria-hidden {...props}>
      <path
        d="M27.9727 3.12324C27.6435 1.89323 26.6768 0.926623 25.4468 0.597366C23.2197 2.24288e-07 14.285 0 14.285 0C14.285 0 5.35042 2.24288e-07 3.12323 0.597366C1.89323 0.926623 0.926623 1.89323 0.597366 3.12324C2.24288e-07 5.35042 0 10 0 10C0 10 2.24288e-07 14.6496 0.597366 16.8768C0.926623 18.1068 1.89323 19.0734 3.12323 19.4026C5.35042 20 14.285 20 14.285 20C14.285 20 23.2197 20 25.4468 19.4026C26.6768 19.0734 27.6435 18.1068 27.9727 16.8768C28.5701 14.6496 28.5701 10 28.5701 10C28.5701 10 28.5677 5.35042 27.9727 3.12324Z"
        fill="#FF0000"
      />
      <path d="M11.4253 14.2854L18.8477 10.0004L11.4253 5.71533V14.2854Z" fill="white" />
    </svg>
  )
}

/** Foto (imagem) — par visual do `VideoIcon` onde os dois tipos aparecem juntos. */
export function PhotoIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m4 17 4.5-4.5a2 2 0 0 1 2.8 0L20 21" />
    </svg>
  )
}

/**
 * Álbuns de mídia (0057): pilha de fotos. Abre a galeria completa do item, com
 * "Fotos principais" e os álbuns extras.
 */
export function AlbumsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="8" y="3" width="13" height="13" rx="2" />
      <circle cx="12" cy="7.5" r="1.25" />
      <path d="m9 14 3.2-3.2a1.6 1.6 0 0 1 2.3 0L21 17" />
      <path d="M16 20.5H5a2 2 0 0 1-2-2V7.5" />
    </svg>
  )
}

/** Mover a mídia para outro álbum: seta entrando numa caixa. */
export function MoveToAlbumIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 7.5V6a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.6.8l.9 1.2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3" />
      <path d="M3 12.5h8" />
      <path d="m8 9.5 3 3-3 3" />
    </svg>
  )
}

/**
 * Fotos secundárias (0078): seta para BAIXO entrando na base. Tirar do destaque
 * é "descer" a foto, não movê-la para outro lugar — por isso o eixo vertical,
 * que a distingue à primeira vista do `MoveToAlbumIcon` (horizontal, "para
 * outra caixa"), com que divide a barra de ações do tile.
 */
export function DemoteToSecondaryIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v11" />
      <path d="m8 10.5 4 4 4-4" />
      <path d="M4 18.5h16" />
    </svg>
  )
}

/** O inverso: devolver a foto secundária ao destaque. */
export function PromoteFromSecondaryIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21V10" />
      <path d="m8 13.5 4-4 4 4" />
      <path d="M4 5.5h16" />
    </svg>
  )
}

/** Vídeo (claquete/câmera de vídeo) — usado onde não há miniatura pra mostrar. */
export function VideoIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2" y="6" width="14" height="12" rx="2" />
      <path d="m16 10.5 5.2-3a.6.6 0 0 1 .8.5v8a.6.6 0 0 1-.8.5l-5.2-3v-3Z" />
    </svg>
  )
}

/**
 * Play (sobreposição de "isto é um vídeo" na miniatura). Preenchido com
 * `currentColor` — é um selo sobre a foto, precisa de massa visual, não traço.
 */
export function PlayIcon(props: IconProps) {
  return (
    <svg {...base({ fill: 'currentColor', ...props })}>
      <path d="M8 5.5v13l11-6.5-11-6.5Z" />
    </svg>
  )
}

/** Estrela (Modo de Exibição). `filled` = item já em exibição. */
export function StarIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base({ fill: filled ? 'currentColor' : 'none', ...props })}>
      <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3l-5.5 2.9 1-6.2L3 9.6l6.2-.9L12 3Z" />
    </svg>
  )
}

/** Photo Studio (imagem com ajuste). */
export function PhotoStudioIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m3 16 4.5-4.5a2 2 0 0 1 2.8 0L17 18" />
      <path d="m14 15 2-2a2 2 0 0 1 2.8 0L21 15" />
    </svg>
  )
}

/**
 * Etiqueta/marcador de categoria. Preenchido (não é o traço padrão dos demais)
 * porque serve para exibir a COR da categoria — um contorno de 1.5 quase não
 * mostra cor no tamanho de um chip.
 */
export function CategoryIcon(props: IconProps) {
  return (
    <svg {...base({ strokeWidth: 0, fill: 'currentColor', ...props })}>
      <path d="M3.5 6.5A2.5 2.5 0 0 1 6 4h5.2a2.5 2.5 0 0 1 1.77.73l6.3 6.3a2.5 2.5 0 0 1 0 3.54l-5.2 5.2a2.5 2.5 0 0 1-3.54 0l-6.3-6.3A2.5 2.5 0 0 1 3.5 11.7Zm4.25 1.25a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
    </svg>
  )
}

/** Elo de corrente — importar mídia por link (URL de um anúncio) e documentação/itens vinculados. */
export function LinkIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

/** Importar planilha (tabela com seta descendo para dentro). */
export function ImportIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 9h18" />
      <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5V13" />
      <path d="M3 9v9.5A1.5 1.5 0 0 0 4.5 20H11" />
      <path d="M9 4v16" />
      <path d="M18 14v6" />
      <path d="m15.5 17.5 2.5 2.5 2.5-2.5" />
    </svg>
  )
}

/** Livro/Biblioteca (livro aberto). */
export function BookIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 7v14" />
      <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
    </svg>
  )
}

/** Informação (círculo com "i") — dica contextual ao lado de um rótulo. */
export function InfoIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  )
}

/** Lupa (campos e ações de busca). */
export function SearchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  )
}

/** Funil (abrir e identificar filtros). */
export function FilterIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 5h18l-7 8v5l-4 2v-7Z" />
    </svg>
  )
}

/** Bloco de anotações. */
export function NotesIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5" />
      <path d="M8 12h7M8 16h7" />
    </svg>
  )
}

/** Marcador simples para tags. */
export function TagIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 13 13 20a2 2 0 0 1-2.8 0L4 13.8V4h9.8L20 10.2a2 2 0 0 1 0 2.8Z" />
      <circle cx="8.5" cy="8.5" r="1.25" />
    </svg>
  )
}

/** Cadeado (conteúdo e filtros privados). */
export function LockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14v3" />
    </svg>
  )
}

/** Documento simples — ficha técnica e arquivos PDF. */
export function DocumentIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3h8l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M14 3v5h5" />
      <path d="M8 12h8M8 16h6" />
    </svg>
  )
}

/** Planilha/tabela. */
export function SpreadsheetIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18M9 4v16M15 9v11M3 15h18" />
    </svg>
  )
}

/** Cartão físico horizontal. */
export function CardIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2.5" y="5" width="19" height="14" rx="2" />
      <path d="M6 10h5M6 14h3M15 10h3v4h-3z" />
    </svg>
  )
}

/** Etiqueta de impressão. */
export function LabelIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3.5 5.5A2.5 2.5 0 0 1 6 3h5.2a2.5 2.5 0 0 1 1.77.73l7.3 7.3a2.5 2.5 0 0 1 0 3.54l-5.7 5.7a2.5 2.5 0 0 1-3.54 0l-7.3-7.3A2.5 2.5 0 0 1 3 11.2V6Z" />
      <circle cx="8" cy="8" r="1.25" />
    </svg>
  )
}

/**
 * QR code. Três localizadores nos cantos (o que torna um QR reconhecível de
 * relance) mais alguns módulos soltos no canto livre — desenhar a matriz inteira
 * viraria ruído no tamanho de um ícone.
 */
export function QrCodeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM19 19h2v2h-2M14 21h1M21 14h-1" />
    </svg>
  )
}

/** Placa de expositor. */
export function PlaqueIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="3" width="16" height="14" rx="2" />
      <path d="M8 21h8M10 17v4M14 17v4M8 8h8M8 12h5" />
    </svg>
  )
}

/** Selo de certificado — círculo com marca de verificação e fitas penduradas. */
export function CertificateIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8.5" r="5.5" />
      <path d="M9.3 8.7 11.2 10.6 15 6.3" />
      <path d="M8.2 12.9 6.4 21.5 12 18.2 17.6 21.5 15.8 12.9" />
    </svg>
  )
}

/** Olho — abrir ou ocultar prévia. */
export function EyeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  )
}

/** Olho cortado — conteúdo oculto (ex.: álbum de mídia privado, 0057). */
export function EyeOffIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9.9 5.2A9.6 9.6 0 0 1 12 5c6 0 9.5 6 9.5 6a15.7 15.7 0 0 1-3.3 3.9M6.5 6.9A15.6 15.6 0 0 0 2.5 11s3.5 6 9.5 6c1.5 0 2.8-.4 4-.9" />
      <path d="M10.2 10.2a2.5 2.5 0 0 0 3.5 3.5" />
      <path d="m3.5 3.5 17 17" />
    </svg>
  )
}

/** Download de arquivo. */
export function DownloadIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v12M7.5 10.5 12 15l4.5-4.5" />
      <path d="M4 19h16" />
    </svg>
  )
}

/** Impressora. */
export function PrinterIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 9V3h12v6M6 17H4a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="7" />
      <path d="M18 12h.01" />
    </svg>
  )
}

/** Fechar. */
export function CloseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m6 6 12 12M18 6 6 18" />
    </svg>
  )
}

/** Confirmação — item já lido/coletado. */
export function CheckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m5 13 4.5 4.5L19 7" />
    </svg>
  )
}

/** Selo de verificação (escudo com check) — status "verificado manualmente". */
export function VerifiedIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3 4.5 6v6c0 4.2 3.2 7.5 7.5 9 4.3-1.5 7.5-4.8 7.5-9V6L12 3Z" />
      <path d="m8.5 12 2.3 2.3L15.5 10" />
    </svg>
  )
}

/** Cópia para a área de transferência. */
export function CopyIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </svg>
  )
}

/** Leitura em lote — várias etiquetas empilhadas. */
export function StackIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  )
}

/** Voltar. */
export function ArrowLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  )
}

/** Recortar (cantos de moldura de recorte) — editar a área visível de uma imagem/capa. */
export function CropIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M18 22V8a2 2 0 0 0-2-2H2" />
    </svg>
  )
}

/** Espécime genérico — usado quando não existe miniatura. */
export function SpecimenIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m12 2 7 5-2.5 10L12 22l-4.5-5L5 7l7-5Z" />
      <path d="m5 7 7 4 7-4M12 11v11M7.5 17l4.5-6 4.5 6" />
    </svg>
  )
}

/** Grade de miniaturas (alternar visualização). */
export function GridViewIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
    </svg>
  )
}

/** Lista em linhas (alternar visualização). */
export function ListViewIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

/** Elo de corrente partido — desfazer um vínculo (ex.: tirar a peça do lote). */
export function UnlinkIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9.5 14.5 8 16a3.5 3.5 0 0 1-5-5l1.5-1.5" />
      <path d="M14.5 9.5 16 8a3.5 3.5 0 0 1 5 5l-1.5 1.5" />
      <path d="m4 4 16 16" />
    </svg>
  )
}

/** Lixeira. */
export function TrashIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 7h16" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  )
}

/** Seta circular anti-horária — restaurar um item da lixeira. */
export function RestoreIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 11a9 9 0 1 1 2.6 6.3" />
      <path d="M3 5v6h6" />
    </svg>
  )
}

/** Duas setas circulares — recalcular/atualizar um valor derivado (ex.: reler cores da capa). */
export function RefreshIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 12a9 9 0 0 1-15.3 6.36M3 12a9 9 0 0 1 15.3-6.36" />
      <path d="M21 3v6h-6" />
      <path d="M3 21v-6h6" />
    </svg>
  )
}

/** Alça de arrasto (seis pontos) — reordenar itens de uma lista. */
export function GripIcon(props: IconProps) {
  return (
    <svg {...base({ fill: 'currentColor', strokeWidth: 0, ...props })}>
      <circle cx="9" cy="6" r="1.4" />
      <circle cx="15" cy="6" r="1.4" />
      <circle cx="9" cy="12" r="1.4" />
      <circle cx="15" cy="12" r="1.4" />
      <circle cx="9" cy="18" r="1.4" />
      <circle cx="15" cy="18" r="1.4" />
    </svg>
  )
}

/** Desce e vira à direita — indica que a linha é filha de um nó pai visível na lista acima. */
export function CornerDownRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4v7a4 4 0 0 0 4 4h12" />
      <path d="m15 10 5 5-5 5" />
    </svg>
  )
}

/** Engrenagem — abre as opções de um item (renomear, capa, cor, mover, apagar). */
export function GearIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}

/** Reticências horizontais — menu com as ações que não couberam na barra. */
export function MoreIcon(props: IconProps) {
  return (
    <svg {...base({ fill: 'currentColor', strokeWidth: 0, ...props })}>
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  )
}

/** Lápis — renomear. */
export function PencilIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  )
}

/** Quadrado com visto — entrar no modo de seleção múltipla. */
export function SelectIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
      <path d="m9 11 3 3 8-8" />
    </svg>
  )
}

/** Grade densa (3×3) — grade pequena, mais itens visíveis por linha. */
export function GridDenseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="5" height="5" rx="1" />
      <rect x="9.5" y="3" width="5" height="5" rx="1" />
      <rect x="16" y="3" width="5" height="5" rx="1" />
      <rect x="3" y="9.5" width="5" height="5" rx="1" />
      <rect x="9.5" y="9.5" width="5" height="5" rx="1" />
      <rect x="16" y="9.5" width="5" height="5" rx="1" />
      <rect x="3" y="16" width="5" height="5" rx="1" />
      <rect x="9.5" y="16" width="5" height="5" rx="1" />
      <rect x="16" y="16" width="5" height="5" rx="1" />
    </svg>
  )
}

/** Quadrado único — grade grande, um item por vez ocupando bem mais espaço. */
export function GridLargeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  )
}

/** Retângulo com uma coluna à esquerda destacada — abre/fecha a barra lateral. */
export function SidebarIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </svg>
  )
}

/** Sair (porta com seta saindo) — encerrar a sessão da conta. */
export function LogOutIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  )
}

/** Catálogo/base de dados (três "discos" empilhados) — tela admin de minerais. */
export function DatabaseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <ellipse cx="12" cy="5" rx="8" ry="3" />
      <path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5" />
      <path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
    </svg>
  )
}

/** Caixa de encomenda — documento de importação/rastreio (AWB), ao lado de DocumentIcon (nota fiscal). */
export function PackageIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 8 12 3 3 8v8l9 5 9-5Z" />
      <path d="M3 8l9 5 9-5M12 13v8" />
    </svg>
  )
}

/** Três barras de altura crescente — painel de Estatísticas. */
export function ChartIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 21V10M12 21V4M19 21v-7" />
      <path d="M3 21h18" />
    </svg>
  )
}

/** Relógio (mostrador + ponteiros) — "Últimas adições", ordenação por mais recente. */
export function ClockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </svg>
  )
}

/** Caminhão de entrega — Fornecedores. */
export function TruckIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2 7h11v10H2z" />
      <path d="M13 10h4l4 3.5V17h-8z" />
      <circle cx="6.5" cy="18" r="1.75" />
      <circle cx="16.5" cy="18" r="1.75" />
    </svg>
  )
}

/** Cédula com moeda no centro — Fluxo de caixa. */
export function CashIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 9v.01M18 15v.01" />
    </svg>
  )
}

/** Fachada de prédio (janelas em grade) — página Empresa. */
export function BuildingIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 21V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v17" />
      <path d="M13 21v-9a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v9" />
      <path d="M3 21h18" />
      <path d="M8 7h0M8 11h0M8 15h0" />
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Ícones COLORIDOS do cabeçalho (Configurações, Modo de edição, Modo privado)
// — exceção deliberada ao padrão currentColor do resto do pool (claude.md §4):
// usam cores próprias FIXAS (não herdam do texto, não seguem o tema de cor
// escolhido nas Configurações) de propósito, pra ganhar destaque visual no
// topo da página. Ícone novo continua sendo currentColor por padrão; esse
// tratamento é só pra esses três botões específicos.
// ---------------------------------------------------------------------------

/** Engrenagem colorida (Configurações) — mesma silhueta do GearIcon, preenchida em índigo fixo. */
export function SettingsColorIcon(props: IconProps) {
  return (
    <svg {...base({ fill: '#a79bc7', stroke: 'none', ...props })}>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 8.6a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      <circle cx="12" cy="12" r="3" fill="var(--color-stone-950)" />
    </svg>
  )
}

/** Lápis colorido (Modo de edição) — contorno cinza quando desligado, preenchido em âmbar quando ligado. */
export function EditModeColorIcon({ active, ...props }: IconProps & { active?: boolean }) {
  const color = active ? '#f59e0b' : '#a8a29e'
  return (
    <svg {...base({ fill: active ? color : 'none', stroke: color, strokeWidth: 2, ...props })}>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" />
    </svg>
  )
}

/** Cadeado colorido (Modo privado) — fechado (protegido) em verde suave, aberto (dado sensível exposto) em rosa-terracota suave. */
export function PrivateModeColorIcon({ unlocked, ...props }: IconProps & { unlocked?: boolean }) {
  const color = unlocked ? '#c08689' : '#8caf8a'
  return (
    <svg {...base({ fill: color, stroke: 'none', ...props })}>
      <rect x="5" y="10" width="14" height="11" rx="2" />
      <path
        d={unlocked ? 'M8 10V7a4 4 0 0 1 6.2-3.4' : 'M8 10V7a4 4 0 0 1 8 0v3'}
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <circle cx="12" cy="14.5" r="1.3" fill="var(--color-stone-950)" />
      <path d="M12 15.5v1.5" stroke="var(--color-stone-950)" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  )
}

/** Calculadora (precificação). */
export function CalculatorIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M8 6h8" />
      <path d="M8 11h.01" />
      <path d="M12 11h.01" />
      <path d="M16 11h.01" />
      <path d="M8 15h.01" />
      <path d="M12 15h.01" />
      <path d="M16 15v3" />
      <path d="M8 19h.01" />
      <path d="M12 19h.01" />
    </svg>
  )
}
