import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { addTransaction } from '../services/transactionService'
import { getBalance, updateBalance } from '../services/balanceService'
import { formatCOP } from '../utils/formatCurrency'

const EXPENSE_TYPES = {
  fijo: {
    label: 'Gasto fijo',
    description:
      'Pagos recurrentes o necesarios como arriendo, servicios, transporte o suscripciones.',
  },
  variable: {
    label: 'Gasto variable',
    description:
      'Gastos que cambian según tu estilo de vida, como salidas, compras o entretenimiento.',
  },
  hormiga: {
    label: 'Gasto hormiga',
    description:
      'Pequeños gastos frecuentes que parecen insignificantes, pero afectan tu dinero sin que lo notes.',
  },
}

const SOURCE_LABELS = {
  gastos: 'Saldo disponible',
  imprevistos: 'Bolsa de imprevistos',
}

export default function AddExpense() {
  const { user } = useAuth()

  const [amount, setAmount] = useState('')
  const [expenseGroup, setExpenseGroup] = useState('fijo')
  const [source, setSource] = useState('gastos')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const currentExpense = EXPENSE_TYPES[expenseGroup] || EXPENSE_TYPES.fijo
  const numericAmount = Number(amount || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccessMsg('')
    setErrorMsg('')

    if (!user?.id) {
      setErrorMsg('No se encontró el usuario actual.')
      return
    }

    if (!numericAmount || numericAmount <= 0) {
      setErrorMsg('Ingresa un valor válido.')
      return
    }

    setLoading(true)

    try {
      const { data: balance, error: balanceError } = await getBalance(user.id)

      if (balanceError || !balance) {
        setErrorMsg('No se pudo obtener el balance actual.')
        setLoading(false)
        return
      }

      const saldoDisponible =
        source === 'imprevistos'
          ? Number(balance.saldo_imprevistos ?? 0)
          : Number(balance.saldo_gastos ?? 0)

      if (numericAmount > saldoDisponible) {
        setErrorMsg('No tienes saldo suficiente en esa bolsa.')
        setLoading(false)
        return
      }

      const { error: txError } = await addTransaction({
        user_id: user.id,
        type: 'expense',
        amount: numericAmount,
        description: description || currentExpense.label,
        expense_group: expenseGroup,
        source,
      })

      if (txError) {
        console.error(txError)
        setErrorMsg('Error al guardar el gasto.')
        setLoading(false)
        return
      }

      const updates =
        source === 'imprevistos'
          ? { saldo_imprevistos: Number(balance.saldo_imprevistos ?? 0) - numericAmount }
          : { saldo_gastos: Number(balance.saldo_gastos ?? 0) - numericAmount }

      const { error: updateError } = await updateBalance(user.id, updates)

      if (updateError) {
        console.error(updateError)
        setErrorMsg('Se guardó el gasto, pero hubo un problema actualizando el balance.')
        setLoading(false)
        return
      }

      setSuccessMsg('Gasto guardado correctamente.')
      setAmount('')
      setDescription('')
      setExpenseGroup('fijo')
      setSource('gastos')
    } catch (error) {
      console.error(error)
      setErrorMsg('Ocurrió un error inesperado.')
    }

    setLoading(false)
  }

  return (
    <div className="page">
      <div className="page-header">
        <span className="page-kicker">Control de gastos</span>
        <h1 className="page-title">Registrar gasto</h1>
      </div>

      <div className="expense-layout">
        {/* FORM */}
        <div className="card expense-form-card">
          <form onSubmit={handleSubmit} className="expense-form">

            <div className="field">
              <label>Tipo de gasto</label>
              <select
                value={expenseGroup}
                onChange={(e) => setExpenseGroup(e.target.value)}
              >
                <option value="fijo">Gasto fijo</option>
                <option value="variable">Gasto variable</option>
                <option value="hormiga">Gasto hormiga</option>
              </select>
            </div>

            {/* 🔥 FIX REAL AQUÍ */}
            <div
              key={expenseGroup}
              className={`expense-impact-box ${
                expenseGroup === 'hormiga' ? 'expense-impact-box--hormiga' : ''
              }`}
            >
              <p>
                <strong>{currentExpense.label}:</strong> {currentExpense.description}
              </p>
            </div>

            <div className="field">
              <label>Bolsa</label>
              <select value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="gastos">Saldo disponible</option>
                <option value="imprevistos">Imprevistos</option>
              </select>
            </div>

            <div className="field">
              <label>Monto</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Ej. 120000"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
              />
              {amount && <small>{formatCOP(numericAmount)}</small>}
            </div>

            <div className="field">
              <label>Descripción</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {errorMsg && <p className="field-error">{errorMsg}</p>}
            {successMsg && <p className="field-success">{successMsg}</p>}

            <button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar gasto'}
            </button>
          </form>
        </div>

        {/* PREVIEW */}
        <div className="card expense-preview-card">
          <span className="label">Monto</span>
          <span className="amount amount--hero">
            {numericAmount > 0 ? formatCOP(numericAmount) : '$0'}
          </span>

          <div className="expense-summary-list">
            <div className="expense-summary-item">
              <span>Tipo</span>
              <span>{currentExpense.label}</span>
            </div>

            <div className="expense-summary-item">
              <span>Bolsa</span>
              <span>{SOURCE_LABELS[source]}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}