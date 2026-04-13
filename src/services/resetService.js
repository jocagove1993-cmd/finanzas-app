import { supabase } from '../lib/supabaseClient'

export async function resetUserFinancialData(userId) {
  if (!userId) {
    return { error: { message: 'No se recibió userId' } }
  }

  try {
    // 1️⃣ Borrar abonos a metas (HIJOS)
    const { error: contributionsError } = await supabase
      .from('goal_contributions')
      .delete()
      .eq('user_id', userId)

    if (contributionsError) {
      return { error: contributionsError }
    }

    // 2️⃣ Borrar metas (PADRE)
    const { error: goalsError } = await supabase
      .from('savings_goals')
      .delete()
      .eq('user_id', userId)

    if (goalsError) {
      return { error: goalsError }
    }

    // 3️⃣ Borrar transacciones
    const { error: txError } = await supabase
      .from('transactions')
      .delete()
      .eq('user_id', userId)

    if (txError) {
      return { error: txError }
    }

    // 4️⃣ Borrar pagos agendados
    const { error: paymentsError } = await supabase
      .from('payment_schedule')
      .delete()
      .eq('user_id', userId)

    if (paymentsError) {
      return { error: paymentsError }
    }

    // 5️⃣ Resetear balances
    const { error: balanceError } = await supabase
      .from('balances')
      .update({
        saldo_gastos: 0,
        saldo_ahorro: 0,
        saldo_imprevistos: 0,
      })
      .eq('user_id', userId)

    if (balanceError) {
      return { error: balanceError }
    }

    return { error: null }

  } catch (err) {
    console.error(err)
    return { error: err }
  }
}
