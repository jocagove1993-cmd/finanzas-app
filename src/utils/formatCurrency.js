export const formatCOP = (amount) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount ?? 0)

export const parseAmount = (str) =>
  parseInt(String(str).replace(/[^\d]/g, ''), 10) || 0