import { supabase } from '../lib/supabaseClient'

export async function createPayment(payment) {
  const { data, error } = await supabase
    .from('payment_schedule')
    .insert([payment])
    .select()

  if (error) return { success: false, error }
  return { success: true, data: data?.[0] }
}

export async function getPayments(userId) {
  const { data, error } = await supabase
    .from('payment_schedule')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true })

  if (error) return { success: false, error }
  return { success: true, data: data || [] }
}

export async function markPaymentAsPaid({ id, source }) {
  const { data, error } = await supabase
    .from('payment_schedule')
    .update({
      status: 'paid',
      paid_from: source,
      paid_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()

  if (error) return { success: false, error }
  return { success: true, data: data?.[0] }
}