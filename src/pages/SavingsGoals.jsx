import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useSavingsGoals } from '../hooks/useSavingsGoals'
import { formatCOP } from '../utils/formatCurrency'

const iconOptions = ['💻', '✈️', '🚗', '🏠', '🎓', '📱', '💰', '🛡️', '🎯', '🧳']

function calculateGoalPlan(goal) {
  const target = Number(goal.target_amount || 0)
  const current = Number(goal.current_amount || 0)
  const remaining = Math.max(target - current, 0)

  if (!goal.deadline) {
    return {
      remaining,
      fortnightsLeft: 0,
      recommendedPerFortnight: 0,
      progress: target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0,
    }
  }

  const today = new Date()
  const deadline = new Date(goal.deadline)

  const diffMs = deadline - today
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const fortnightsLeft = Math.max(Math.ceil(diffDays / 15), 0)

  const recommendedPerFortnight =
    fortnightsLeft > 0 ? Math.ceil(remaining / fortnightsLeft) : remaining

  const progress =
    target > 0 ? Math.min(Math.round((current / target) * 100), 100) : 0

  return {
    remaining,
    fortnightsLeft,
    recommendedPerFortnight,
    progress,
  }
}

export default function SavingsGoals() {
  const { user } = useAuth()
  const {
    goals,
    loading,
    addGoal,
    addContribution,
    deleteGoal,
  } = useSavingsGoals(user?.id)

  const [showForm, setShowForm] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState(null)

  const [form, setForm] = useState({
    name: '',
    target_amount: '',
    current_amount: '',
    deadline: '',
    icon: '💰',
  })

  const [contributionAmount, setContributionAmount] = useState('')
  const [contributionSource, setContributionSource] = useState('gastos')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [contributionError, setContributionError] = useState('')
  const [contributionSuccess, setContributionSuccess] = useState('')
  const [deleteLoadingId, setDeleteLoadingId] = useState(null)

  const numericTarget = Number(form.target_amount || 0)
  const numericCurrent = Number(form.current_amount || 0)
  const numericContribution = Number(contributionAmount || 0)

  const previewPlan = calculateGoalPlan({
    target_amount: numericTarget,
    current_amount: numericCurrent,
    deadline: form.deadline,
  })

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const resetGoalForm = () => {
    setForm({
      name: '',
      target_amount: '',
      current_amount: '',
      deadline: '',
      icon: '💰',
    })
    setError('')
    setSuccess('')
  }

  const resetContributionForm = () => {
    setContributionAmount('')
    setContributionSource('gastos')
    setContributionError('')
    setContributionSuccess('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!form.name.trim() || !numericTarget || !form.deadline) {
      setError('Completa los campos obligatorios.')
      return
    }

    if (!user?.id) {
      setError('No se encontró el usuario actual.')
      return
    }

    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      target_amount: numericTarget,
      current_amount: numericCurrent,
      deadline: form.deadline,
      icon: form.icon || '💰',
    }

    const result = await addGoal(payload)

    if (!result.success) {
      setError(result.error?.message || 'No se pudo crear la meta.')
      return
    }

    setSuccess('Meta creada con éxito.')

    setTimeout(() => {
      resetGoalForm()
      setShowForm(false)
    }, 700)
  }

  const handleContribution = async (e) => {
    e.preventDefault()
    setContributionError('')
    setContributionSuccess('')

    if (!selectedGoal?.id) {
      setContributionError('No se encontró la meta seleccionada.')
      return
    }

    if (!numericContribution || numericContribution <= 0) {
      setContributionError('Ingresa un monto válido.')
      return
    }

    if (!user?.id) {
      setContributionError('No se encontró el usuario actual.')
      return
    }

    const result = await addContribution({
      userId: user.id,
      goalId: selectedGoal.id,
      amount: numericContribution,
      source: contributionSource,
    })

    if (!result.success) {
      setContributionError(
        result.error?.message || 'No se pudo registrar el abono.'
      )
      return
    }

    setContributionSuccess('Abono realizado con éxito.')

    setTimeout(() => {
      resetContributionForm()
      setSelectedGoal(null)
    }, 700)
  }

  const handleDeleteGoal = async (goal) => {
    if (!goal?.id) return

    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar la meta "${goal.name}"?\n\nTambién se eliminarán sus abonos registrados y el dinero será devuelto a la billetera correspondiente.`
    )

    if (!confirmed) return

    setDeleteLoadingId(goal.id)

    try {
      const result = await deleteGoal(goal.id)

      if (!result.success) {
        alert(result.error?.message || 'No se pudo eliminar la meta.')
        return
      }

      if (selectedGoal?.id === goal.id) {
        resetContributionForm()
        setSelectedGoal(null)
      }
    } catch (error) {
      console.error('Error eliminando meta:', error)
      alert('Ocurrió un error al eliminar la meta.')
    } finally {
      setDeleteLoadingId(null)
    }
  }

  return (
    <div className="page goals-page">
      <div className="goals-page-header">
        <div>
          <span className="page-kicker">Ahorro inteligente</span>
          <h1 className="page-title">Metas de ahorro 🎯</h1>
          <p className="page-subtitle">
            Organiza tus objetivos y construye un camino claro para cumplirlos.
          </p>
        </div>

        <button
          type="button"
          className="btn-primary goals-main-action"
          onClick={() => {
            resetGoalForm()
            setShowForm(true)
          }}
        >
          + Nueva meta
        </button>
      </div>

      {showForm && (
        <div className="goal-modal-backdrop">
          <div className="goal-modal goal-modal-wide">
            <div className="goal-modal-top">
              <div>
                <h2>Nueva meta de ahorro</h2>
                <p className="page-subtitle">
                  Define cuánto quieres lograr y cuánto tiempo te darás para conseguirlo.
                </p>
              </div>

              <button
                type="button"
                className="goal-close-btn"
                onClick={() => {
                  resetGoalForm()
                  setShowForm(false)
                }}
              >
                ✕
              </button>
            </div>

            <div className="goal-modal-grid">
              <form onSubmit={handleSubmit}>
                <div className="field">
                  <label>Nombre de la meta</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Ej: Viaje, Laptop, Fondo de emergencia"
                    value={form.name}
                    onChange={handleChange}
                  />
                </div>

                <div className="goal-form-grid">
                  <div className="field">
                    <label>Monto objetivo</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      name="target_amount"
                      placeholder="Ej: 3000000"
                      value={form.target_amount}
                      onChange={handleChange}
                    />
                    {form.target_amount && (
                      <small className="helper-text">{formatCOP(numericTarget)}</small>
                    )}
                  </div>

                  <div className="field">
                    <label>¿Con cuánto arrancas?</label>
                    <input
                      type="number"
                      inputMode="numeric"
                      name="current_amount"
                      placeholder="0"
                      value={form.current_amount}
                      onChange={handleChange}
                    />
                    {form.current_amount && (
                      <small className="helper-text">{formatCOP(numericCurrent)}</small>
                    )}
                  </div>
                </div>

                <div className="field">
                  <label>Fecha límite</label>
                  <input
                    type="date"
                    name="deadline"
                    value={form.deadline}
                    onChange={handleChange}
                  />
                </div>

                <div className="field">
                  <label>Ícono</label>
                  <select name="icon" value={form.icon} onChange={handleChange}>
                    {iconOptions.map((icon) => (
                      <option key={icon} value={icon}>
                        {icon}
                      </option>
                    ))}
                  </select>
                </div>

                {error && <p className="field-error">{error}</p>}
                {success && <p className="field-success">{success}</p>}

                <button type="submit" className="btn-primary goals-submit-btn">
                  Crear meta
                </button>
              </form>

              <div className="goal-preview-panel">
                <span className="label">Vista previa</span>

                <div className="goal-preview-hero">
                  <div className="goal-preview-icon">{form.icon || '💰'}</div>

                  <div>
                    <h3 className="goal-preview-title">
                      {form.name?.trim() || 'Tu nueva meta'}
                    </h3>
                    <p className="goal-preview-target-label">Objetivo</p>
                    <p className="goal-preview-target-value">
                      {numericTarget > 0 ? formatCOP(numericTarget) : '$0'}
                    </p>
                  </div>
                </div>

                <div className="goal-preview-progress-wrap">
                  <div className="goal-card-progress-track">
                    <div
                      className="goal-card-progress-fill"
                      style={{ width: `${previewPlan.progress}%` }}
                    />
                  </div>
                  <p className="goal-preview-progress-text">
                    {previewPlan.progress}% inicial
                  </p>
                </div>

                <div className="goal-preview-stats">
                  <div className="goal-preview-stat">
                    <span>Te falta</span>
                    <strong>{formatCOP(previewPlan.remaining)}</strong>
                  </div>

                  <div className="goal-preview-stat">
                    <span>Quincenas</span>
                    <strong>{previewPlan.fortnightsLeft}</strong>
                  </div>

                  <div className="goal-preview-stat">
                    <span>Por quincena</span>
                    <strong>{formatCOP(previewPlan.recommendedPerFortnight)}</strong>
                  </div>
                </div>

                <div className="goal-preview-tip">
                  {previewPlan.fortnightsLeft > 0
                    ? 'Tu meta ya tiene una ruta estimada de ahorro.'
                    : 'Agrega una fecha límite para proyectar mejor tu meta.'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedGoal && (
        <div className="goal-modal-backdrop">
          <div className="goal-modal goal-contribution-modal">
            <div className="goal-modal-top">
              <div>
                <h2>Abonar a {selectedGoal.name}</h2>
                <p className="page-subtitle">
                  Decide cuánto vas a mover y desde qué billetera saldrá.
                </p>
              </div>

              <button
                type="button"
                className="goal-close-btn"
                onClick={() => {
                  resetContributionForm()
                  setSelectedGoal(null)
                }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleContribution}>
              <div className="field">
                <label>Monto a abonar</label>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Ej: 50000"
                  value={contributionAmount}
                  onChange={(e) => setContributionAmount(e.target.value)}
                />
                {contributionAmount && (
                  <small className="helper-text">
                    {formatCOP(numericContribution)}
                  </small>
                )}
              </div>

              <div className="field">
                <label>Billetera de origen</label>
                <select
                  value={contributionSource}
                  onChange={(e) => setContributionSource(e.target.value)}
                >
                  <option value="gastos">Saldo disponible</option>
                  <option value="imprevistos">Imprevistos</option>
                </select>
              </div>

              <div className="goal-contribution-summary">
                <div className="goal-contribution-row">
                  <span>Meta</span>
                  <strong>{selectedGoal.name}</strong>
                </div>

                <div className="goal-contribution-row">
                  <span>Monto</span>
                  <strong>
                    {numericContribution > 0 ? formatCOP(numericContribution) : '$0'}
                  </strong>
                </div>

                <div className="goal-contribution-row">
                  <span>Origen</span>
                  <strong>
                    {contributionSource === 'gastos'
                      ? 'Saldo disponible'
                      : 'Imprevistos'}
                  </strong>
                </div>
              </div>

              {contributionError && <p className="field-error">{contributionError}</p>}
              {contributionSuccess && <p className="field-success">{contributionSuccess}</p>}

              <button type="submit" className="btn-primary goals-submit-btn">
                Confirmar abono
              </button>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="page-loading">
          <div className="spinner" />
        </div>
      ) : goals.length === 0 ? (
        <div className="card db-empty-state">
          <p>No tienes metas todavía. Crea tu primera meta de ahorro.</p>
        </div>
      ) : (
        <div className="goals-premium-grid">
          {goals.map((goal) => {
            const plan = calculateGoalPlan(goal)

            return (
              <div key={goal.id} className="card goal-card-premium">
                <div className="goal-card-head">
                  <div className="goal-card-icon">{goal.icon || '💰'}</div>

                  <div className="goal-card-copy">
                    <h3>{goal.name}</h3>
                    <p>Fecha límite: {goal.deadline || 'Sin fecha'}</p>
                  </div>
                </div>

                <div className="goal-card-amounts">
                  <div className="goal-card-amount-box">
                    <span>Ahorrado</span>
                    <strong>{formatCOP(Number(goal.current_amount || 0))}</strong>
                  </div>

                  <div className="goal-card-amount-box">
                    <span>Objetivo</span>
                    <strong>{formatCOP(Number(goal.target_amount || 0))}</strong>
                  </div>
                </div>

                <div className="goal-card-progress">
                  <div className="goal-card-progress-track">
                    <div
                      className="goal-card-progress-fill"
                      style={{ width: `${plan.progress}%` }}
                    />
                  </div>
                  <p>{plan.progress}% completado</p>
                </div>

                <div className="goal-card-plan">
                  <div className="goal-card-plan-item">
                    <span>Te falta</span>
                    <strong>{formatCOP(plan.remaining)}</strong>
                  </div>

                  <div className="goal-card-plan-item">
                    <span>Quincenas</span>
                    <strong>{plan.fortnightsLeft}</strong>
                  </div>

                  <div className="goal-card-plan-item">
                    <span>Por quincena</span>
                    <strong>{formatCOP(plan.recommendedPerFortnight)}</strong>
                  </div>
                </div>

                <div className="goal-card-actions">
                  <button
                    type="button"
                    className="btn-primary goal-card-action"
                    onClick={() => {
                      resetContributionForm()
                      setSelectedGoal(goal)
                    }}
                  >
                    + Abonar
                  </button>

                  <button
                    type="button"
                    className="btn-delete-goal"
                    onClick={() => handleDeleteGoal(goal)}
                    disabled={deleteLoadingId === goal.id}
                  >
                    {deleteLoadingId === goal.id ? 'Eliminando...' : 'Eliminar'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}