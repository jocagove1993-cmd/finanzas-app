import { supabase } from '../lib/supabaseClient'

export async function addTransaction(transaction) {
  const cleanTransaction = {
    ...transaction,
    amount: Number(transaction.amount || 0),
    distribution_gastos: Number(transaction.distribution_gastos || 0),
    distribution_ahorro: Number(transaction.distribution_ahorro || 0),
    distribution_imprevistos: Number(transaction.distribution_imprevistos || 0),
    preset_gastos: Number(transaction.preset_gastos || 0),
    preset_ahorro: Number(transaction.preset_ahorro || 0),
    preset_imprevistos: Number(transaction.preset_imprevistos || 0),
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert([cleanTransaction])
    .select()

  return { data, error }
}

export async function getTransactions(userId) {
  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const normalizedData =
    data?.map((tx) => ({
      ...tx,
      amount: Number(tx.amount || 0),
      distribution_gastos: Number(tx.distribution_gastos || 0),
      distribution_ahorro: Number(tx.distribution_ahorro || 0),
      distribution_imprevistos: Number(tx.distribution_imprevistos || 0),
      preset_gastos: Number(tx.preset_gastos || 0),
      preset_ahorro: Number(tx.preset_ahorro || 0),
      preset_imprevistos: Number(tx.preset_imprevistos || 0),
    })) || []

  return { data: normalizedData, error }
}

export async function deleteTransaction(id) {
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)

  return { error }
}