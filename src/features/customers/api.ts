import { supabase } from '../../lib/supabase'
import type { StoreCustomer, StoreCustomerDocType, StoreSupplier } from '../../types/db'
import type { StoreSupplierInput } from '../suppliers/api'

// Clientes vivem no cadastro COMPARTILHADO `suppliers` (loja 0033 + catálogo
// 0193), com o papel `is_customer = true`. O formulário é o mesmo do
// fornecedor (`SupplierFormDialog` com `role="customer"`: vários telefones e
// e-mails, PF/PJ, país, site). Listas, recibo e lixeira continuam lendo o
// formato resumido `StoreCustomer`, convertido por `supplierToCustomer`. Ver
// docs/PLANO-CADASTRO-UNIFICADO.md no repo do catálogo.
//
// Excluir cliente NUNCA apaga um cadastro que outro papel ou o catálogo usa:
// nesse caso só tira o papel `is_customer`. Só um cliente "puro" (sem papel de
// fornecedor e fora da coleção) vai para a Lixeira (`deleted_at`) e é apagado.

/** Linha de `suppliers` → formato resumido usado em listas, recibo e lixeira. */
export function supplierToCustomer(s: StoreSupplier): StoreCustomer {
  const docType: StoreCustomerDocType | null =
    s.tax_id_type === 'cpf' || s.tax_id_type === 'cnpj' ? s.tax_id_type : null
  return {
    id: s.id,
    owner_id: s.owner_id,
    name: s.name,
    phone: s.phone,
    email: s.email,
    notes: s.notes,
    doc_type: docType,
    doc_number: s.tax_id,
    address_zip: s.address_zip,
    address_street: s.address_street,
    address_number: s.address_number,
    address_complement: s.address_complement,
    address_district: s.address_district,
    address_city: s.address_city,
    address_state: s.address_state,
    created_at: s.created_at,
    deleted_at: s.deleted_at,
  }
}

export async function fetchCustomers(): Promise<StoreCustomer[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_customer', true)
    .is('deleted_at', null)
    .order('name')
  if (error) throw error
  return (data as StoreSupplier[]).map(supplierToCustomer)
}

/** Cadastro completo do cliente (telefones e e-mails extras, país, site…), para a ficha e o formulário. */
export async function fetchCustomerRecord(id: string): Promise<StoreSupplier> {
  const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single()
  if (error) throw error
  return data as StoreSupplier
}

const isEmpty = (v: unknown) => v == null || v === '' || (Array.isArray(v) && v.length === 0)

/**
 * Cria já como cliente. Se o cadastro compartilhado já tem alguém com o mesmo
 * nome (índice único por nome), reaproveita: liga `is_customer`, tira da
 * lixeira e completa só os campos vazios — nunca sobrescreve o que já existe.
 */
export async function createCustomer(input: StoreSupplierInput): Promise<StoreCustomer> {
  const { data: existing } = await supabase
    .from('suppliers')
    .select('*')
    .ilike('name', input.name.trim().replace(/[\\%_]/g, '\\$&'))
    .maybeSingle()
  if (existing) {
    const fill: Record<string, unknown> = { is_customer: true, deleted_at: null }
    for (const [k, v] of Object.entries(input)) {
      if (k === 'name' || k === 'kind') continue
      if (!isEmpty(v) && isEmpty((existing as Record<string, unknown>)[k])) fill[k] = v
    }
    const { data, error } = await supabase.from('suppliers').update(fill).eq('id', existing.id).select().single()
    if (error) throw error
    return supplierToCustomer(data as StoreSupplier)
  }
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ ...input, is_supplier: false, is_customer: true, in_collection: false, in_store: true })
    .select()
    .single()
  if (error) throw error
  return supplierToCustomer(data as StoreSupplier)
}

export async function updateCustomer(id: string, input: Partial<StoreSupplierInput>): Promise<StoreCustomer> {
  const { data, error } = await supabase.from('suppliers').update(input).eq('id', id).select().single()
  if (error) throw error
  return supplierToCustomer(data as StoreSupplier)
}

// ─── Lixeira (0027) ─────────────────────────────────────────
// Mesmo padrão de `features/products/api.ts`: exclusão vira soft delete
// (`deleted_at`), reversível por `TRASH_RETENTION_DAYS` dias — ver
// `features/trash/api.ts`. `deleted_at` é uma coluna COMPARTILHADA com a
// lixeira de fornecedores do catálogo (0180), por isso só um cliente puro usa.

/** O cadastro também é fornecedor ou item da coleção? Então não pode ir para a lixeira. */
async function isUsedElsewhere(id: string): Promise<boolean> {
  const { data, error } = await supabase.from('suppliers').select('is_supplier, in_collection').eq('id', id).single()
  if (error) throw error
  return data.is_supplier || data.in_collection
}

export async function deleteCustomer(id: string): Promise<void> {
  const patch = (await isUsedElsewhere(id)) ? { is_customer: false } : { deleted_at: new Date().toISOString() }
  const { error } = await supabase.from('suppliers').update(patch).eq('id', id)
  if (error) throw error
}

export async function restoreCustomer(id: string): Promise<void> {
  const { error } = await supabase.from('suppliers').update({ deleted_at: null }).eq('id', id)
  if (error) throw error
}

export async function permanentlyDeleteCustomer(id: string): Promise<void> {
  // Se, depois de ir para a lixeira, o cadastro ganhou outro papel, só sai da lixeira sem o papel de cliente.
  const { error } = (await isUsedElsewhere(id))
    ? await supabase.from('suppliers').update({ is_customer: false, deleted_at: null }).eq('id', id)
    : await supabase.from('suppliers').delete().eq('id', id)
  if (error) throw error
}

/** Clientes puros na lixeira — cadastros com outro papel nunca entram aqui. */
export async function fetchDeletedCustomers(): Promise<StoreCustomer[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_customer', true)
    .eq('is_supplier', false)
    .eq('in_collection', false)
    .not('deleted_at', 'is', null)
    .order('deleted_at', { ascending: false })
  if (error) throw error
  return (data as StoreSupplier[]).map(supplierToCustomer)
}
