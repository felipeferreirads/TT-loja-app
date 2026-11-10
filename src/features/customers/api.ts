import { supabase } from '../../lib/supabase'
import type { StoreCustomer, StoreCustomerDocType, StoreSupplier } from '../../types/db'

// Clientes vivem no cadastro COMPARTILHADO `suppliers` (loja 0033 + catálogo
// 0193), com o papel `is_customer = true`. A tela de clientes continua falando
// o formato `StoreCustomer` (doc_type/doc_number…); este módulo converte de e
// para as colunas de `suppliers` (tax_id_type/tax_id…). Ver
// docs/PLANO-CADASTRO-UNIFICADO.md no repo do catálogo.
//
// Excluir cliente NUNCA apaga um cadastro que outro papel ou o catálogo usa:
// nesse caso só tira o papel `is_customer`. Só um cliente "puro" (sem papel de
// fornecedor e fora da coleção) vai para a Lixeira (`deleted_at`) e é apagado.

export type StoreCustomerInput = Pick<StoreCustomer, 'name'> &
  Partial<Omit<StoreCustomer, 'id' | 'owner_id' | 'created_at' | 'name'>>

/** Linha de `suppliers` → formato que as telas de clientes já usam. */
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

/** Só as chaves presentes em `input` viram coluna — editar não zera campo que o formulário não conhece. */
function customerToColumns(input: Partial<StoreCustomerInput>): Record<string, unknown> {
  const cols: Record<string, unknown> = {}
  const copy = [
    'name', 'phone', 'email', 'notes',
    'address_zip', 'address_street', 'address_number', 'address_complement',
    'address_district', 'address_city', 'address_state',
  ] as const
  for (const k of copy) if (k in input) cols[k] = input[k]
  if ('doc_number' in input) cols.tax_id = input.doc_number
  if ('doc_type' in input) {
    cols.tax_id_type = input.doc_type
    // CNPJ = empresa, CPF = pessoa; sem documento, mantém o `kind` que já existe.
    if (input.doc_type === 'cnpj') cols.kind = 'company'
    else if (input.doc_type === 'cpf') cols.kind = 'person'
  }
  return cols
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

export async function fetchCustomer(id: string): Promise<StoreCustomer> {
  const { data, error } = await supabase.from('suppliers').select('*').eq('id', id).single()
  if (error) throw error
  return supplierToCustomer(data as StoreSupplier)
}

/**
 * Cria já como cliente. Se o cadastro compartilhado já tem alguém com o mesmo
 * nome (índice único por nome), reaproveita: liga `is_customer`, tira da
 * lixeira e completa só os campos vazios — nunca sobrescreve o que já existe.
 */
export async function createCustomer(input: StoreCustomerInput): Promise<StoreCustomer> {
  const cols = customerToColumns(input)
  const { data: existing } = await supabase
    .from('suppliers')
    .select('*')
    .ilike('name', input.name.trim().replace(/[\\%_]/g, '\\$&'))
    .maybeSingle()
  if (existing) {
    const fill: Record<string, unknown> = { is_customer: true, deleted_at: null }
    for (const [k, v] of Object.entries(cols)) {
      if (k === 'name' || k === 'kind') continue
      if (v != null && v !== '' && (existing as Record<string, unknown>)[k] == null) fill[k] = v
    }
    const { data, error } = await supabase.from('suppliers').update(fill).eq('id', existing.id).select().single()
    if (error) throw error
    return supplierToCustomer(data as StoreSupplier)
  }
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ kind: 'person', ...cols, is_supplier: false, is_customer: true, in_collection: false, in_store: true })
    .select()
    .single()
  if (error) throw error
  return supplierToCustomer(data as StoreSupplier)
}

export async function updateCustomer(id: string, input: StoreCustomerInput): Promise<StoreCustomer> {
  const { data, error } = await supabase.from('suppliers').update(customerToColumns(input)).eq('id', id).select().single()
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
