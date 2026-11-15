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

/** Ordenar (barras decrescentes + seta para baixo). */
export function SortIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 6h11" />
      <path d="M3 12h7" />
      <path d="M3 18h4" />
      <path d="M17 5v14" />
      <path d="m14 16 3 3 3-3" />
    </svg>
  )
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

/** Compartilhar em redes (três nós ligados). */
export function ShareIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4" />
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

/** Seta pra cima (mover item para cima em listas ordenáveis). */
export function ChevronUpIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m18 15-6-6-6 6" />
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

/** Cotovelo "filha de" — marca subcategoria/subitem indentado sob a mãe (distinto do chevron, que expande/recolhe). */
export function SubcategoryIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7 5v7a3 3 0 0 0 3 3h8" />
      <path d="m14 11 4 4-4 4" />
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

/**
 * Colunas congeladas — cadeado sobre uma coluna, distinto do `LockIcon`
 * (usado ao lado, no mesmo toolbar, para "filtros privados") pra não colidir
 * visualmente as duas ações.
 */
export function FreezeColumnsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 3v18" />
      <rect x="9" y="11" width="11" height="9" rx="2" />
      <path d="M12 11V8a3 3 0 0 1 6 0v3" />
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

/** Mover o item para outra coleção: pilha de camadas com seta saindo. */
export function MoveToCollectionIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m12 3 8 4-8 4-8-4 8-4Z" />
      <path d="m4 12 8 4 3-1.5" />
      <path d="m4 16.5 8 4 3-1.5" />
      <path d="M17 15h5" />
      <path d="m19.5 12.5 2.5 2.5-2.5 2.5" />
    </svg>
  )
}

/** Transferir a mídia para outro item: seta entre dois quadros. */
export function TransferToSpecimenIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="6" width="7" height="12" rx="1.5" />
      <rect x="14" y="6" width="7" height="12" rx="1.5" />
      <path d="M10.5 12h3" />
      <path d="m12 10.2 1.8 1.8-1.8 1.8" />
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

/**
 * Etiqueta de categoria com "−" — tirar itens DA CATEGORIA (só desfaz o
 * vínculo). De propósito diferente da lixeira, que é apagar o item.
 */
export function CategoryRemoveIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path
        transform="scale(0.8)"
        stroke="none"
        fill="currentColor"
        d="M3.5 6.5A2.5 2.5 0 0 1 6 4h5.2a2.5 2.5 0 0 1 1.77.73l6.3 6.3a2.5 2.5 0 0 1 0 3.54l-5.2 5.2a2.5 2.5 0 0 1-3.54 0l-6.3-6.3A2.5 2.5 0 0 1 3.5 11.7Zm4.25 1.25a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
      />
      <path d="M15 19.5h7" strokeWidth={2.25} />
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

/**
 * Coroa amarela — marca de recurso premium. Cor FIXA (não herda currentColor),
 * como os ícones coloridos do cabeçalho: o amarelo é o próprio sinal "premium".
 */
