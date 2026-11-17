// Copiado do catálogo pessoal — tabela compartilhada.
import { supabase } from '../../lib/supabase'
import type { Carrier } from '../../types/db'

// Pool global de transportadoras, editável — mesmo padrão de gems/shapes.ts.

export async function fetchTransportadoras(): Promise<Carrier[]> {
  const { data, error } = await supabase.from('carriers').select('*').order('name')
  if (error) throw new Error(`Falha ao carregar transportadoras: ${error.message}`)
  return data as Carrier[]
}

export async function createTransportadora(name: string): Promise<Carrier> {
  const { data, error } = await supabase.from('carriers').insert({ name: name.trim() }).select('*').single()
  if (error) {
    if (error.message.includes('carriers_owner_id_name_key'))
      throw new Error('Essa transportadora já existe.')
    throw new Error(`Falha ao criar transportadora: ${error.message}`)
  }
  return data as Carrier
}

export async function renameTransportadora(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('carriers').update({ name: name.trim() }).eq('id', id)
  if (error) throw new Error(`Falha ao renomear transportadora: ${error.message}`)
}

export async function deleteTransportadora(id: string): Promise<void> {
  const { error } = await supabase.from('carriers').delete().eq('id', id)
  if (error) throw new Error(`Falha ao excluir transportadora: ${error.message}`)
}
