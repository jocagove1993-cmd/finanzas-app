import { useState } from 'react'
import { login } from '../services/authService'

export default function Login({ onSwitchToRegister, onSwitchToForgot }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
  })

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    const cleanEmail = form.email.trim().toLowerCase()
    const cleanPassword = form.password.trim()

    if (!cleanEmail || !cleanPassword) {
      setErrorMsg('Completa todos los campos.')
      setLoading(false)
      return
    }

    const { error } = await login({
      email: cleanEmail,
      password: cleanPassword,
    })

    if (error) {
      const msg = error.message?.toLowerCase() || ''

      if (
        msg.includes('invalid login credentials') ||
        msg.includes('invalid email or password') ||
        msg.includes('invalid_credentials')
      ) {
        setErrorMsg('Correo o contraseña incorrecta.')
      } else if (
        msg.includes('email not confirmed') ||
        msg.includes('email_not_confirmed') ||
        msg.includes('confirm your email')
      ) {
        setErrorMsg('Debes confirmar tu correo antes de iniciar sesión.')
      } else {
        setErrorMsg(error.message || 'No se pudo iniciar sesión.')
      }

      setLoading(false)
      return
    }

    setLoading(false)
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">💳</div>

        <span className="auth-kicker">Bienvenido de nuevo</span>
        <h1 className="auth-title">Iniciar sesión</h1>
        <p className="auth-subtitle">
          Entra a tu panel financiero y retoma el control de tu dinero.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>Correo electrónico</label>
            <input
              type="email"
              name="email"
              placeholder="tu@correo.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <div className="field">
            <label>Contraseña</label>
            <input
              type="password"
              name="password"
              placeholder="Tu contraseña"
              value={form.password}
              onChange={handleChange}
              required
            />
          </div>

          {errorMsg && <p className="field-error">{errorMsg}</p>}

          <button type="submit" className="btn-primary auth-btn" disabled={loading}>
            {loading ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

        {/* 🔥 AQUÍ ESTÁ EL CAMBIO CORRECTO */}
        <p
          style={{
            marginTop: '12px',
            fontSize: '14px',
            color: '#6b7280',
            cursor: 'pointer',
            textAlign: 'center',
          }}
          onClick={onSwitchToForgot}
        >
          ¿Olvidaste tu contraseña?
        </p>

        <p className="auth-footer">
          ¿No tienes cuenta?{' '}
          <button
            type="button"
            className="auth-link-btn"
            onClick={onSwitchToRegister}
          >
            Crear cuenta
          </button>
        </p>
      </div>
    </div>
  )
}