export function CrownIcon(props: IconProps) {
  return (
    <svg {...base({ fill: '#facc15', stroke: '#facc15', strokeWidth: 1.2, ...props })}>
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 10H5L3 8z" />
      <path d="M5 21h14" fill="none" />
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

/** Marcador de página (fila "quero ler" da Biblioteca). `filled` = na fila. */
export function BookmarkIcon({ filled, ...props }: IconProps & { filled?: boolean }) {
  return (
    <svg {...base({ fill: filled ? 'currentColor' : 'none', ...props })}>
      <path d="M6 4h12a1 1 0 0 1 1 1v15l-7-4-7 4V5a1 1 0 0 1 1-1Z" />
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

/** Leitura em lote — várias etiquetas empilhadas.
 *  Desenho ocupa y 4.5–19.5 (centralizado na viewBox 24×24, como os outros
 *  ícones do pool) — antes ocupava y 3–18, deslocado ~6% pra cima; ficava
 *  visivelmente alto ao lado de texto (ex.: seletor de coleção). */
export function StackIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m12 4.5 9 5-9 5-9-5 9-5Z" />
      <path d="m3 14.5 9 5 9-5" />
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

/** Avançar / indicar "vem de". */
export function ArrowRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m9 18 6-6-6-6" />
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

/** Linhas de cards de tamanhos crescentes — agrupar por classe de tamanho. */
export function SizeRowsIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="3.5" width="4" height="4" rx="1" />
      <rect x="10" y="3.5" width="4" height="4" rx="1" />
      <rect x="3.5" y="10.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="10.5" width="7" height="7" rx="1.5" />
      <path d="M3.5 20.5h17" />
    </svg>
  )
}

/** Duas páginas empilhadas — editor de páginas do PDF (excluir/reordenar). */
export function PagesIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M7.5 3.5h7l3 3v11a1.5 1.5 0 0 1-1.5 1.5h-8.5a1.5 1.5 0 0 1-1.5-1.5V5a1.5 1.5 0 0 1 1.5-1.5Z" />
      <path d="M14 3.5V7h3.5" />
      <path d="M4.5 7.5V19a1.5 1.5 0 0 0 1.5 1.5h9" />
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

/** Pasta com seta — mover para outra seção/pasta. */
export function FolderMoveIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M10 13h6" />
      <path d="m13.5 10.5 2.5 2.5-2.5 2.5" />
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
/** Grade 4×4 (16 quadrados) — mais densa que `GridDenseIcon`, pra grade extra pequena. */
export function GridTinyIcon(props: IconProps) {
  const pos = [3.5, 8, 12.5, 17]
  return (
    <svg {...base(props)}>
      {pos.flatMap((y) => pos.map((x) => <rect key={`${x}-${y}`} x={x} y={y} width="3.5" height="3.5" rx="0.8" />))}
    </svg>
  )
}

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

/* ── Redes sociais (contato de fornecedor) — contorno no traço padrão,
   currentColor, não o logo colorido oficial (ver YouTubeIcon pro caso da
   ficha, que usa as cores da marca de propósito). ── */

/** Instagram (câmera arredondada). */
export function InstagramIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.75" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Facebook ("f" num quadrado arredondado). */
export function FacebookIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M15.5 8H14a2 2 0 0 0-2 2v11M9.5 13h5" />
    </svg>
  )
}

/** YouTube em contorno (retângulo arredondado + play). */
export function YouTubeOutlineIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="m10 9.5 4.5 2.5-4.5 2.5z" />
    </svg>
  )
}

/** TikTok (nota musical com gancho). */
export function TikTokIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M13 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M13 3c.4 2.6 2.2 4.4 5 4.8" />
    </svg>
  )
}

/** X (antigo Twitter). */
export function XSocialIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 4l16 16M20 4 4 20" />
    </svg>
  )
}

/** LinkedIn ("in" num quadrado arredondado). */
export function LinkedInIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M8 10.5V16M8 7.5v.01M12 16v-5.5M12 13a2.5 2.5 0 0 1 5 0v3" />
    </svg>
  )
}

/** Telegram (avião de papel). */
export function TelegramIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 4 3 11l6.5 2.5L18 7l-6.5 7.5L17 20z" />
    </svg>
  )
}

/** WhatsApp (balão com telefone). */
export function WhatsAppIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 20l1.3-3.8A8.5 8.5 0 1 1 8 19z" />
      <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.2-1.8-.9-.8.8a4 4 0 0 1-2.1-2.1l.8-.8-.9-1.8z" />
    </svg>
  )
}

/** Caminhão de entrega — Fornecedores (mesmo desenho do loja-app). */
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

/** Prédio (empresa/PJ) — link do Painel PJ na navegação. */
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

/** Pino de mapa (endereço/localização). */
export function MapPinIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21Z" />
      <circle cx="12" cy="9.5" r="2.5" />
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

/** Conta/usuário (cabeça + ombros) — aba Conta das Configurações. */
export function UserIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c0-3.5 3.13-6 7-6s7 2.5 7 6" />
    </svg>
  )
}

