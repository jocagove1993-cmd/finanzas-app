import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!password || password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      setError('No se pudo actualizar la contraseña.')
      setLoading(false)
      return
    }

    setSuccess('Contraseña actualizada correctamente. Ya puedes iniciar sesión.')
    setLoading(false)
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <h1>Restablecer contraseña 🔐</h1>

        <form onSubmit={handleSubmit} className="auth-form">

          <div className="input-password">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? '🙈' : '👁️'}
            </span>
          </div>

          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirmar contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {error && <p className="field-error">{error}</p>}
          {success && <p className="field-success">{success}</p>}

          <button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Actualizar contraseña'}
          </button>

        </form>
      </div>
    </div>
  )
}