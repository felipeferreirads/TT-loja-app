// Lixeira (0027) — porta do mecanismo de `src/features/trash/api.ts` do
// catálogo pessoal: mesma retenção de 15 dias, mesmo purge best-effort sem
// cron (roda ao abrir a tela). Aqui só Produtos e Clientes têm soft delete
// (ver claude.md §"Escopo da Lixeira"), então não há abas por entidade além
// dessas duas.

import {
  fetchDeletedProducts,
  restoreProduct,
  permanentlyDeleteProduct,
} from '../products/api'
import {
  fetchDeletedCustomers,
  restoreCustomer,
  permanentlyDeleteCustomer,
} from '../customers/api'

export const TRASH_RETENTION_DAYS = 15

export function daysUntilPurge(deletedAt: string): number {
  const deletedMs = new Date(deletedAt).getTime()
  const purgeMs = deletedMs + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000
  return Math.max(0, Math.ceil((purgeMs - Date.now()) / (24 * 60 * 60 * 1000)))
}

export function isExpired(deletedAt: string): boolean {
  return daysUntilPurge(deletedAt) <= 0 && Date.now() > new Date(deletedAt).getTime() + TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000
}

/** Apaga em definitivo tudo que já passou dos 15 dias — best-effort, uma
 *  falha isolada não impede o purge do resto. Chamado ao montar `TrashPage`. */
export async function purgeExpiredTrash(): Promise<void> {
  const [products, customers] = await Promise.all([fetchDeletedProducts(), fetchDeletedCustomers()])
  const expiredProducts = products.filter((p) => p.deleted_at && isExpired(p.deleted_at))
  const expiredCustomers = customers.filter((c) => c.deleted_at && isExpired(c.deleted_at))
  await Promise.all([
    ...expiredProducts.map((p) => permanentlyDeleteProduct(p.id).catch(() => {})),
    ...expiredCustomers.map((c) => permanentlyDeleteCustomer(c.id).catch(() => {})),
  ])
}

export { fetchDeletedProducts, restoreProduct, permanentlyDeleteProduct, fetchDeletedCustomers, restoreCustomer, permanentlyDeleteCustomer }