/** Balança de dois pratos — filtro de faixa de peso. */
export function ScaleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3v18M8 21h8" />
      <path d="M5 6h14" />
      <path d="M5 6 2 12a3 3 0 0 0 6 0Z" />
      <path d="M19 6l-3 6a3 3 0 0 0 6 0Z" />
    </svg>
  )
}

/** Paleta de pintor — filtro de cor. */
export function PaletteIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3a9 8.5 0 1 0 0 17c1.2 0 1.8-.7 1.8-1.6 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-.9.6-1.6 1.7-1.6H16a4 3.7 0 0 0 4-3.7C20 6.1 16.4 3 12 3Z" />
      <circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none" />
      <circle cx="9.5" cy="7.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="7" r="1" fill="currentColor" stroke="none" />
      <circle cx="17" cy="10.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Meteoro/cometa (rocha + rastro curvo) — filtro de meteorito. */
export function MeteoriteIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M16.3,15.7c0.2,0.2,0.5,0.3,0.7,0.3s0.5-0.1,0.7-0.3l11-11c0.4-0.4,0.4-1,0-1.4s-1-0.4-1.4,0l-11,11
        C15.9,14.7,15.9,15.3,16.3,15.7z"/>
      <path d="M6,21c0,2.8,2.2,5,5,5s5-2.2,5-5s-2.2-5-5-5S6,18.2,6,21z"/>
      <path d="M29.7,14.3c-0.4-0.4-1-0.4-1.4,0L16,25.9c-2.7,2.7-7.2,2.7-9.9,0c-2.7-2.7-2.7-7.2,0-9.9L18.7,4.7c0.4-0.4,0.4-1,0.1-1.4
        c-0.4-0.4-1-0.4-1.4-0.1L4.6,14.6c-3.5,3.5-3.5,9.2,0,12.7C6.4,29.1,8.7,30,11,30c2.3,0,4.6-0.9,6.3-2.6l12.3-11.7
        C30.1,15.3,30.1,14.7,29.7,14.3z"/>
    </svg>
  )
}

/** Diagrama de lapidação (facetas concêntricas com raios) — Biblioteca, tipo "Diagrama de Lapidação". */
export function FacetDiagramIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 3h12l4 6-10 13L2 9Z" />
      <path d="M11 3 8 9l4 13 4-13-3-6" />
      <path d="M2 9h20" />
    </svg>
  )
}

/** Concha de abalone/leque — filtro de fóssil/período. */
export function FossilIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M19.1029736,9.2393558 L19.5072416,9.38676028 C20.8012617,9.85731306 21.4688139,11.287782 20.9982611,12.5818022
        C20.8874215,12.8866113 20.7181722,13.1668648 20.5,13.4068542 L20.3362673,13.5869602 C18.7878409,15.2902293 16.9883338,16.7469929 15,17.9068542
        L12.0503871,19.6274618 C12.0192509,19.6456246 11.9807491,19.6456246 11.9496129,19.6274618 L9,17.9068542
        C7.01166619,16.7469929 5.21215913,15.2902293 3.66373272,13.5869602 L3.5,13.4068542
        C2.57378354,12.3880161 2.64886822,10.8112379 3.66770633,9.88502142 C3.90769576,9.6668492 4.18794928,9.49759997 4.49275841,9.38676028
        L4.89759122,9.23813236 M8.69408049,15.2487992 L5.4973666,10.9866764 C4.50325405,9.66119298 4.7718832,7.78078893 6.0973666,6.78667638
        C6.35532363,6.59320861 6.64278389,6.44259295 6.9486833,6.34062648 L7.5,6.15685425 C7.88099972,6.02985434 8.26603169,5.91941964 8.65404401,5.82555014
        L8.83624687,5.78266122 C8.50982528,6.38522784 8.41465234,7.10813745 8.61429512,7.80688716 L10.4532794,14.2438294
        M13.5462927,14.2436904 L15.3857049,7.80688716 C15.585236,7.10852825 15.4902811,6.38603646 15.1643006,5.78367235
        C15.6137746,5.88537675 16.0595813,6.01004801 16.5,6.15685425 L17.0513167,6.34062648 C18.6231467,6.8645698 19.4726266,8.56352972 18.9486833,10.1353597
        C18.8467168,10.4412591 18.6961012,10.7287193 18.5026334,10.9866764 L15.3053581,15.2483041
        M10.4532794,14.2438294 L8.61429512,7.80688716 C8.25810919,6.5602364 8.84034262,5.23668294 10,4.65685425
        C11.2590292,4.02733964 12.7409708,4.02733964 14,4.65685425 C15.1596574,5.23668294 15.7418908,6.5602364 15.3857049,7.80688716 L13.5462927,14.2436904" />
      <path d="M16.9997745,16.5937589 L17,18.5 C17,19.3284271 16.3284271,20 15.5,20 L8.5,20 C7.67157288,20 7,19.3284271 7,18.5
        L6.99904865,16.5928936 C7.64151174,17.0652931 8.30936513,17.5039839 9,17.9068542 L11.9496129,19.6274618
        C11.9807491,19.6456246 12.0192509,19.6456246 12.0503871,19.6274618 L15,17.9068542 C15.6902132,17.5042299 16.3576727,17.0658287 16.9997745,16.5937589 Z" />
    </svg>
  )
}

