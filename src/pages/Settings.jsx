import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { resetUserFinancialData } from '../services/resetService'
import { supabase } from '../lib/supabaseClient'

export default function Settings() {
  const { user, nombre } = useAuth()

  const [loadingReset, setLoadingReset] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const [editName, setEditName] = useState('')
  const [showPasswordForm, setShowPasswordForm] = useState(false)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loadingProfile, setLoadingProfile] = useState(false)

  useEffect(() => {
    if (nombre) setEditName(nombre)
  }, [nombre])

  // 🔹 ACTUALIZAR NOMBRE
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

  // 🔹 CAMBIAR CONTRASEÑA
  const handleChangePassword = async () => {
    setErrorMsg('')
    setSuccessMsg('')

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.')
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
    setConfirmPassword('')
    setShowPasswordForm(false)
    setLoadingProfile(false)
  }

  // 🔹 RESET (LO TUYO)
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
      setErrorMsg('No se pudo restablecer la aplicación.')
      setLoadingReset(false)
      return
    }

    setSuccessMsg('La aplicación fue restablecida correctamente.')
    setLoadingReset(false)
  }

  return (
    <div className="page">
      <h2 className="page-title">Configuración</h2>

      {/* PERFIL */}
      <div className="form-card">
        <h3>Perfil</h3>

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

        <button className="btn-primary" onClick={handleUpdateName}>
          Guardar nombre
        </button>
      </div>

      {/* SEGURIDAD */}
      <div className="form-card" style={{ marginTop: '20px' }}>
        <h3>Seguridad</h3>

        {!showPasswordForm ? (
          <button
            className="btn-primary"
            onClick={() => setShowPasswordForm(true)}
          >
            Cambiar contraseña
          </button>
        ) : (
          <>
            <div className="field">
              <label>Nueva contraseña</label>
              <div className="input-password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <span onClick={() => setShowPassword(!showPassword)}>👁️</span>
              </div>
            </div>

            <div className="field">
              <label>Confirmar contraseña</label>
              <div className="input-password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button className="btn-primary" onClick={handleChangePassword}>
              Guardar contraseña
            </button>
          </>
        )}
      </div>

      {/* MENSAJES */}
      {errorMsg && <p className="field-error">{errorMsg}</p>}
      {successMsg && <p className="field-success">{successMsg}</p>}

      {/* ZONA DE RIESGO */}
      <div className="form-card" style={{ marginTop: '20px' }}>
        <h3 style={{ color: '#ffb4b4' }}>Zona de riesgo</h3>

        <button className="btn-primary" onClick={handleReset}>
          {loadingReset ? 'Restableciendo...' : 'Restablecer aplicación'}
        </button>
      </div>
    </div>
  )
}