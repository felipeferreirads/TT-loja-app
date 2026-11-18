/**
 * Detecção de capacidade do dispositivo (não de tamanho de tela). Copiado do
 * catálogo pessoal (`src/lib/device.ts`), só a parte de toque.
 *
 * `(pointer: coarse) and (hover: none)` é o teste padrão de "aparelho tátil de
 * verdade": um notebook com tela sensível ao toque continua reportando
 * `pointer: fine` (o ponteiro PRIMÁRIO é o trackpad/mouse) e não entra aqui.
 * Um tablet passa do breakpoint `sm`, mas não tem mouse nem teclado — por isso
 * a planilha precisa de uma barra de ações própria.
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(pointer: coarse) and (hover: none)').matches ?? false
}
