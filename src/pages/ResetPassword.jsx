import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setMessage('')
    setLoading(true)

    const cleanPassword = password.trim()

    if (cleanPassword.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.updateUser({
      password: cleanPassword,
    })

    if (error) {
      setErrorMsg('No se pudo actualizar la contraseña.')
    } else {
      setMessage('Contraseña actualizada correctamente. Ya puedes iniciar sesión.')
    }

    setLoading(false)
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">🔑</div>

        <span className="auth-kicker">Seguridad</span>
        <h1 className="auth-title">Nueva contraseña</h1>
        <p className="auth-subtitle">
          Ingresa tu nueva contraseña para acceder nuevamente a tu cuenta.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>Nueva contraseña</label>
            <input
              type="password"
              placeholder="Nueva contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {errorMsg && <p className="field-error">{errorMsg}</p>}
          {message && <p className="field-success">{message}</p>}

          <button type="submit" className="btn-primary auth-btn" disabled={loading}>
            {loading ? 'Guardando...' : 'Actualizar contraseña'}
          </button>
        </form>
      </div>
    </div>
  )
}