/** Cifrão dentro de um círculo — filtro/seção financeira. */
export function CurrencyCircleIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6.5v11" />
      <path d="M15 9.3c0-1.4-1.4-2.3-3-2.3s-3 .9-3 2.2c0 3 6 1.4 6 4.4 0 1.4-1.4 2.4-3 2.4s-3-1-3-2.4" />
    </svg>
  )
}

/** Seta curva para a esquerda — desfazer (Photo Studio). */
export function UndoIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  )
}

/** Seta curva para a direita — refazer (Photo Studio). */
export function RedoIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m15 14 5-5-5-5" />
      <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
    </svg>
  )
}

/** Girar 90° no sentido anti-horário (Photo Studio — geometria/endireitar). */
export function RotateLeftIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 12a9 9 0 1 0 2.64-6.36L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  )
}

/** Girar 90° no sentido horário (Photo Studio — geometria/endireitar). */
export function RotateRightIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M21 12a9 9 0 1 1-2.64-6.36L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  )
}

/** Espelhar na horizontal — dois colchetes com eixo pontilhado vertical no meio. */
export function FlipHorizontalIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3" />
      <path d="M16 3h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-3" />
      <path d="M12 2v2M12 8v2M12 14v2M12 20v2" />
    </svg>
  )
}

/** Espelhar na vertical — dois colchetes com eixo pontilhado horizontal no meio. */
export function FlipVerticalIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 8V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3" />
      <path d="M3 16v3a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3" />
      <path d="M2 12h2M8 12h2M14 12h2M20 12h2" />
    </svg>
  )
}

/** Régua/nível — endireitar por linha de referência (Photo Studio). */
export function StraightenIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2" y="9" width="20" height="6" rx="1" />
      <path d="M6 9v3M10 9v3M14 9v3M18 9v3" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Trapézio com cantos marcados — correção de perspectiva (Photo Studio). */
export function PerspectiveIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 6h13l3 12H7L4 6Z" />
      <circle cx="4" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17" cy="6" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="20" cy="18" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="7" cy="18" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Retângulo inclinado dentro de uma moldura, com 4 pontos — corrigir a perspectiva marcando um item (Photo Studio). */
export function ItemFixIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2" y="3" width="20" height="18" rx="2" strokeDasharray="2 2.5" />
      <path d="M8 8h8l1.5 8h-11L8 8Z" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="16" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="6.5" cy="16" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  )
}

