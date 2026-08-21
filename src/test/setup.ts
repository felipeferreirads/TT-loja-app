// Setup do Vitest (`setupFiles` em vitest.config.ts) — roda ANTES de cada
// arquivo de teste. Copiado do catálogo pessoal (`src/test/setup.ts`): mesmo
// motivo, `src/lib/supabase.ts` cria o cliente no escopo do módulo e o
// adapter de storage do auth chama `sessionStorage`/`localStorage`, que não
// existem no Node puro do Vitest.

/** Web Storage em memória, o suficiente para o adapter de auth do supabase-js. */
class MemoryStorage implements Storage {
  [name: string]: unknown

  private readonly map = new Map<string, string>()

  get length(): number {
    return this.map.size
  }

  key(index: number): string | null {
    return [...this.map.keys()][index] ?? null
  }

  getItem(key: string): string | null {
    return this.map.get(String(key)) ?? null
  }

  setItem(key: string, value: string): void {
    this.map.set(String(key), String(value))
  }

  removeItem(key: string): void {
    this.map.delete(String(key))
  }

  clear(): void {
    this.map.clear()
  }
}

for (const nome of ['localStorage', 'sessionStorage'] as const) {
  if (typeof globalThis[nome] === 'undefined') {
    Object.defineProperty(globalThis, nome, {
      value: new MemoryStorage(),
      configurable: true,
      writable: true,
    })
  }
}
