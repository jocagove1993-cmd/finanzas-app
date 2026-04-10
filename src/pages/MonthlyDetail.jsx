import { useEffect, useState } from 'react'
import { getTransactions } from '../services/transactionService'
import { useAuth } from '../hooks/useAuth'
import { formatCOP } from '../utils/formatCurrency'

export default function MonthlyDetail({ month, year, onBack }) {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user?.id) return

    const load = async () => {
      setLoading(true)

      const { data, error } = await getTransactions(user.id)

      if (error) {
        console.error(error)
        setLoading(false)
        return
      }

      const filtered = data.filter((tx) => {
        const date = new Date(tx.created_at)
        return (
          date.getMonth() === month &&
          date.getFullYear() === year
        )
      })

      // ordenar por fecha (más reciente primero)
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

      setTransactions(filtered)
      setLoading(false)
    }

    load()
  }, [user?.id, month, year])

  const ingresos = transactions
    .filter(t => t.type === 'income')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0)

  const gastos = transactions
    .filter(t => t.type === 'expense')
    .reduce((acc, t) => acc + Number(t.amount || 0), 0)

  const getMonthName = (m) => {
    const names = [
      'Enero','Febrero','Marzo','Abril','Mayo','Junio',
      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
    ]
    return names[m]
  }

  if (loading) {
    return <div className="page-loading"><div className="spinner" /></div>
  }

  return (
    <div className="page">

      {/* 🔙 BACK */}
      <button className="btn-secondary" onClick={onBack}>
        ← Volver
      </button>

      <h1>
        {getMonthName(month)} {year}
      </h1>

      {/* 📊 RESUMEN */}
      <div className="monthly-summary">
        <div>Ingresos: <strong>{formatCOP(ingresos)}</strong></div>
        <div>Gastos: <strong>{formatCOP(gastos)}</strong></div>
        <div>Resultado: <strong>{formatCOP(ingresos - gastos)}</strong></div>
      </div>

      {/* 📋 MOVIMIENTOS */}
      <div className="monthly-transactions">
        {transactions.map((tx) => (
          <div key={tx.id} className="transaction-item">

            <div>
              <strong>{tx.name || 'Movimiento'}</strong>
              <p>{new Date(tx.created_at).toLocaleDateString()}</p>
            </div>

            <div className={tx.type === 'income' ? 'tx-income' : 'tx-expense'}>
              {tx.type === 'income' ? '+' : '-'}
              {formatCOP(tx.amount)}
            </div>

          </div>
        ))}
      </div>

    </div>
  )
}