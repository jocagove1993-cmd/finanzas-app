import { useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { addTransaction } from '../services/transactionService'
import { getBalance, updateBalance } from '../services/balanceService'
import { formatCOP } from '../utils/formatCurrency'

const PRESETS = {
  '80-10-10': { gastos: 80, ahorro: 10, imprevistos: 10 },
  '70-20-10': { gastos: 70, ahorro: 20, imprevistos: 10 },
  '50-30-20': { gastos: 50, ahorro: 20, imprevistos: 30 },
}

const DEFAULT_PRESET = { gastos: 80, ahorro: 10, imprevistos: 10 }

function safeNumber(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function clampPercent(value) {
  const parsed = safeNumber(value)
  return Math.max(0, Math.min(100, parsed))
}

export default function AddIncome() {
  const { user } = useAuth()

  const [amount, setAmount] = useState('')
  const [incomeType, setIncomeType] = useState('nomina')
  const [description, setDescription] = useState('')
  const [preset, setPreset] = useState('80-10-10')
  const [customPreset, setCustomPreset] = useState({
    gastos: '',
    ahorro: '',
    imprevistos: '',
  })

  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const numericAmount = safeNumber(amount)

  const selectedPreset = useMemo(() => {
    if (preset === 'custom') {
      return {
        gastos: clampPercent(customPreset.gastos),
        ahorro: clampPercent(customPreset.ahorro),
        imprevistos: clampPercent(customPreset.imprevistos),
      }
    }

    return PRESETS[preset] || DEFAULT_PRESET
  }, [preset, customPreset])

  const presetTotal = useMemo(() => {
    return (
      safeNumber(selectedPreset.gastos) +
      safeNumber(selectedPreset.ahorro) +
      safeNumber(selectedPreset.imprevistos)
    )
  }, [selectedPreset])

  const isPresetValid = presetTotal === 100

  const distributionPreview = useMemo(() => {
    if (!numericAmount || numericAmount <= 0) {
      return {
        gastos: 0,
        ahorro: 0,
        imprevistos: 0,
      }
    }

    if (incomeType !== 'nomina') {
      return {
        gastos: numericAmount,
        ahorro: 0,
        imprevistos: 0,
      }
    }

    const gastos = Math.round((numericAmount * safeNumber(selectedPreset.gastos)) / 100)
    const ahorro = Math.round((numericAmount * safeNumber(selectedPreset.ahorro)) / 100)
    const imprevistos = numericAmount - gastos - ahorro

    return {
      gastos,
      ahorro,
      imprevistos,
    }
  }, [numericAmount, incomeType, selectedPreset])

  const handlePresetChange = (value) => {
    setErrorMsg('')
    setSuccessMsg('')
    setPreset(value)
  }

  const handleCustomPresetChange = (field, value) => {
    setErrorMsg('')
    setSuccessMsg('')

    setCustomPreset((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const resetForm = () => {
    setAmount('')
    setDescription('')
    setIncomeType('nomina')
    setPreset('80-10-10')
    setCustomPreset({
      gastos: '',
      ahorro: '',
      imprevistos: '',
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccessMsg('')
    setErrorMsg('')

    if (!user?.id) {
      setErrorMsg('No se encontró el usuario actual.')
      return
    }

    if (!numericAmount || numericAmount <= 0) {
      setErrorMsg('Ingresa un monto válido.')
      return
    }

    if (incomeType === 'nomina' && !isPresetValid) {
      setErrorMsg('La distribución debe sumar exactamente 100%.')
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

      const distribution =
        incomeType === 'nomina'
          ? distributionPreview
          : { gastos: numericAmount, ahorro: 0, imprevistos: 0 }

      const presetPayload =
        incomeType === 'nomina'
          ? {
              preset_key: preset,
              preset_gastos: safeNumber(selectedPreset.gastos),
              preset_ahorro: safeNumber(selectedPreset.ahorro),
              preset_imprevistos: safeNumber(selectedPreset.imprevistos),
            }
          : {
              preset_key: 'adicional',
              preset_gastos: 100,
              preset_ahorro: 0,
              preset_imprevistos: 0,
            }

      const { error: txError } = await addTransaction({
        user_id: user.id,
        type: 'income',
        amount: numericAmount,
        description:
          description ||
          (incomeType === 'nomina'
            ? 'Ingreso por nómina'
            : 'Ingreso adicional'),
        income_type: incomeType,
        distribution_gastos: distribution.gastos,
        distribution_ahorro: distribution.ahorro,
        distribution_imprevistos: distribution.imprevistos,
        ...presetPayload,
      })

      if (txError) {
        console.error(txError)
        setErrorMsg('Error al guardar el ingreso.')
        setLoading(false)
        return
      }

      const { error: updateError } = await updateBalance(user.id, {
        saldo_gastos: safeNumber(balance.saldo_gastos) + safeNumber(distribution.gastos),
        saldo_ahorro: safeNumber(balance.saldo_ahorro) + safeNumber(distribution.ahorro),
        saldo_imprevistos:
          safeNumber(balance.saldo_imprevistos) + safeNumber(distribution.imprevistos),
      })

      if (updateError) {
        console.error(updateError)
        setErrorMsg('Se guardó el ingreso, pero hubo un problema actualizando el balance.')
        setLoading(false)
        return
      }

      setSuccessMsg('Ingreso guardado correctamente.')
      resetForm()
    } catch (error) {
      console.error(error)
      setErrorMsg('Ocurrió un error inesperado.')
    }

    setLoading(false)
  }

  const customStatusText =
    preset === 'custom'
      ? isPresetValid
        ? 'Preset válido. La distribución suma exactamente 100%.'
        : `La distribución actual suma ${presetTotal}%. Debe sumar exactamente 100%.`
      : ''

  return (
    <div className="page">
      <div className="page-header">
        <span className="page-kicker">Registro de ingresos</span>
        <h1 className="page-title">Registrar ingreso</h1>
        <p className="page-subtitle">
          Guarda tus ingresos y distribúyelos de forma inteligente.
        </p>
      </div>

      <div className="expense-layout">
        <div className="card expense-form-card">
          <div className="expense-card-head">
            <div>
              <h3>Nuevo ingreso</h3>
              <p className="page-subtitle">
                Define el tipo de ingreso y cómo se distribuye.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="expense-form">
            <div className="field">
              <label>Tipo de ingreso</label>
              <select
                className="select-input"
                value={incomeType}
                onChange={(e) => setIncomeType(e.target.value)}
              >
                <option value="nomina">Ingreso por nómina</option>
                <option value="adicional">Ingreso adicional</option>
              </select>
            </div>

            {incomeType === 'nomina' && (
              <>
                <div className="field">
                  <label>Preset de distribución</label>
                  <select
                    className="select-input"
                    value={preset}
                    onChange={(e) => handlePresetChange(e.target.value)}
                  >
                    <option value="80-10-10">80% Gastos · 10% Ahorro · 10% Imprevistos</option>
                    <option value="70-20-10">70% Gastos · 20% Ahorro · 10% Imprevistos</option>
                    <option value="50-30-20">50% Gastos · 20% Ahorro · 30% Imprevistos</option>
                    <option value="custom">Preset personalizado</option>
                  </select>
                </div>

                {preset === 'custom' && (
                  <>
                    <div className="income-custom-grid">
                      <div className="field">
                        <label>Gastos (%)</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          value={customPreset.gastos}
                          onChange={(e) =>
                            handleCustomPresetChange('gastos', e.target.value)
                          }
                        />
                      </div>

                      <div className="field">
                        <label>Ahorro (%)</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          value={customPreset.ahorro}
                          onChange={(e) =>
                            handleCustomPresetChange('ahorro', e.target.value)
                          }
                        />
                      </div>

                      <div className="field">
                        <label>Imprevistos (%)</label>
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="0"
                          value={customPreset.imprevistos}
                          onChange={(e) =>
                            handleCustomPresetChange('imprevistos', e.target.value)
                          }
                        />
                      </div>
                    </div>

                    <div className="expense-impact-box">
                      <p>{customStatusText}</p>
                    </div>
                  </>
                )}
              </>
            )}

            <div className="field">
              <label>Monto</label>
              <input
                type="number"
                inputMode="numeric"
                placeholder="Ej. 4000000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
              {amount && (
                <small className="helper-text">{formatCOP(numericAmount)}</small>
              )}
            </div>

            <div className="field">
              <label>Descripción</label>
              <input
                type="text"
                placeholder="Ej. Nómina marzo, freelance, venta, etc."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {errorMsg && <p className="field-error">{errorMsg}</p>}
            {successMsg && <p className="field-success">{successMsg}</p>}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar ingreso'}
            </button>
          </form>
        </div>

        <div className="card expense-preview-card">
          <div className="expense-card-head">
            <div>
              <h3>Vista previa</h3>
              <p className="page-subtitle">
                Revisa cómo se distribuirá este ingreso.
              </p>
            </div>
          </div>

          <div className="expense-preview-amount">
            <span className="label">Monto a registrar</span>
            <span className="amount amount--hero">
              {numericAmount > 0 ? formatCOP(numericAmount) : '$0'}
            </span>
          </div>

          <div className="expense-summary-list">
            <div className="expense-summary-item">
              <span className="expense-summary-label">Tipo</span>
              <span className="badge badge--accent">
                {incomeType === 'nomina' ? 'Ingreso por nómina' : 'Ingreso adicional'}
              </span>
            </div>

            <div className="expense-summary-item">
              <span className="expense-summary-label">Disponible</span>
              <span className="amount amount--small">
                {formatCOP(distributionPreview.gastos)}
              </span>
            </div>

            <div className="expense-summary-item">
              <span className="expense-summary-label">Ahorro</span>
              <span className="amount amount--small">
                {formatCOP(distributionPreview.ahorro)}
              </span>
            </div>

            <div className="expense-summary-item">
              <span className="expense-summary-label">Imprevistos</span>
              <span className="amount amount--small">
                {formatCOP(distributionPreview.imprevistos)}
              </span>
            </div>
          </div>

          <div className="expense-impact-box">
            <p>
              {incomeType === 'nomina'
                ? 'Este ingreso se repartirá según el preset elegido y quedará guardado exactamente así para futuras auditorías y eliminaciones seguras.'
                : 'Este ingreso adicional irá directamente al saldo disponible y quedará trazado para poder revertirlo sin errores.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}