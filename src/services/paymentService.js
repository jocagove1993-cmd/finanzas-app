import { supabase } from '../lib/supabaseClient'
import { addTransaction } from './transactionService'
import { getBalance, updateBalance } from './balanceService'

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

// 🔥 AQUÍ ESTÁ LA MAGIA REAL
export async function markPaymentAsPaid({ id, source, userId }) {
  try {
    // 1. obtener el pago
    const { data: payment, error: paymentError } = await supabase
      .from('payment_schedule')
      .select('*')
      .eq('id', id)
      .single()

    if (paymentError || !payment) {
      return { success: false, error: paymentError }
    }

    // 2. obtener balance actual
    const { data: balance, error: balanceError } = await getBalance(userId)

    if (balanceError || !balance) {
      return { success: false, error: balanceError }
    }

    const amount = Number(payment.amount)

    const saldoDisponible =
      source === 'imprevistos'
        ? Number(balance.saldo_imprevistos ?? 0)
        : Number(balance.saldo_gastos ?? 0)

    if (amount > saldoDisponible) {
      return { success: false, error: { message: 'Saldo insuficiente.' } }
    }

    // 3. registrar como gasto REAL
    const { error: txError } = await addTransaction({
      user_id: userId,
      type: 'expense',
      amount,
      description: payment.name,
      expense_group: 'fijo', // 🔥 porque son obligaciones
      source,
    })

    if (txError) {
      return { success: false, error: txError }
    }

    // 4. actualizar balance
    const updates =
      source === 'imprevistos'
        ? { saldo_imprevistos: Number(balance.saldo_imprevistos ?? 0) - amount }
        : { saldo_gastos: Number(balance.saldo_gastos ?? 0) - amount }

    const { error: updateError } = await updateBalance(userId, updates)

    if (updateError) {
      return { success: false, error: updateError }
    }

    // 5. marcar pago como pagado
    const { error: updatePaymentError } = await supabase
      .from('payment_schedule')
      .update({
        status: 'paid',
        paid_from: source,
        paid_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (updatePaymentError) {
      return { success: false, error: updatePaymentError }
    }

    return { success: true }
  } catch (error) {
    console.error(error)
    return { success: false, error }
  }
}