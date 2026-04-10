import { useState } from 'react'
import { resetPassword } from '../services/authService'

export default function ForgotPassword({ onBackToLogin }) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setMessage('')
    setLoading(true)

    const cleanEmail = email.trim().toLowerCase()

    if (!cleanEmail) {
      setErrorMsg('Ingresa tu correo.')
      setLoading(false)
      return
    }

    try {
      await resetPassword(cleanEmail)
      setMessage('Revisa tu correo para restablecer tu contraseña.')
    } catch (error) {
      setErrorMsg('No se pudo enviar el correo.')
    }

    setLoading(false)
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">🔐</div>

        <span className="auth-kicker">Recuperación de acceso</span>
        <h1 className="auth-title">Recuperar contraseña</h1>
        <p className="auth-subtitle">
          Ingresa tu correo y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>Correo electrónico</label>
            <input
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {errorMsg && <p className="field-error">{errorMsg}</p>}
          {message && <p className="field-success">{message}</p>}

          <button type="submit" className="btn-primary auth-btn" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar enlace'}
          </button>
        </form>

        <p className="auth-footer">
          <button
            type="button"
            className="auth-link-btn"
            onClick={onBackToLogin}
          >
            Volver a iniciar sesión
          </button>
        </p>
      </div>
    </div>
  )
}