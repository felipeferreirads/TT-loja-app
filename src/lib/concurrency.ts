// Pool de concorrência genérico: roda até `limit` chamadas de `worker` ao
// mesmo tempo sobre `items`, começando a próxima assim que uma termina — não
// um `Promise.all` em lotes fixos (que esperaria o lote inteiro terminar
// antes de começar o próximo). Falha de um item não cancela os demais; quem
// chama decide o que fazer com os resultados/erros de `worker`.
export async function runWithConcurrency<T>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return
  let next = 0
  const workerCount = Math.max(1, Math.min(limit, items.length))
  const runners = Array.from({ length: workerCount }, async () => {
    while (next < items.length) {
      const index = next++
      await worker(items[index], index)
    }
  })
  await Promise.all(runners)
}
