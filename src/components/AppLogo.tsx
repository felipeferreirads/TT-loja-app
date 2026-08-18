// Mesma logo do Tesouros da Terra (catálogo pessoal) — a loja usa a marca
// idêntica, sem variante própria. O arquivo é branco e não dá pra repintar via
// variável CSS, então nos temas de fundo claro `.app-logo-themed` inverte
// (themes.css) — mesmo tratamento do app principal.
export function AppLogo({ size = 'md' }: { size?: 'md' | 'lg' }) {
  return (
    <img
      src="/logo.svg"
      alt="Tesouros da Terra"
      className={`app-logo-themed ${size === 'lg' ? 'mx-auto h-32' : 'h-9 sm:h-11'}`}
    />
  )
}
