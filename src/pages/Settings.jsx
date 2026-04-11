import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { resetUserFinancialData } from '../services/resetService'
import { supabase } from '../lib/supabaseClient'

export default function Settings() {
  const { user, nombre } = useAuth()

  const [loadingReset, setLoadingReset] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // 🔥 NUEVO
  const [editName, setEditName] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [loadingProfile, setLoadingProfile] = useState(false)

  useEffect(() => {
    if (nombre) {
      setEditName(nombre)
    }
  }, [nombre])

  // 🔥 ACTUALIZAR NOMBRE
  const handleUpdateName = async () => {
    setErrorMsg('')
    setSuccessMsg('')

    if (!editName.trim()) {
      setErrorMsg('El nombre no puede estar vacío.')
      return
    }

    setLoadingProfile(true)

    const { error } = await supabase.auth.updateUser({
      data: { nombre: editName.trim() },
    })

    if (error) {
      setErrorMsg('No se pudo actualizar el nombre.')
      setLoadingProfile(false)
      return
    }

    setSuccessMsg('Nombre actualizado correctamente.')
    setLoadingProfile(false)
  }

  // 🔥 CAMBIAR CONTRASEÑA
  const handleChangePassword = async () => {
    setErrorMsg('')
    setSuccessMsg('')

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoadingProfile(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setErrorMsg('No se pudo cambiar la contraseña.')
      setLoadingProfile(false)
      return
    }

    setSuccessMsg('Contraseña actualizada correctamente.')
    setNewPassword('')
    setLoadingProfile(false)
  }

  // 🔥 RESET (LO TUYO, INTACTO)
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

    setSuccessMsg(
      'La aplicación fue restablecida correctamente. Recarga la app para ver todo en cero.'
    )
    setLoadingReset(false)
  }

  return (
    <div className="page">
      <h2 className="page-title">Configuración</h2>

      {/* 🔥 PERFIL */}
      <div className="form-card">
        <h3 style={{ marginBottom: '8px' }}>Perfil</h3>

        <div className="field">
          <label>Nombre</label>
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
          />
        </div>

        <div className="field">
          <label>Correo</label>
          <input type="email" value={user?.email || ''} disabled />
        </div>

        <button
          className="btn-primary"
          onClick={handleUpdateName}
          disabled={loadingProfile}
        >
          {loadingProfile ? 'Guardando...' : 'Guardar nombre'}
        </button>
      </div>

      {/* 🔥 CONTRASEÑA */}
      <div className="form-card" style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '8px' }}>Seguridad</h3>

        <div className="field">
          <label>Nueva contraseña</label>
          <input
            type="password"
            placeholder="Nueva contraseña"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </div>

        <button
          className="btn-primary"
          onClick={handleChangePassword}
          disabled={loadingProfile}
        >
          {loadingProfile ? 'Actualizando...' : 'Cambiar contraseña'}
        </button>
      </div>

      {/* 🔥 MENSAJES */}
      {(errorMsg || successMsg) && (
        <div style={{ marginTop: '20px' }}>
          {errorMsg && <p className="field-error">{errorMsg}</p>}
          {successMsg && <p className="field-success">{successMsg}</p>}
        </div>
      )}

      {/* 🔥 TU ZONA DE RIESGO (INTACTA) */}
      <div className="form-card" style={{ marginTop: '20px' }}>
        <h3 style={{ marginBottom: '8px', color: '#ffb4b4' }}>Zona de riesgo</h3>
        <p style={{ marginBottom: '16px', opacity: 0.85 }}>
          Esta acción eliminará todas tus transacciones y pondrá tus bolsas financieras en cero.
          Úsala solo si deseas empezar desde cero.
        </p>

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