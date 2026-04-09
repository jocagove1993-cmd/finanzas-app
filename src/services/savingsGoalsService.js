import { supabase } from '../lib/supabaseClient'

export async function getSavingsGoals(userId) {
  const { data, error } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}

export async function createSavingsGoal(goalData) {
  const cleanGoal = {
    ...goalData,
    target_amount: Number(goalData.target_amount || 0),
    current_amount: Number(goalData.current_amount || 0),
  }

  const { data, error } = await supabase
    .from('savings_goals')
    .insert([cleanGoal])
    .select()

  if (error) throw error
  return data?.[0]
}

export async function contributeToGoal({ userId, goalId, amount }) {
  const contributionAmount = Number(amount || 0)

  if (!contributionAmount || contributionAmount <= 0) {
    throw new Error('Monto inválido')
  }

  // ✅ 1. Obtener balance (CORREGIDO: balances)
  const { data: balanceData, error: balanceError } = await supabase
    .from('balances')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (balanceError) throw balanceError

  const saldoActual = Number(balanceData?.saldo_gastos || 0)

  if (contributionAmount > saldoActual) {
    throw new Error('No tienes saldo suficiente para abonar a esta meta.')
  }

  // 2. Obtener meta
  const { data: goalData, error: goalError } = await supabase
    .from('savings_goals')
    .select('*')
    .eq('id', goalId)
    .single()

  if (goalError) throw goalError

  const nuevoSaldoDisponible = saldoActual - contributionAmount
  const nuevoMontoMeta = Number(goalData.current_amount || 0) + contributionAmount

  // ✅ 3. Actualizar balance (CORREGIDO: balances)
  const { error: updateBalanceError } = await supabase
    .from('balances')
    .update({ saldo_gastos: nuevoSaldoDisponible })
    .eq('user_id', userId)

  if (updateBalanceError) throw updateBalanceError

  // 4. Actualizar meta
  const { error: updateGoalError } = await supabase
    .from('savings_goals')
    .update({ current_amount: nuevoMontoMeta })
    .eq('id', goalId)

  if (updateGoalError) throw updateGoalError

  // 5. Registrar contribución
  const { data, error } = await supabase
    .from('goal_contributions')
    .insert([
      {
        user_id: userId,
        goal_id: goalId,
        amount: contributionAmount,
      },
    ])
    .select()

  if (error) throw error

  return data?.[0]
}

export async function getGoalContributions(userId) {
  const { data, error } = await supabase
    .from('goal_contributions')
    .select(`
      *,
      savings_goals (
        name,
        icon
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}