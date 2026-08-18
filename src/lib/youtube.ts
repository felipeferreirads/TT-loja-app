// Copiado do catálogo pessoal (src/lib/youtube.ts) sem alteração — zero
// dependências de i18n/domínio, nada a simplificar (claude.md §2).
//
// Helpers puros para vídeos do YouTube vinculados ao produto (ver
// features/products/youtubeVideos.ts). Nunca injetar a URL crua num iframe:
// extrair sempre o videoId com parseYoutubeId antes (evita XSS via `src`) e
// montar a URL de embed/thumb só a partir do id validado.

// O videoId do YouTube tem sempre 11 caracteres [A-Za-z0-9_-].
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/

/**
 * Extrai e valida o videoId (11 chars) de um link/entrada do YouTube. Aceita os
 * formatos comuns — watch?v=, youtu.be/, /shorts/, /embed/, /v/ e /live/, com
 * ou sem parâmetros/protocolo — e também um id colado puro. Retorna null para
 * qualquer coisa inválida (link de outra plataforma, id de tamanho errado…).
 */
export function parseYoutubeId(input: string): string | null {
  const raw = input.trim()
  if (!raw) return null

  // Id puro colado direto (sem URL).
  if (YOUTUBE_ID.test(raw)) return raw

  let url: URL
  try {
    // Aceita link sem protocolo (ex.: "youtu.be/abc") prefixando https://.
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`)
  } catch {
    return null
  }

  const host = url.hostname.replace(/^www\./i, '').toLowerCase()
  const isYoutube = host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtube-nocookie.com'
  const isShort = host === 'youtu.be'
  if (!isYoutube && !isShort) return null

  // youtu.be/<id>: o id é o primeiro segmento do path.
  if (isShort) {
    const id = url.pathname.split('/').filter(Boolean)[0]
    return id && YOUTUBE_ID.test(id) ? id : null
  }

  // youtube.com/watch?v=<id>
  const v = url.searchParams.get('v')
  if (v && YOUTUBE_ID.test(v)) return v

  // youtube.com/shorts/<id>, /embed/<id>, /v/<id>, /live/<id>
  const segs = url.pathname.split('/').filter(Boolean)
  if (segs.length >= 2 && ['shorts', 'embed', 'v', 'live'].includes(segs[0].toLowerCase())) {
    return YOUTUBE_ID.test(segs[1]) ? segs[1] : null
  }

  return null
}

/** URL da miniatura do vídeo (depende de rede — não é cacheada offline). */
export function youtubeThumb(id: string): string {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
}

/** URL de embed do player, usando youtube-nocookie.com (menos rastreamento). */
export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}`
}

/** URL "assistir no YouTube" (link externo). */
export function youtubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`
}
