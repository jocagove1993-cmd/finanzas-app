export const DEFAULT_RULES = {
  porcentaje_gastos: 65,
  porcentaje_ahorro: 20,
  porcentaje_imprevistos: 15,
}

// Validar que sume 100%
export const isValidDistribution = (rules) => {
  const total =
    (rules.porcentaje_gastos || 0) +
    (rules.porcentaje_ahorro || 0) +
    (rules.porcentaje_imprevistos || 0)

  return total === 100
}

// Distribuir nómina automáticamente
export const distributeNomina = (amount, rules) => {
  const gastos = Math.round((amount * rules.porcentaje_gastos) / 100)
  const ahorro = Math.round((amount * rules.porcentaje_ahorro) / 100)
  const imprevistos = amount - gastos - ahorro

  return { gastos, ahorro, imprevistos }
}

// Estado financiero
export const getFinancialStatus = (gastado, presupuesto) => {
  if (!presupuesto) return 'en-control'

  const ratio = gastado / presupuesto

  if (ratio >= 1) return 'excedido'
  if (ratio >= 0.8) return 'en-riesgo'
  return 'en-control'
}

// Etiquetas
export const getStatusLabel = (status) => {
  return {
    'en-control': 'En control',
    'en-riesgo': 'En riesgo',
    'excedido': 'Excedido',
  }[status]
}

// Colores
export const getStatusColor = (status) => {
  return {
    'en-control': '#16a34a',
    'en-riesgo': '#f59e0b',
    'excedido': '#dc2626',
  }[status]
}

// Categorías
export const EXPENSE_CATEGORIES = {
  Esenciales: ['Vivienda', 'Alimentación', 'Transporte', 'Salud', 'Deudas'],
  Personales: ['Ocio', 'Ropa', 'Salidas', 'Gastos hormiga'],
}