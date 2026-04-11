import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { usePayments } from '../hooks/usePayments'
import { formatCOP } from '../utils/formatCurrency'

export default function Payments() {
  const { user } = useAuth()
  const { payments, addPayment, pay } = usePayments(user?.id)

  const [form, setForm] = useState({
    name: '',
    amount: '',
    due_date: '',
  })

  const [source, setSource] = useState('gastos')

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    await addPayment({
      user_id: user.id,
      name: form.name,
      amount: Number(form.amount),
      due_date: form.due_date,
    })

    setForm({ name: '', amount: '', due_date: '' })
  }

  return (
    <div className="page">
      <h1>Agenda de pagos 📅</h1>

      {/* FORMULARIO */}
      <form onSubmit={handleSubmit} className="form-card">
        <input name="name" placeholder="Ej: Factura Claro" value={form.name} onChange={handleChange} />
        <input name="amount" type="number" placeholder="Monto" value={form.amount} onChange={handleChange} />
        <input name="due_date" type="date" value={form.due_date} onChange={handleChange} />

        <button type="submit" className="btn-primary">Guardar pago</button>
      </form>

      {/* LISTA */}
      <div className="goals-premium-grid">
        {payments.map((p) => (
          <div key={p.id} className="card">

            <h3>{p.name}</h3>
            <p>{formatCOP(p.amount)}</p>
            <p>Fecha: {p.due_date}</p>

            {p.status === 'pending' ? (
              <>
                <select onChange={(e) => setSource(e.target.value)}>
                  <option value="gastos">Disponible</option>
                  <option value="imprevistos">Imprevistos</option>
                </select>

                <button
                  className="btn-primary"
                  onClick={() => pay({ id: p.id, source })}
                >
                  Marcar como pagado
                </button>
              </>
            ) : (
              <p style={{ color: '#22c55e' }}>Pagado</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}