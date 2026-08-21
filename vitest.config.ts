import { defineConfig } from 'vitest/config'

// Config PRÓPRIA do Vitest, separada de `vite.config.ts` de propósito — mesmo
// motivo do catálogo pessoal (ver o arquivo homônimo lá): os testes de hoje
// são todos lógica pura (`lots.test.ts`), sem precisar de nada do build
// (react/tailwind) carregado via vite.config.ts.
export default defineConfig({
  test: {
    setupFiles: ['./src/test/setup.ts'],
  },
})
