import { useEffect, useState } from 'react'
import {
  getPayments,
  createPayment,
  markPaymentAsPaid,
  deletePayment,
  updatePayment,
} from '../services/paymentService'

export function usePayments(userId) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  const loadPayments = async () => {
    if (!userId) return

    setLoading(true)
    const res = await getPayments(userId)

    if (res.success) {
  setPayments(res.data)
} else {
  console.error('Error cargando pagos:', res.error)
}

    setLoading(false)
  }

  useEffect(() => {
    loadPayments()
  }, [userId])

  const addPayment = async (payment) => {
    const res = await createPayment(payment)
    if (res.success) await loadPayments()
    return res
  }

  const pay = async (payload) => {
    const res = await markPaymentAsPaid({
      ...payload,
      userId,
    })

    if (res.success) await loadPayments()
    return res
  }

  const removePayment = async (id) => {
    const res = await deletePayment(id)
    if (res.success) await loadPayments()
    return res
  }

  // ─────────────────────────────────────────────
  // EDITAR PAGO
  // Campos editables: name, amount, due_date
  // Sincroniza automáticamente el movimiento vinculado
  // Uso: editPayment(id, { name, amount, due_date })
  // ─────────────────────────────────────────────
  const editPayment = async (id, updates) => {
    const res = await updatePayment(id, updates)
    if (res.success) await loadPayments()
    return res
  }

  return {
    payments,
    loading,
    addPayment,
    pay,
    removePayment,
    editPayment,
  }
}
