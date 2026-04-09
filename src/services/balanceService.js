import { supabase } from '../lib/supabaseClient'

export async function getBalance(userId) {
  if (!userId) {
    return { data: null, error: { message: 'No userId' } }
  }

  // 1. Intentar obtener balance
  const { data, error } = await supabase
    .from('balances')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) {
    return { data: null, error }
  }

  // 2. Si NO existe → crear automáticamente
  if (!data) {
    const { data: newBalance, error: insertError } = await supabase
      .from('balances')
      .insert([
        {
          user_id: userId,
          saldo_gastos: 0,
          saldo_ahorro: 0,
          saldo_imprevistos: 0,
        },
      ])
      .select()
      .single()

    if (insertError) {
      return { data: null, error: insertError }
    }

    return { data: newBalance, error: null }
  }

  return { data, error: null }
}

export async function updateBalance(userId, updates) {
  const { error } = await supabase
    .from('balances')
    .update(updates)
    .eq('user_id', userId)

  return { error }
}