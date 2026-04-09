import { useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useFinances } from '../hooks/useFinances'
import { useSavingsGoals } from '../hooks/useSavingsGoals'
import { formatCOP } from '../utils/formatCurrency'
import { deleteTransaction } from '../services/transactionService'
import { getBalance, updateBalance } from '../services/balanceService'
import { supabase } from '../lib/supabaseClient'

function getItemTypeLabel(type) {
  if (type === 'income') return 'Ingreso'
  if (type === 'expense') return 'Gasto'
  if (type === 'goal') return 'Meta'
  if (type === 'contribution') return 'Abono'
  return 'Movimiento'
}

function getItemTypeClass(type) {
  if (type === 'income') return 'badge--positive'
  if (type === 'expense') return 'badge--negative'
  if (type === 'goal') return 'badge--accent'
  if (type === 'contribution') return 'badge--warning'
  return 'badge--accent'
}

function getItemIcon(type) {
  if (type === 'income') return '💰'
  if (type === 'expense') return '💸'
  if (type === 'goal') return '🎯'
  if (type === 'contribution') return '📥'
  return '•'
}

function getItemIconClass(type) {
  if (type === 'income') return 'transaction-icon--income'
  if (type === 'expense') return 'transaction-icon--expense'
  if (type === 'goal') return 'transaction-icon--goal'
  if (type === 'contribution') return 'transaction-icon--contribution'
  return 'transaction-icon--goal'
}

// ✅ Parseo robusto para ordenar bien
function safeTimestamp(dateValue) {
  if (!dateValue) return 0

  const parsed = new Date(dateValue).getTime()

  if (Number.isNaN(parsed)) return 0

  return parsed
}

// ✅ Formateo seguro para mostrar bien
function formatSafeDate(dateValue) {
  if (!dateValue) return 'Sin fecha'

  const parsed = new Date(dateValue)

  if (Number.isNaN(parsed.getTime())) return 'Sin fecha'

  return parsed.toLocaleString('es-CO')
}

