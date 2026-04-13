import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getBalance, updateBalance } from '../services/balanceService'

export function useSavingsGoals(userId) {
  const [goals, setGoals] = useState([])
  const [contributions, setContributions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchGoals = useCallback(async () => {
    if (!userId) {
      setGoals([])
      setContributions([])
      setLoading(false)
      return
    }

    setLoading(true)

    try {
      const [goalsRes, contributionsRes] = await Promise.all([
        supabase
          .from('savings_goals')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),

        supabase
          .from('goal_contributions')
          .select(`
            *,
            savings_goals (
              id,
              name
            )
          `)
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),
      ])

      if (goalsRes.error) {
        console.error('Error cargando metas:', goalsRes.error)
      }

      if (contributionsRes.error) {
        console.error('Error cargando abonos:', contributionsRes.error)
      }

      const normalizedGoals = Array.isArray(goalsRes.data)
        ? goalsRes.data.map((goal) => ({
            ...goal,
            target_amount: Number(goal?.target_amount || 0),
            current_amount: Number(goal?.current_amount || 0),
          }))
        : []

      const normalizedContributions = Array.isArray(contributionsRes.data)
        ? contributionsRes.data.map((c) => ({
            ...c,
            amount: Number(c?.amount || 0),
          }))
        : []

      setGoals(normalizedGoals)
      setContributions(normalizedContributions)
    } catch (error) {
      console.error('Error general fetchGoals:', error)
      setGoals([])
      setContributions([])
    }

    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchGoals()
  }, [fetchGoals])

  const addGoal = async (payload) => {
    try {
      const safePayload = {
        ...payload,
        target_amount: Number(payload?.target_amount || 0),
        current_amount: Number(payload?.current_amount || 0),
      }

      const { data, error } = await supabase
        .from('savings_goals')
        .insert([safePayload])
        .select()

      if (error) {
        return { success: false, error }
      }

      await fetchGoals()
      return { success: true, data }
    } catch (error) {
      console.error('Error addGoal:', error)
      return { success: false, error }
    }
  }

  const addContribution = async ({ userId, goalId, amount, source }) => {
    try {
      const numericAmount = Number(amount || 0)

      if (!userId || !goalId || !numericAmount || numericAmount <= 0) {
        return {
          success: false,
          error: { message: 'Datos inválidos para registrar el abono.' },
        }
      }

      const { data: balance, error: balanceError } = await getBalance(userId)

      if (balanceError || !balance) {
        return {
          success: false,
          error: { message: 'No se pudo obtener el balance actual.' },
        }
      }

      const available =
        source === 'imprevistos'
          ? Number(balance.saldo_imprevistos ?? 0)
          : Number(balance.saldo_gastos ?? 0)

      if (numericAmount > available) {
        return {
          success: false,
          error: { message: 'No tienes saldo suficiente en esa billetera.' },
        }
      }

      const { data: goal, error: goalError } = await supabase
        .from('savings_goals')
        .select('*')
        .eq('id', goalId)
        .single()

      if (goalError || !goal) {
        return {
          success: false,
          error: { message: 'No se encontró la meta.' },
        }
      }

      const { error: contributionError } = await supabase
        .from('goal_contributions')
        .insert([
          {
            user_id: userId,
            goal_id: goalId,
            amount: numericAmount,
            source,
          },
        ])

      if (contributionError) {
        return { success: false, error: contributionError }
      }

      const newCurrentAmount = Number(goal.current_amount ?? 0) + numericAmount

      const { error: updateGoalError } = await supabase
        .from('savings_goals')
        .update({ current_amount: newCurrentAmount })
        .eq('id', goalId)

      if (updateGoalError) {
        return { success: false, error: updateGoalError }
      }

      const balanceUpdates =
        source === 'imprevistos'
          ? {
              saldo_imprevistos:
                Number(balance.saldo_imprevistos ?? 0) - numericAmount,
            }
          : {
              saldo_gastos: Number(balance.saldo_gastos ?? 0) - numericAmount,
            }

      const { error: updateBalanceError } = await updateBalance(userId, balanceUpdates)

      if (updateBalanceError) {
        return { success: false, error: updateBalanceError }
      }

      await fetchGoals()
      return { success: true }
    } catch (error) {
      console.error('Error addContribution:', error)
      return { success: false, error }
    }
  }

  const deleteGoal = async (goalId) => {
    try {
      if (!goalId || !userId) {
        return {
          success: false,
          error: { message: 'Faltan datos para eliminar la meta.' },
        }
      }

      const { data, error } = await supabase.rpc('delete_goal_and_restore_balance', {
        p_goal_id: goalId,
        p_user_id: userId,
      })

      if (error) {
        console.error('Error RPC deleteGoal:', error)
        return { success: false, error }
      }

      if (!data?.success) {
        return {
          success: false,
          error: { message: data?.message || 'No se pudo eliminar la meta.' },
        }
      }

      await fetchGoals()
      return { success: true, data }
    } catch (error) {
      console.error('Error deleteGoal:', error)
      return { success: false, error }
    }
  }

  return {
    goals,
    contributions,
    loading,
    refreshGoals: fetchGoals,
    addGoal,
    addContribution,
    deleteGoal,
  }
}
