    import { useMemo } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useFinances } from '../hooks/useFinances'
import { useSavingsGoals } from '../hooks/useSavingsGoals'
import { usePayments } from '../hooks/usePayments'
import { formatCOP } from '../utils/formatCurrency'

function calculateGoalPlan(goal) {
  const target = Number(goal?.target_amount || 0)
  const current = Number(goal?.current_amount || 0)
  const remaining = Math.max(target - current, 0)

  if (!goal?.deadline) {
    return {
      remaining,
      fortnightsLeft: 0,
      recommendedPerFortnight: 0,
      alert: 'Sin fecha límite',
      alertType: 'accent',
    }
  }

  const today = new Date()
  const deadline = new Date(goal.deadline)
  const diffDays = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
  const fortnightsLeft = Math.max(Math.ceil(diffDays / 15), 0)

  const recommendedPerFortnight =
    fortnightsLeft > 0 ? Math.ceil(remaining / fortnightsLeft) : remaining

  let alert = 'Vas bien'
  let alertType = 'good'

  if (remaining <= 0) {
    alert = 'Meta cumplida'
    alertType = 'positive'
  } else if (fortnightsLeft <= 2 && remaining > 0) {
    alert = 'Meta en riesgo'
    alertType = 'negative'
  } else if (fortnightsLeft <= 4) {
    alert = 'Meta exigente'
    alertType = 'warning'
  }

  return {
    remaining,
    fortnightsLeft,
    recommendedPerFortnight,
    alert,
    alertType,
  }
}

function getMovementIcon(type) {
  if (type === 'income') return '💰'
  if (type === 'expense') return '💸'
  if (type === 'contribution') return '📥'
  if (type === 'payment_scheduled') return '📅'
  return '•'
}

function getMovementIconClass(type) {
  if (type === 'income') return 'transaction-icon--income'
  if (type === 'expense') return 'transaction-icon--expense'
  if (type === 'contribution') return 'transaction-icon--contribution'
  if (type === 'payment_scheduled') return 'transaction-icon--scheduled'
  return 'transaction-icon--goal'
}

// Etiqueta legible para el tipo de movimiento
function getMovementLabel(type) {
  if (type === 'income') return 'Ingreso'
  if (type === 'expense') return 'Gasto'
  if (type === 'contribution') return 'Abono'
  if (type === 'payment_scheduled') return 'Pago programado'
  return ''
}

function safeTimestamp(dateValue) {
  if (!dateValue) return 0

  const parsed = new Date(dateValue).getTime()

  if (Number.isNaN(parsed)) return 0

  return parsed
}