export default function History() {
  const { user } = useAuth()
  const { monthly, refreshMonthly } = useFinances(user?.id)
  const { goals, contributions, refreshGoals } = useSavingsGoals(user?.id)

  const [filter, setFilter] = useState('all')
  const [deletingId, setDeletingId] = useState(null)

  const transactions = monthly?.transactions || []

  const goalsAsHistory = useMemo(
    () =>
      (goals || []).map((goal) => ({
        id: goal.id,
        type: 'goal',
        description: `Meta creada: ${goal.name}`,
        amount: Number(goal.target_amount || 0),
        created_at: goal.created_at || null,
        timestamp: safeTimestamp(goal.created_at),
        raw: goal,
      })),
    [goals]
  )

  const contributionsAsHistory = useMemo(
    () =>
      (contributions || []).map((c) => ({
        id: c.id,
        type: 'contribution',
        description: `Abono a meta: ${c.savings_goals?.name || ''}`,
        amount: Number(c.amount || 0),
        created_at: c.created_at || null,
        timestamp: safeTimestamp(c.created_at),
        raw: c,
      })),
    [contributions]
  )

  const transactionsAsHistory = useMemo(
    () =>
      (transactions || []).map((tx) => ({
        ...tx,
        amount: Number(tx.amount || 0),
        created_at: tx.created_at || null,
        timestamp: safeTimestamp(tx.created_at),
        raw: tx,
      })),
    [transactions]
  )

  const allItems = useMemo(() => {
    return [
      ...transactionsAsHistory,
      ...goalsAsHistory,
      ...contributionsAsHistory,
    ].sort((a, b) => b.timestamp - a.timestamp)
  }, [transactionsAsHistory, goalsAsHistory, contributionsAsHistory])

  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      if (filter === 'all') return true
      return item.type === filter
    })
  }, [allItems, filter])

  const refreshEverything = async () => {
    await Promise.all([refreshMonthly?.(), refreshGoals?.()])
  }

  const handleDelete = async (item) => {
    const confirmDelete = window.confirm(
      `¿Eliminar este ${getItemTypeLabel(item.type).toLowerCase()}?`
    )
    if (!confirmDelete) return

    if (!user?.id) {
      alert('No se encontró el usuario actual.')
      return
    }

    try {
      setDeletingId(`${item.type}-${item.id}`)

      const { data: balance, error: balanceError } = await getBalance(user.id)

      if (balanceError || !balance) {
        alert('No se pudo obtener el balance actual.')
        return
      }

      if (item.type === 'income') {
        const tx = item.raw
        const amount = Number(tx.amount || 0)
        const incomeType = tx.income_type || 'adicional'

        let updates = {}

        if (incomeType === 'nomina') {
          const distributionGastos = Number(tx.distribution_gastos || 0)
          const distributionAhorro = Number(tx.distribution_ahorro || 0)
          const distributionImprevistos = Number(tx.distribution_imprevistos || 0)

          updates = {
            saldo_gastos: Number(balance.saldo_gastos ?? 0) - distributionGastos,
            saldo_ahorro: Number(balance.saldo_ahorro ?? 0) - distributionAhorro,
            saldo_imprevistos:
              Number(balance.saldo_imprevistos ?? 0) - distributionImprevistos,
          }
        } else {
          updates = {
            saldo_gastos: Number(balance.saldo_gastos ?? 0) - amount,
          }
        }

        const { error: updateError } = await updateBalance(user.id, updates)

        if (updateError) {
          console.error(updateError)
          alert('No se pudo reajustar el balance.')
          return
        }

        const { error } = await deleteTransaction(item.id)

        if (error) {
          console.error(error)
          alert('Ocurrió un error al eliminar el ingreso.')
          return
        }

        await refreshEverything()
        return
      }

      if (item.type === 'expense') {
        const tx = item.raw
        const amount = Number(tx.amount || 0)
        const source = tx.source || 'gastos'

        const updates =
          source === 'imprevistos'
            ? {
                saldo_imprevistos: Number(balance.saldo_imprevistos ?? 0) + amount,
              }
            : {
                saldo_gastos: Number(balance.saldo_gastos ?? 0) + amount,
              }

        const { error: updateError } = await updateBalance(user.id, updates)

        if (updateError) {
          console.error(updateError)
          alert('No se pudo reajustar el balance.')
          return
        }

        const { error } = await deleteTransaction(item.id)

        if (error) {
          console.error(error)
          alert('Ocurrió un error al eliminar el gasto.')
          return
        }

        await refreshEverything()
        return
      }

      if (item.type === 'goal') {
        const goalId = item.id

        const { error: rpcError } = await supabase.rpc(
          'delete_goal_and_restore_balance',
          {
            p_goal_id: goalId,
            p_user_id: user.id,
          }
        )

        if (rpcError) {
          console.error(rpcError)
          alert('No se pudo eliminar la meta correctamente.')
          return
        }

        await refreshEverything()
        return
      }

      if (item.type === 'contribution') {
        const contribution = item.raw
        const amount = Number(contribution.amount || 0)
        const source = contribution.source || 'gastos'
        const goalId = contribution.goal_id

        const updates =
          source === 'imprevistos'
            ? {
                saldo_imprevistos: Number(balance.saldo_imprevistos ?? 0) + amount,
              }
            : {
                saldo_gastos: Number(balance.saldo_gastos ?? 0) + amount,
              }

        const { error: updateError } = await updateBalance(user.id, updates)

        if (updateError) {
          console.error(updateError)
          alert('No se pudo reajustar el saldo.')
          return
        }

        const { data: goal, error: goalError } = await supabase
          .from('savings_goals')
          .select('*')
          .eq('id', goalId)
          .single()

        if (goalError || !goal) {
          console.error(goalError)
          alert('No se pudo encontrar la meta asociada.')
          return
        }

        const newCurrentAmount = Math.max(
          Number(goal.current_amount || 0) - amount,
          0
        )

        const { error: updateGoalError } = await supabase
          .from('savings_goals')
          .update({
            current_amount: newCurrentAmount,
          })
          .eq('id', goalId)

        if (updateGoalError) {
          console.error(updateGoalError)
          alert('No se pudo reajustar la meta.')
          return
        }

        const { error: deleteContributionError } = await supabase
          .from('goal_contributions')
          .delete()
          .eq('id', item.id)

        if (deleteContributionError) {
          console.error(deleteContributionError)
          alert('No se pudo eliminar el abono.')
          return
        }

        await refreshEverything()
        return
      }
    } catch (error) {
      console.error('ERROR GENERAL ELIMINANDO:', error)
      alert('Ocurrió un error al eliminar.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="page history-shell">
      <div className="page-header">
        <span className="page-kicker">Trazabilidad financiera</span>
        <h1 className="page-title">Historial</h1>
        <p className="page-subtitle">
          Revisa todos tus movimientos en orden cronológico y mantén control total.
        </p>
      </div>

      <div className="history-toolbar">
        <div className="history-toolbar-copy">
          <h3>Movimientos registrados</h3>
          <p className="page-subtitle">
            Aquí verás ingresos, gastos, metas y abonos en orden de llegada.
          </p>
        </div>

        <div className="history-filters">
          <div className="toggle-group">
            <button
              className={`toggle-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Todo
            </button>
            <button
              className={`toggle-btn ${filter === 'income' ? 'active' : ''}`}
              onClick={() => setFilter('income')}
            >
              Ingresos
            </button>
            <button
              className={`toggle-btn ${filter === 'expense' ? 'active' : ''}`}
              onClick={() => setFilter('expense')}
            >
              Gastos
            </button>
            <button
              className={`toggle-btn ${filter === 'goal' ? 'active' : ''}`}
              onClick={() => setFilter('goal')}
            >
              Metas
            </button>
            <button
              className={`toggle-btn ${filter === 'contribution' ? 'active' : ''}`}
              onClick={() => setFilter('contribution')}
            >
              Abonos
            </button>
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="card db-empty-state">
          <p>No hay movimientos para mostrar con este filtro.</p>
        </div>
      ) : (
        <div className="history-list">
          {filteredItems.map((item) => {
            const itemKey = `${item.type}-${item.id}`
            const isDeleting = deletingId === itemKey

            return (
              <div key={itemKey} className="history-item">
                <div className="history-item-left">
                  <div className={`transaction-icon ${getItemIconClass(item.type)}`}>
                    {getItemIcon(item.type)}
                  </div>

                  <div className="history-item-copy">
                    <div className="history-item-top">
                      <span className={`badge ${getItemTypeClass(item.type)}`}>
                        {getItemTypeLabel(item.type)}
                      </span>
                    </div>

                    <p className="history-item-title">{item.description}</p>
                    <span className="history-item-date">
                      {formatSafeDate(item.created_at)}
                    </span>
                  </div>
                </div>

                <div className="history-item-right">
                  <div
                    className={`amount amount--medium ${
                      item.type === 'income'
                        ? 'amount--positive'
                        : item.type === 'expense'
                        ? 'amount--negative'
                        : ''
                    }`}
                  >
                    {item.type === 'income'
                      ? `+${formatCOP(item.amount)}`
                      : item.type === 'expense'
                      ? `-${formatCOP(item.amount)}`
                      : formatCOP(item.amount)}
                  </div>

                  <button
                    className="btn-delete"
                    onClick={() => handleDelete(item)}
                    disabled={isDeleting}
                    title="Eliminar"
                  >
                    {isDeleting ? '...' : '🗑️'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}