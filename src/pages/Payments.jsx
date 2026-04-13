    import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePayments } from '../hooks/usePayments'
import { formatCOP } from '../utils/formatCurrency'

export default function Payments({ selectedPaymentId }) {
  const { user } = useAuth()
  const { payments, addPayment, pay, removePayment } = usePayments(user?.id)

  const [form, setForm] = useState({
    name: '',
    amount: '',
    due_date: '',
    type: 'unique',
  })

  const [source, setSource] = useState('gastos')

  const [loadingPayId, setLoadingPayId] = useState(null)
  const [loadingDeleteId, setLoadingDeleteId] = useState(null)
  const [errorMsg, setErrorMsg] = useState('')

  const selectedPaymentRef = useRef(null)

  useEffect(() => {
    if (selectedPaymentId && selectedPaymentRef.current) {
      selectedPaymentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [selectedPaymentId])

  const numericAmount = Number(form.amount || 0)

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    await addPayment({
      user_id: user.id,
      name: form.name,
      amount: Number(form.amount),
      due_date: form.due_date,
      is_recurring: form.type === 'recurring',
    })

    setForm({
      name: '',
      amount: '',
      due_date: '',
      type: 'unique',
    })
  }

  const handlePay = async (paymentId) => {
    setErrorMsg('')
    setLoadingPayId(paymentId)

    const res = await pay({
      id: paymentId,
      source,
    })

    if (!res.success) {
      setErrorMsg(res.error?.message || 'No se pudo realizar el pago')
    }

    setLoadingPayId(null)
  }

  const handleDelete = async (paymentId) => {
    setErrorMsg('')
    setLoadingDeleteId(paymentId)

    const res = await removePayment(paymentId)

    if (!res.success) {
      setErrorMsg(res.error?.message || 'No se pudo eliminar el pago')
    }

    setLoadingDeleteId(null)
  }

  return (
    <div className="page">
      <h1>Agenda de pagos 📅</h1>

      <form onSubmit={handleSubmit} className="form-card">

        <div className="field">
          <label>Entidad / Pago</label>
          <input
            name="name"
            placeholder="Ej: Factura Claro"
            value={form.name}
            onChange={handleChange}
          />
        </div>

        <div className="field">
          <label>Monto</label>
          <input
            name="amount"
            type="number"
            inputMode="numeric"
            placeholder="Monto"
            value={form.amount}
            onChange={handleChange}
          />

          {form.amount && (
            <small className="helper-text">
              {formatCOP(numericAmount)}
            </small>
          )}
        </div>

        <div className="field">
          <label>Fecha de pago</label>
          <input
            name="due_date"
            type="date"
            value={form.due_date}
            onChange={handleChange}
          />
        </div>

        <div className="field">
          <label>Tipo de pago</label>
          <select
            name="type"
            value={form.type}
            onChange={handleChange}
          >
            <option value="unique">Pago único</option>
            <option value="recurring">Recurrente mensual</option>
          </select>
        </div>

        <button type="submit" className="btn-primary">
          Guardar pago
        </button>
      </form>

      {/* 🔥 ERROR GLOBAL */}
      {errorMsg && (
        <p className="field-error" style={{ marginTop: '10px' }}>
          {errorMsg}
        </p>
      )}

      <div className="goals-premium-grid">
        {payments.map((p) => (
          <div
            key={p.id}
            ref={selectedPaymentId === p.id ? selectedPaymentRef : null}
            className={`card${selectedPaymentId === p.id ? ' card--highlighted' : ''}`}
          >

            <h3>{p.name}</h3>
            <p>{formatCOP(p.amount)}</p>
            <p>Fecha: {p.due_date}</p>

            {p.is_recurring && (
              <p style={{ color: '#60a5fa' }}>🔁 Recurrente</p>
            )}

            {p.status === 'pending' ? (
              <>
                <select
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  <option value="gastos">Disponible</option>
                  <option value="imprevistos">Imprevistos</option>
                </select>

                <button
                  className="btn-primary"
                  onClick={() => handlePay(p.id)}
                  disabled={loadingPayId === p.id}
                >
                  {loadingPayId === p.id ? 'Procesando...' : 'Marcar como pagado'}
                </button>
              </>
            ) : (
              <p style={{ color: '#22c55e' }}>Pagado</p>
            )}

            <button
              className="btn-danger"
              onClick={() => handleDelete(p.id)}
              disabled={loadingDeleteId === p.id}
            >
              {loadingDeleteId === p.id ? 'Eliminando...' : 'Eliminar'}
            </button>

          </div>
        ))}
      </div>
    </div>
  )
}

    
