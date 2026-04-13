import { useEffect, useState } from 'react'
import { getPayments, createPayment, markPaymentAsPaid, deletePayment } from '../services/paymentService'

export function usePayments(userId) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  const loadPayments = async () => {
    if (!userId) return

    setLoading(true)
    const res = await getPayments(userId)

    if (res.success) {
      setPayments(res.data)
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

  return {
    payments,
    loading,
    addPayment,
    pay,
    removePayment,
  }
}
