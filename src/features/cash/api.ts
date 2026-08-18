import { supabase } from '../../lib/supabase'
import type { StoreCashEntry, StoreRecurringExpense, StoreRecurringExpenseInput } from '../../types/db'

export type { StoreRecurringExpenseInput }

export type StoreCashEntryInput = Pick<StoreCashEntry, 'kind' | 'amount'> &
  Partial<Omit<StoreCashEntry, 'id' | 'owner_id' | 'created_at' | 'kind' | 'amount'>>

export async function fetchCashEntries(): Promise<StoreCashEntry[]> {
  const { data, error } = await supabase
    .from('store_cash_entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createCashEntry(input: StoreCashEntryInput): Promise<StoreCashEntry> {
  const { data, error } = await supabase.from('store_cash_entries').insert(input).select().single()
  if (error) throw error
  return data
}

export async function deleteCashEntry(id: string): Promise<void> {
  const { error } = await supabase.from('store_cash_entries').delete().eq('id', id)
  if (error) throw error
}

// ─── Gastos recorrentes ──────────────────────────────────────

export async function fetchRecurringExpenses(): Promise<StoreRecurringExpense[]> {
  const { data, error } = await supabase.from('store_recurring_expenses').select('*').order('description')
  if (error) throw error
  return data
}

export async function createRecurringExpense(input: StoreRecurringExpenseInput): Promise<StoreRecurringExpense> {
  const { data, error } = await supabase.from('store_recurring_expenses').insert(input).select().single()
  if (error) throw error
  return data
}

export async function updateRecurringExpense(id: string, input: StoreRecurringExpenseInput): Promise<StoreRecurringExpense> {
  const { data, error } = await supabase.from('store_recurring_expenses').update(input).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteRecurringExpense(id: string): Promise<void> {
  const { error } = await supabase.from('store_recurring_expenses').delete().eq('id', id)
  if (error) throw error
}

/** Ids das definições já lançadas no mês corrente (`entry_date` dentro do
 *  mês) — decide se o botão da definição vira "Lançar" ou "Já lançado". */
export async function fetchLaunchedRecurringIdsThisMonth(): Promise<Set<string>> {
  const now = new Date()
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
  const { data, error } = await supabase
    .from('store_cash_entries')
    .select('recurring_expense_id')
    .not('recurring_expense_id', 'is', null)
    .gte('entry_date', monthStart)
  if (error) throw error
  return new Set((data ?? []).map((r) => r.recurring_expense_id as string))
}

/** Lança o valor do mês corrente pra uma definição — cria a linha normal em
 *  `store_cash_entries` (kind='out') vinculada de volta por
 *  `recurring_expense_id`. Não valida "já foi lançado" aqui (a tela já
 *  esconde o botão nesse caso); repetir cria um segundo lançamento, não
 *  substitui — é assim que o dono corrige um valor errado (apaga o de mais
 *  e lança de novo), já que não há edição de lançamento nesta versão. */
export async function launchRecurringExpense(expense: StoreRecurringExpense): Promise<StoreCashEntry> {
  const { data, error } = await supabase
    .from('store_cash_entries')
    .insert({
      kind: 'out',
      amount: expense.amount,
      description: expense.description,
      recurring_expense_id: expense.id,
    })
    .select()
    .single()
  if (error) throw error
  return data
}
