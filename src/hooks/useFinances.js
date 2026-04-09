import { useEffect, useState } from 'react'
import { getBalance } from '../services/balanceService'
import { getTransactions } from '../services/transactionService'
import { getFinancialStatus } from '../utils/financialRules'
import { supabase } from '../lib/supabaseClient'

export function useFinances(userId) {
  const [balance, setBalance] = useState({
    saldo_gastos: 0,
    saldo_ahorro: 0,
    saldo_imprevistos: 0,
  })

  const [monthly, setMonthly] = useState({
    gastado: 0,
    presupuesto: 0,
    abonos: 0, // ✅ NUEVO
    transactions: [],
  })

  const [status, setStatus] = useState('en-control')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    const loadData = async () => {
      setLoading(true)

      try {
        const [balanceRes, txRes, contributionsRes] = await Promise.all([
          getBalance(userId),
          getTransactions(userId),
          supabase
            .from('goal_contributions')
            .select('*')
            .eq('user_id', userId),
        ])

        if (balanceRes?.error) {
          console.error('Error balance:', balanceRes.error)
        }

        if (txRes?.error) {
          console.error('Error transactions:', txRes.error)
        }

        if (contributionsRes?.error) {
          console.error('Error contributions:', contributionsRes.error)
        }

        const balanceRow = balanceRes?.data ?? {
          saldo_gastos: 0,
          saldo_ahorro: 0,
          saldo_imprevistos: 0,
        }

        const allTransactions = Array.isArray(txRes?.data)
          ? txRes.data
          : []

        const allContributions = Array.isArray(contributionsRes?.data)
          ? contributionsRes.data
          : []

        // 📅 Filtro de mes
        const now = new Date()
        const currentMonth = now.getMonth()
        const currentYear = now.getFullYear()

        const isSameMonth = (dateString) => {
          if (!dateString) return false
          const d = new Date(dateString)
          if (isNaN(d)) return false
          return (
            d.getMonth() === currentMonth &&
            d.getFullYear() === currentYear
          )
        }

        const monthTransactions = allTransactions.filter((tx) =>
          isSameMonth(tx.created_at)
        )

        const monthContributions = allContributions.filter((c) =>
          isSameMonth(c.created_at)
        )

        // 💸 Gastos
        const gastado = monthTransactions
          .filter((tx) => tx.type === 'expense')
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)

        // 💰 Ingresos (nómina)
        const presupuesto = monthTransactions
          .filter((tx) => tx.type === 'income' && tx.income_type === 'nomina')
          .reduce((sum, tx) => sum + Number(tx.amount || 0), 0)

        // 🎯 NUEVO — Abonos a metas
        const abonos = monthContributions.reduce(
          (sum, c) => sum + Number(c.amount || 0),
          0
        )

        setBalance({
          saldo_gastos: Number(balanceRow.saldo_gastos || 0),
          saldo_ahorro: Number(balanceRow.saldo_ahorro || 0),
          saldo_imprevistos: Number(balanceRow.saldo_imprevistos || 0),
        })

        setMonthly({
          gastado,
          presupuesto,
          abonos, // ✅ NUEVO
          transactions: monthTransactions,
        })

        // ⚠️ Ajuste de status considerando abonos
        const gastoTotalReal = gastado + abonos

        setStatus(getFinancialStatus(gastoTotalReal, presupuesto))
      } catch (error) {
        console.error('Error general en useFinances:', error)

        setBalance({
          saldo_gastos: 0,
          saldo_ahorro: 0,
          saldo_imprevistos: 0,
        })

        setMonthly({
          gastado: 0,
          presupuesto: 0,
          abonos: 0,
          transactions: [],
        })

        setStatus('en-control')
      }

      setLoading(false)
    }

    loadData()
  }, [userId])

  return {
    balance,
    monthly,
    status,
    loading,
  }
}