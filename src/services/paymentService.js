import { supabase } from '../lib/supabaseClient'
import { addTransaction } from './transactionService'
import { getBalance, updateBalance } from './balanceService'

// ─────────────────────────────────────────────
// CREAR PAGO
// → NO afecta balance
// → SÍ aparece en movimientos como "payment_scheduled"
// ─────────────────────────────────────────────
export async function createPayment(payment) {
  const { data, error } = await supabase
    .from('payment_schedule')
    .insert([payment])
    .select()

  if (error) return { success: false, error }

  const newPayment = data?.[0]

  // Registrar en movimientos sin afectar balance
 await addTransaction({
  user_id: payment.user_id,
  type: 'payment_scheduled',
  amount: Number(payment.amount || 0),
  description: payment.name,
  payment_id: newPayment.id,
  created_at: new Date().toISOString(),
})

  return { success: true, data: newPayment }
}

// ─────────────────────────────────────────────
// OBTENER PAGOS
// ─────────────────────────────────────────────
export async function getPayments(userId) {
  const { data, error } = await supabase
    .from('payment_schedule')
    .select('*')
    .eq('user_id', userId)
    .order('due_date', { ascending: true })

  if (error) return { success: false, error }
  return { success: true, data: data || [] }
}

// ─────────────────────────────────────────────
// ELIMINAR PAGO
// → Elimina también el movimiento "payment_scheduled" vinculado
// ─────────────────────────────────────────────
export async function deletePayment(id) {
  // 1. Eliminar movimiento vinculado si existe
  const { error: deleteTxError } = await supabase
  .from('transactions')
  .delete()
  .eq('payment_id', id)
  .eq('type', 'payment_scheduled')

if (deleteTxError) {
  console.error('Error eliminando transacción vinculada:', deleteTxError)
}

  // 2. Eliminar el pago
  const { error } = await supabase
    .from('payment_schedule')
    .delete()
    .eq('id', id)

  if (error) return { success: false, error }
  return { success: true }
}

// ─────────────────────────────────────────────
// EDITAR PAGO
// → Actualiza monto, fecha y/o descripción
// → Sincroniza el movimiento vinculado sin crear duplicados
// ─────────────────────────────────────────────
export async function updatePayment(id, updates) {
  const { data, error } = await supabase
    .from('payment_schedule')
    .update(updates)
    .eq('id', id)
    .select()

  if (error) return { success: false, error }

  // Sincronizar solo los campos que cambiaron en el movimiento vinculado
  const transactionUpdates = {}
  if (updates.amount !== undefined) {
    transactionUpdates.amount = Number(updates.amount)
  }
  if (updates.name !== undefined) {
    transactionUpdates.description = updates.name
  }

  if (Object.keys(transactionUpdates).length > 0) {
    await supabase
      .from('transactions')
      .update(transactionUpdates)
      .eq('payment_id', id)
      .eq('type', 'payment_scheduled')
  }

  return { success: true, data: data?.[0] }
}

// ─────────────────────────────────────────────
// MARCAR PAGO COMO PAGADO
// → Crea transacción tipo "expense" (afecta balance)
// → Elimina el movimiento "payment_scheduled" (evita duplicado)
// → Marca el pago como pagado en payment_schedule
// ─────────────────────────────────────────────
export async function markPaymentAsPaid({ id, source, userId }) {
  try {
    // 1. Obtener el pago
    const { data: payment, error: paymentError } = await supabase
      .from('payment_schedule')
      .select('*')
      .eq('id', id)
      .single()

    if (paymentError || !payment) {
      return { success: false, error: paymentError }
    }

    // 2. Obtener balance actual
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

    // 3. Registrar como gasto REAL (expense)
    const { error: txError } = await addTransaction({
      user_id: userId,
      type: 'expense',
      amount,
      description: payment.name,
      expense_group: 'fijo', // obligaciones siempre son fijas
      source,
    })

    if (txError) {
      return { success: false, error: txError }
    }

    // 4. Eliminar el movimiento "payment_scheduled" vinculado
    //    (ahora reemplazado por el expense real)
    await supabase
      .from('transactions')
      .delete()
      .eq('payment_id', id)
      .eq('type', 'payment_scheduled')

    // 5. Actualizar balance
    const updates =
      source === 'imprevistos'
        ? { saldo_imprevistos: Number(balance.saldo_imprevistos ?? 0) - amount }
        : { saldo_gastos: Number(balance.saldo_gastos ?? 0) - amount }

    const { error: updateError } = await updateBalance(userId, updates)

    if (updateError) {
      return { success: false, error: updateError }
    }

    // 6. Marcar pago como pagado
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