export default function Dashboard({ setActiveView, setSelectedPaymentId, setSelectedGoalId }) {
  const { user, nombre } = useAuth()
  const { balance, monthly, loading } = useFinances(user?.id)
  const { goals = [], contributions = [] } = useSavingsGoals(user?.id)

  const { payments = [] } = usePayments(user?.id)
  const today = new Date()
  const upcomingPayments = payments
    .filter(p => p.status === 'pending')
    .map(p => ({
      ...p,
      date: p.due_date,
    }))
    .sort((a, b) => a.date - b.date)

  const nextPayments = upcomingPayments.slice(0, 3)
  const overduePayments = upcomingPayments.filter(p => p.date < today)

  const transactions = useMemo(() => {
    return Array.isArray(monthly?.transactions) ? monthly.transactions : []
  }, [monthly])

  const abonosMes = Number(monthly?.abonos || 0)

  const {
    ingresosMes,
    gastosMes,
    balanceMensual,
    gastosFijos,
    gastosVariables,
    gastosHormiga,
    pctFijos,
    pctVariables,
    pctHormiga,
    hormigaInsight,
    gastoGeneralInsight,
  } = useMemo(() => {
    let ingresos = 0
    let gastos = 0
    let fijo = 0
    let variable = 0
    let hormiga = 0

    transactions.forEach((tx) => {
      const amount = Number(tx?.amount || 0)

      // payment_scheduled no afecta el cálculo de balance mensual
      if (tx.type === 'income') ingresos += amount
      if (tx.type === 'expense') gastos += amount

      if (tx.expense_group === 'fijo') fijo += amount
      if (tx.expense_group === 'variable') variable += amount
      if (tx.expense_group === 'hormiga') hormiga += amount
    })

    const total = fijo + variable + hormiga

    const pctFijos = total > 0 ? Math.round((fijo / total) * 100) : 0
    const pctVariables = total > 0 ? Math.round((variable / total) * 100) : 0
    const pctHormiga = total > 0 ? Math.round((hormiga / total) * 100) : 0

    let hormigaInsight = ''
    let gastoGeneralInsight = ''

    if (pctHormiga >= 20) {
      hormigaInsight =
        'Tus gastos hormiga están altos este mes. Vale la pena revisarlos porque suelen pasar desapercibidos.'
    } else if (pctHormiga >= 10) {
      hormigaInsight =
        'Tus gastos hormiga ya tienen peso dentro del presupuesto. Mantenerlos bajo control puede mejorar tu ahorro.'
    }

    if (variable > fijo && variable > 0) {
      gastoGeneralInsight =
        'Tus gastos variables ya superan a tus gastos fijos. Revisa si tu presupuesto está perdiendo control.'
    }

    return {
      ingresosMes: ingresos,
      gastosMes: gastos,
      balanceMensual: ingresos - gastos - abonosMes,
      gastosFijos: fijo,
      gastosVariables: variable,
      gastosHormiga: hormiga,
      pctFijos,
      pctVariables,
      pctHormiga,
      hormigaInsight,
      gastoGeneralInsight,
    }
  }, [transactions, abonosMes])

  const recentMovements = useMemo(() => {
    const tx = transactions.map((t, i) => ({
      key: `tx-${t?.id ?? i}-${t?.created_at ?? i}`,
      type: t?.type || 'income',
      description: t?.description || 'Movimiento',
      amount: Number(t?.amount || 0),
      created_at: t?.created_at || null,
      timestamp: safeTimestamp(t?.created_at),
    }))

    const contrib = contributions.map((c, i) => ({
      key: `contribution-${c?.id ?? i}-${c?.created_at ?? i}`,
      type: 'contribution',
      description: `Abono a meta: ${c?.savings_goals?.name || 'Meta'}`,
      amount: Number(c?.amount || 0),
      created_at: c?.created_at || null,
      timestamp: safeTimestamp(c?.created_at),
    }))
const scheduledPayments = payments
  .filter(p => p.status === 'pending')
  .map((p, i) => ({
    key: `payment-${p.id}-${i}`,
    type: 'payment_scheduled',
    description: `Pago agendado: ${p.name}`,
    amount: Number(p.amount || 0),
    created_at: p.created_at || null,
    timestamp: safeTimestamp(p.created_at),
  }))
    return [...tx, ...contrib, ...scheduledPayments]
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 6)
  }, [transactions, contributions, payments])

  // ===== INSIGHTS INTELIGENTES =====
  const smartInsights = []

  if (gastosMes > ingresosMes && ingresosMes > 0) {
    smartInsights.push('Tus gastos están superando tus ingresos. Ajusta tu presupuesto.')
  }

  if (pctHormiga >= 15) {
    smartInsights.push('Tus gastos hormiga están altos. Revisa pequeños gastos diarios.')
  }

  if (overduePayments.length > 0) {
    smartInsights.push('Tienes pagos vencidos. Priorízalos para evitar intereses.')
  }

  if (smartInsights.length === 0) {
    smartInsights.push('Vas bien. Tu flujo financiero está equilibrado.')
  }

  if (loading) {
    return (
      <div className="db-loading">
        <div className="db-spinner" />
      </div>
    )
  }

  const saldoGastos = Number(balance?.saldo_gastos ?? 0)
  const saldoAhorro = Number(balance?.saldo_ahorro ?? 0)
  const saldoImprevistos = Number(balance?.saldo_imprevistos ?? 0)

  return (
    <div className="db-root">
      <section className="db-hero">
        <div className="db-hero-left">
          <span className="label db-kicker">Panel financiero</span>
          <h1 className="db-hero-title">
            Hola, <span className="db-hero-name">{nombre || 'usuario'}</span>
          </h1>
          <p className="db-hero-sub">
            Así se está moviendo tu dinero este mes.
          </p>
        </div>

        <div className="card card--accent db-hero-balance">
          <span className="label db-hero-balance-label">Disponible</span>

          <span className="amount amount--hero">
            {formatCOP(saldoGastos)}
          </span>

          <p className="db-hero-balance-copy">
            Este es el dinero que realmente puedes usar hoy.
          </p>
        </div>
      </section>

      <section className="db-cards">
        <div className="card card--positive db-card">
          <span className="label db-card-label">Ahorro</span>
          <span className="amount amount--large amount--positive">
            {formatCOP(saldoAhorro)}
          </span>
        </div>

        <div className="card db-card">
          <span className="label db-card-label">Fondo de emergencia</span>
          <span className="amount amount--large">
            {formatCOP(saldoImprevistos)}
          </span>
        </div>

        <div className="card db-card">
          <span className="label db-card-label">Resultado del mes</span>
          <span
            className={`amount amount--large ${
              balanceMensual >= 0 ? 'amount--positive' : 'amount--negative'
            }`}
          >
            {balanceMensual >= 0 ? '+' : '-'}
            {formatCOP(Math.abs(balanceMensual))}
          </span>
        </div>
      </section>

      <section className="db-panels">
        <div className="card db-panel">
          <div className="db-panel-header">
            <div>
              <h3>Flujo mensual</h3>
              <p className="db-panel-sub">Comportamiento financiero del mes</p>
            </div>
          </div>

          <div className="db-flow-metrics db-flow-metrics--clean">
            <div className="db-flow-metric">
              <span className="label">Ingresos</span>
              <span className="amount amount--medium amount--positive">
                {formatCOP(ingresosMes)}
              </span>
            </div>

            <div className="db-flow-divider" />

            <div className="db-flow-metric">
              <span className="label">Gastos</span>
              <span className="amount amount--medium amount--negative">
                {formatCOP(gastosMes)}
              </span>
            </div>

            <div className="db-flow-divider" />

            <div className="db-flow-metric">
              <span className="label">Abonos</span>
              <span className="amount amount--medium">
                {formatCOP(abonosMes)}
              </span>
            </div>
          </div>

          <div className="db-flow-bars">
            <div className="db-flow-bar-row">
              <span className="db-flow-bar-label">Ingresos</span>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '100%' }} />
              </div>
              <span className="amount amount--small">{formatCOP(ingresosMes)}</span>
            </div>

            <div className="db-flow-bar-row">
              <span className="db-flow-bar-label">Gastos</span>
              <div className="progress-track">
                <div
                  className="progress-fill progress-fill--warning"
                  style={{
                    width:
                      ingresosMes > 0
                        ? `${Math.min((gastosMes / ingresosMes) * 100, 100)}%`
                        : '0%',
                  }}
                />
              </div>
              <span className="amount amount--small">{formatCOP(gastosMes)}</span>
            </div>

            <div className="db-flow-bar-row">
              <span className="db-flow-bar-label">Abonos</span>
              <div className="progress-track">
                <div
                  className="progress-fill progress-fill--accent"
                  style={{
                    width:
                      ingresosMes > 0
                        ? `${Math.min((abonosMes / ingresosMes) * 100, 100)}%`
                        : '0%',
                  }}
                />
              </div>
              <span className="amount amount--small">{formatCOP(abonosMes)}</span>
            </div>
          </div>

          <div className="db-flow-summary">
            <div className="db-flow-summary-item">
              <span className="label">Salidas del mes</span>
              <span className="amount amount--small">
                {formatCOP(gastosMes + abonosMes)}
              </span>
            </div>

            <div className="db-flow-summary-copy">
              <p>
                {ingresosMes === 0 && gastosMes === 0 && abonosMes === 0
                  ? 'Aún no hay movimientos registrados este mes.'
                  : abonosMes > gastosMes
                  ? 'Este mes destinaste más dinero a metas que a gastos.'
                  : abonosMes > 0
                  ? 'Tus abonos también están impactando tu flujo mensual.'
                  : gastosMes > 0
                  ? 'Tu flujo del mes está concentrado principalmente en gasto.'
                  : 'Aún no hay gastos registrados este mes.'}
              </p>
            </div>
          </div>
        </div>

        <div className="card db-panel">
          <div className="db-panel-header">
            <div>
              <h3>Distribución de gastos</h3>
              <p className="db-panel-sub">Cómo se reparte tu gasto este mes</p>
            </div>
          </div>

          <div className="db-dist-list">
            <div className="db-dist-item">
              <div className="db-dist-top">
                <span className="db-dist-name">Gastos fijos</span>
                <div className="db-dist-right">
                  <span className="amount amount--small">
                    {formatCOP(gastosFijos)}
                  </span>
                  <span className="badge badge--accent">{pctFijos}%</span>
                </div>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${pctFijos}%` }}
                />
              </div>
            </div>

            <div className="db-dist-item">
              <div className="db-dist-top">
                <span className="db-dist-name">Gastos variables</span>
                <div className="db-dist-right">
                  <span className="amount amount--small">
                    {formatCOP(gastosVariables)}
                  </span>
                  <span className="badge badge--warning">{pctVariables}%</span>
                </div>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill progress-fill--warning"
                  style={{ width: `${pctVariables}%` }}
                />
              </div>
            </div>

            <div className="db-dist-item">
              <div className="db-dist-top">
                <span className="db-dist-name">Gastos hormiga</span>
                <div className="db-dist-right">
                  <span className="amount amount--small">
                    {formatCOP(gastosHormiga)}
                  </span>
                  <span className="badge badge--hormiga">{pctHormiga}%</span>
                </div>
              </div>

              <div className="progress-track">
                <div
                  className="progress-fill progress-fill--hormiga"
                  style={{ width: `${pctHormiga}%` }}
                />
              </div>
            </div>
          </div>

          {(hormigaInsight || gastoGeneralInsight) && (
            <div className="db-insights-stack">
              {hormigaInsight && (
                <div className="db-insight-box db-insight-box--hormiga">
                  <p>{hormigaInsight}</p>
                </div>
              )}

              {gastoGeneralInsight && (
                <div className="db-insight-box db-insight-box--general">
                  <p>{gastoGeneralInsight}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="db-section">
        <div className="db-section-header">
          <h3>Próximos pagos</h3>
        </div>

        {nextPayments.length === 0 ? (
          <div className="card db-empty-state">
            <p>No tienes pagos pendientes.</p>
          </div>
        ) : (
          <div>
            {overduePayments.length > 0 && (
              <div className="db-payments-alert">
                ⚠️ Tienes pagos vencidos
              </div>
            )}

            {nextPayments.map((p) => {
              const isOverdue = new Date(p.due_date + 'T00:00:00') < today

              return (
                <div key={p.id} className="card db-payment-item">
                  <div>
                    <p>{p.name}</p>
                    <span>
                      {(() => {
                        const [year, month, day] = p.due_date.split('-')
                        return `${day}/${month}/${year}`
                      })()}
                    </span>
                  </div>

                  <div>
                    <span>{formatCOP(p.amount)}</span>
                    <span>{isOverdue ? 'Vencido' : 'Próximo'}</span>
                  </div>

                  <button
                    className="btn-primary"
                    onClick={() => {
                      setSelectedPaymentId(p.id)
                      setActiveView('payments')
                    }}
                  >
                    Pagar ahora
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <section className="db-section">
        <div className="db-section-header">
          <h3>Metas inteligentes</h3>
        </div>

        {goals.length === 0 ? (
          <div className="card db-empty-state">
            <p>Aún no tienes metas creadas.</p>
          </div>
        ) : (
          <div className="db-goals-grid">
            {goals.slice(0, 3).map((goal, index) => {
              const progress = Math.min(
                Math.round(
                  (Number(goal?.current_amount || 0) /
                    Number(goal?.target_amount || 1)) *
                    100
                ),
                100
              )

              const plan = calculateGoalPlan(goal)

              return (
                <div
                  key={`goal-card-${goal?.id ?? index}-${goal?.created_at ?? index}`}
                  className="card db-goal-card"
                >
                  <div className="db-goal-top">
                    <div className="db-goal-icon">{goal?.icon || '🎯'}</div>

                    <div className="db-goal-info">
                      <span className="db-goal-name">{goal?.name || 'Meta'}</span>
                      <span className="db-goal-target">
                        {formatCOP(goal?.target_amount || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="db-goal-progress-wrap">
                    <div className="progress-track">
                      <div
                        className="progress-fill"
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    <div className="db-goal-amounts">
                      <span className="amount amount--small">
                        {formatCOP(goal?.current_amount || 0)}
                      </span>
                      <span className="badge badge--accent">{progress}%</span>
                    </div>
                  </div>

                  <div className="db-goal-stats">
                    <div className="db-goal-stat">
                      <span className="label">Quincenas</span>
                      <span className="amount amount--small">
                        {plan.fortnightsLeft}
                      </span>
                    </div>

                    <div className="db-goal-stat">
                      <span className="label">Aporte</span>
                      <span className="amount amount--small">
                        {formatCOP(plan.recommendedPerFortnight)}
                      </span>
                    </div>

                    <div className="db-goal-stat">
                      <span className="label">Estado</span>
                      <span className={`badge badge--${plan.alertType}`}>
                        {plan.alert}
                      </span>
                    </div>
                  </div>

                  <button
                    className="btn-primary"
                    onClick={() => {
                      setSelectedGoalId(goal.id)
                      setActiveView('goals')
                    }}
                  >
                    Abonar
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* ===== CONSEJOS FINANCIEROS ===== */}
      <section className="db-section">
        <div className="db-section-header">
          <h3>Consejos financieros</h3>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="card" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div>💳</div>
            <div>
              <strong>Avalancha de deudas</strong>
              <p style={{ opacity: 0.7 }}>
                Paga mínimos en todas y concentra el excedente en la de mayor tasa de interés.
              </p>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div>📁</div>
            <div>
              <strong>Los proyectos se financian antes</strong>
              <p style={{ opacity: 0.7 }}>
                Define cuánto necesitas y ahorra quincena a quincena antes de gastar.
              </p>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div>🌱</div>
            <div>
              <strong>El tiempo vale más que el monto</strong>
              <p style={{ opacity: 0.7 }}>
                Empieza a invertir aunque sea poco. El tiempo es el mayor multiplicador.
              </p>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div>🔒</div>
            <div>
              <strong>Fondo de emergencia — primero</strong>
              <p style={{ opacity: 0.7 }}>
                Asegura 3 a 6 meses de tus gastos fijos antes de invertir.
              </p>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div>📊</div>
            <div>
              <strong>Revisa tus estadísticas mensualmente</strong>
              <p style={{ opacity: 0.7 }}>
                Identifica dónde crece tu gasto y corrige antes de que escale.
              </p>
            </div>
          </div>

          <div className="card" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <div>⚠️</div>
            <div>
              <strong>30% máximo en cuotas</strong>
              <p style={{ opacity: 0.7 }}>
                Si superas el 30% de tus ingresos en deudas, estás en zona de riesgo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PARA TI ===== */}
      <section className="db-section">
        <div className="db-section-header">
          <h3>💡 Para ti</h3>
        </div>

        <div className="card" style={{
          border: '1px solid rgba(34,197,94,0.3)',
          padding: '14px'
        }}>
          {smartInsights.map((msg, i) => (
            <p key={i} style={{ marginBottom: '6px', opacity: 0.85 }}>
              {msg}
            </p>
          ))}
        </div>
      </section>

      <section className="db-section">
        <div className="db-section-header">
          <h3>Últimos movimientos</h3>
        </div>

        {recentMovements.length === 0 ? (
          <div className="card db-empty-state">
            <p>Aún no hay movimientos registrados.</p>
          </div>
        ) : (
          <section className="card db-movements">
            {recentMovements.map((item) => (
              <div key={item.key} className="transaction-item">
                <div className="db-movement-left">
                  <div className={`transaction-icon ${getMovementIconClass(item.type)}`}>
                    {getMovementIcon(item.type)}
                  </div>

                  <div className="db-movement-info">
                    <p className="db-movement-title">{item.description}</p>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {/* Etiqueta de tipo para payment_scheduled */}
                      {item.type === 'payment_scheduled' && (
                        <span className="badge badge--accent" style={{ fontSize: '10px' }}>
                          Programado
                        </span>
                      )}
                      <span className="db-movement-date">
                        {item.created_at
                          ? new Date(item.created_at).toLocaleString('es-CO')
                          : 'Sin fecha'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="db-movement-right">
                  <span className="amount amount--medium">
                    {formatCOP(item.amount)}
                  </span>
                </div>
              </div>
            ))}
          </section>
        )}
      </section>
    </div>
  )
}

    
