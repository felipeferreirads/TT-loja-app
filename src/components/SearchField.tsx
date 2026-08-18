import { useEffect, useRef, useState } from 'react'

/**
 * Campo de busca. Copiado do catálogo pessoal — existe como componente PRÓPRIO
 * por um motivo de desempenho, não de organização.
 *
 * O termo de busca mora na query string (para sobreviver ao desmontar da página
 * e ao botão "voltar"), e antes o `<input>` era controlado direto por ela:
 * `value={browser.search}` + `setSearchParams` a cada tecla. Isso fazia cada
 * caractere digitado disparar uma navegação do React Router e re-renderizar a
 * árvore inteira da rota — dezenas de cards não memoizados, cada um com uma
 * query de URL assinada, mais 3 virtualizadores. O texto na tela só aparecia
 * DEPOIS desse render, e como o `q` divide o mesmo estado (a location) com os
 * filtros — que são escritos dentro de `startTransition` —, um render de
 * transição pendente podia comitar a location com o `q` ANTIGO e reverter o
 * caractere recém-digitado. Era esse o sintoma de "a letra vai e é apagada".
 *
 * Aqui o texto é estado LOCAL deste componente: digitar re-renderiza só o
 * próprio input, nunca a coleção. O valor é propagado (`onCommit`) depois de
 * uma pausa (`SEARCH_DEBOUNCE_MS`), ou imediatamente no Enter/ao sair do campo
 * — sem isso, clicar num item logo após digitar perderia o termo da URL.
 *
 * Medido antes de mexer: filtrar/ordenar/pontuar 2.000 espécimes custa ~1,2 ms
 * por tecla (5.000 → ~2,9 ms). O gargalo nunca foi a busca em si.
 */
const SEARCH_DEBOUNCE_MS = 250

interface Props {
  /** Valor já confirmado (o da query string). */
  value: string
  onCommit: (value: string) => void
  placeholder: string
  className?: string
}

export function SearchField({ value, onCommit, placeholder, className = '' }: Props) {
  const [text, setText] = useState(value)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** true entre a tecla e a confirmação — nossa escrita ainda não chegou na URL. */
  const pending = useRef(false)

  // O valor mudou POR FORA (voltar/avançar do navegador, link com ?q=): adota.
  // Ignorado enquanto há escrita nossa em trânsito, senão o valor antigo da URL
  // sobrescreveria o que está sendo digitado agora.
  useEffect(() => {
    if (pending.current) return
    setText(value)
  }, [value])

  // Timer pendente não pode sobreviver ao desmontar (evita confirmar a busca
  // de uma tela que já saiu).
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current)
  }, [])

  const commit = (next: string) => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
    pending.current = false
    onCommit(next)
  }

  const change = (next: string) => {
    setText(next)
    pending.current = true
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      timer.current = null
      commit(next)
    }, SEARCH_DEBOUNCE_MS)
  }

  return (
    <input
      type="search"
      placeholder={placeholder}
      value={text}
      onChange={(e) => change(e.target.value)}
      // Enter e sair do campo confirmam na hora: quem digita e clica num item
      // dentro dos 250ms não perde o termo (o blur acontece antes do clique).
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          if (pending.current) commit(text)
        }
      }}
      onBlur={() => {
        if (pending.current) commit(text)
      }}
      className={`input ${className}`}
    />
  )
}