/** Setas para fora nos dois eixos — esticar a imagem (Photo Studio). */
export function StretchIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 12h18M7 8l-4 4 4 4M17 8l4 4-4 4" />
      <path d="M12 3v5M12 16v5" strokeDasharray="1.5 2" />
    </svg>
  )
}

/** Borracha — apagar sobra de fundo no retoque manual do recorte (Photo Studio). */
export function EraseIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21" />
      <path d="M22 21H7" />
      <path d="m5 11 9 9" />
    </svg>
  )
}

/** Pincel de restaurar (círculo com +) — trazer de volta pedaço do objeto no retoque manual (Photo Studio). */
export function RestoreBrushIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  )
}

/** "B" de negrito — formatação de texto (notas, destaques, observações). */
export function BoldIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 4h7a3.5 3.5 0 0 1 0 7H6z" />
      <path d="M6 11h8a3.5 3.5 0 0 1 0 7H6z" />
    </svg>
  )
}

/** "I" de itálico — formatação de texto (notas, destaques, observações). */
export function ItalicIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M11 4h6M7 20h6M13 4 9.5 20" />
    </svg>
  )
}

/** Ponto de interrogação num círculo — páginas de pergunta do Saiba Mais. */
export function QuestionIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.8-.9 1.4v.3" />
      <path d="M12 17h.01" />
    </svg>
  )
}

/** Lâmpada — curiosidade / ideia (Saiba Mais). */
export function LightbulbIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 18h6M10 21h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1 2V16h5.2v-.2c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z" />
    </svg>
  )
}

/** Rocha (bloco irregular com camadas) — páginas sobre rochas. */
export function RockIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M3 17.5 5.5 9 10 5.5l5.5 1.5L20 11l1 6.5L15 20H7z" />
      <path d="M5 13.5c3 .8 5.5-.5 8-.2s4.5 1.4 7.6.7" />
      <path d="M10 5.5 9 10.5" />
    </svg>
  )
}

/** Vulcão — vulcanismo / rochas ígneas (Saiba Mais). */
export function VolcanoIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M2 20h20l-6.5-10h-7z" />
      <path d="M8.5 10 10 8h4l1.5 2" />
      <path d="M12 6V3M9 4.5 8 3M15 4.5 16 3" />
    </svg>
  )
}

/** "H" de título — barra de formatação do editor markdown. */
export function HeadingIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M6 5v14M16 5v14M6 12h10" />
      <path d="M19 19v-6l-1.5 1" />
    </svg>
  )
}

/** Lista com marcadores — barra de formatação do editor markdown. */
export function ListBulletIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M9 6h11M9 12h11M9 18h11" />
      <path d="M4.5 6h.01M4.5 12h.01M4.5 18h.01" strokeWidth={2.5} />
    </svg>
  )
}

/** Aspas — citação/destaque na barra do editor markdown. */
export function QuoteIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 4v16" />
      <path d="M9 8h10M9 12h10M9 16h6" />
    </svg>
  )
}

/** Cerquilha — citação de página (#slug) do Saiba Mais. */
export function HashIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M5 9h14M4 15h14M10 3 8 21M16 3l-2 18" />
    </svg>
  )
}

// ─── Ícones só da loja (não existem no catálogo pessoal) ───

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

export function CashIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M6 9v.01M18 15v.01" />
    </svg>
  )
}

export function HomeIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M4 11 12 4l8 7" />
      <path d="M6 9.5V20h12V9.5" />
      <path d="M10 20v-6h4v6" />
    </svg>
  )
}

export function JewelryIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M8 3h8l3 4-7 12L5 7l3-4Z" />
      <path d="M8 3 5 7h14L16 3M5 7l7 4 7-4M12 11 9 7M12 11l3-4" />
    </svg>
  )
}

export function PersonIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.6 4.3-5.5 7.5-5.5s6.1 1.9 7.5 5.5" />
    </svg>
  )
}

export function WarningIcon(props: IconProps) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5 2.5 20h19L12 3.5Z" />
      <path d="M12 10v4" />
      <path d="M12 17.5h.01" />
    </svg>
  )
}
