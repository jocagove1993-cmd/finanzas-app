import { useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { resetUserFinancialData } from '../services/resetService'

export default function Settings() {
  const { user, nombre } = useAuth()
  const [loadingReset, setLoadingReset] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleReset = async () => {
    setSuccessMsg('')
    setErrorMsg('')

    const confirmed = window.confirm(
      '⚠️ Esto borrará TODO tu historial financiero y pondrá tus saldos en cero.\n\n¿Seguro que quieres continuar?'
    )

    if (!confirmed) return

    if (!user?.id) {
      setErrorMsg('No se pudo identificar el usuario actual.')
      return
    }

    setLoadingReset(true)

    const { error } = await resetUserFinancialData(user.id)

    if (error) {
      console.error(error)
      setErrorMsg('No se pudo restablecer la aplicación.')
      setLoadingReset(false)
      return
    }

    setSuccessMsg('La aplicación fue restablecida correctamente. Recarga la app para ver todo en cero.')
    setLoadingReset(false)
  }

  return (
    <div className="page">
      <h2 className="page-title">Configuración</h2>

      <div className="form-card">
        <h3 style={{ marginBottom: '8px' }}>Perfil</h3>
        <p><strong>Nombre:</strong> {nombre || 'Usuario'}</p>
        <p><strong>Correo:</strong> {user?.email || 'Sin correo'}</p>
      </div>

      <div className="form-card" style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '8px', color: '#ffb4b4' }}>Zona de riesgo</h3>
        <p style={{ marginBottom: '16px', opacity: 0.85 }}>
          Esta acción eliminará todas tus transacciones y pondrá tus bolsas financieras en cero.
          Úsala solo si deseas empezar desde cero.
        </p>

        {errorMsg && <p className="field-error">{errorMsg}</p>}
        {successMsg && <p className="field-success">{successMsg}</p>}

        <button
          type="button"
          className="btn-primary"
          onClick={handleReset}
          disabled={loadingReset}
          style={{
            background: 'linear-gradient(135deg, #ff5f6d, #ffc371)',
            color: '#111',
            fontWeight: '700',
          }}
        >
          {loadingReset ? 'Restableciendo...' : 'Restablecer aplicación'}
        </button>
      </div>
    </div>
  )
}