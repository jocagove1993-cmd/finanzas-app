import { useEffect, useState } from 'react'
import { getTransactions } from '../services/transactionService'
import { useAuth } from '../hooks/useAuth'
import { formatCOP } from '../utils/formatCurrency'
import MonthlyDetail from './MonthlyDetail'

export default function MonthlyHistory() {
  const { user } = useAuth()
  const [months, setMonths] = useState([])
  const [loading, setLoading] = useState(true)

  const [selectedMonth, setSelectedMonth] = useState(null)

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

      const grouped = {}

      data.forEach((tx) => {
        const date = new Date(tx.created_at)
        const key = `${date.getFullYear()}-${date.getMonth()}`

        if (!grouped[key]) {
          grouped[key] = {
            year: date.getFullYear(),
            month: date.getMonth(),
            ingresos: 0,
            gastos: 0,
          }
        }

        if (tx.type === 'income') {
          grouped[key].ingresos += Number(tx.amount || 0)
        }

        if (tx.type === 'expense') {
          grouped[key].gastos += Number(tx.amount || 0)
        }
      })

      const result = Object.values(grouped)
        .map((m) => ({
          ...m,
          resultado: m.ingresos - m.gastos,
        }))
        .sort((a, b) => {
          const dateA = new Date(a.year, a.month)
          const dateB = new Date(b.year, b.month)
          return dateB - dateA
        })

      setMonths(result)
      setLoading(false)
    }

    load()
  }, [user?.id])

  const getMonthName = (month) => {
    const names = [
      'Enero','Febrero','Marzo','Abril','Mayo','Junio',
      'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
    ]
    return names[month]
  }

  if (selectedMonth) {
    return (
      <MonthlyDetail
        month={selectedMonth.month}
        year={selectedMonth.year}
        onBack={() => setSelectedMonth(null)}
      />
    )
  }

  if (loading) {
    return <div className="page-loading"><div className="spinner" /></div>
  }

  return (
    <div className="page">
      <h1>Historial mensual 📊</h1>

      <div className="monthly-grid">
        {months.map((m, index) => (
          <div
            key={index}
            className="card monthly-card"
            onClick={() => setSelectedMonth(m)}
            style={{ cursor: 'pointer' }}
          >
            <h3>{getMonthName(m.month)} {m.year}</h3>

            <p>Ingresos: <strong>{formatCOP(m.ingresos)}</strong></p>
            <p>Gastos: <strong>{formatCOP(m.gastos)}</strong></p>

            <p className="monthly-result">
              Resultado: {formatCOP(m.resultado)}
            </p>

          </div>
        ))}
      </div>
    </div>
  )
}