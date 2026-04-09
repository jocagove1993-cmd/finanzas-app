import { useState } from 'react'
import { register } from '../services/authService'

function validatePassword(password) {
  if (password.length < 8) {
    return 'La contraseña debe tener al menos 8 caracteres.'
  }

  if (!/[A-Z]/.test(password)) {
    return 'La contraseña debe incluir al menos una letra mayúscula.'
  }

  if (!/[a-z]/.test(password)) {
    return 'La contraseña debe incluir al menos una letra minúscula.'
  }

  if (!/[0-9]/.test(password)) {
    return 'La contraseña debe incluir al menos un número.'
  }

  return null
}

export default function Register({ onSwitchToLogin }) {
  const [form, setForm] = useState({
    nombre: '',
    email: '',
    password: '',
  })

  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setSuccessMsg('')
    setLoading(true)

    const cleanName = form.nombre.trim()
    const cleanEmail = form.email.trim().toLowerCase()
    const cleanPassword = form.password.trim()

    if (!cleanName || !cleanEmail || !cleanPassword) {
      setErrorMsg('Completa todos los campos.')
      setLoading(false)
      return
    }

    const passwordError = validatePassword(cleanPassword)

    if (passwordError) {
      setErrorMsg(passwordError)
      setLoading(false)
      return
    }

    const { error } = await register({
      nombre: cleanName,
      email: cleanEmail,
      password: cleanPassword,
    })

    if (error) {
      const msg = error.message?.toLowerCase() || ''

      if (msg.includes('already registered')) {
        setErrorMsg('Ese correo ya está registrado.')
      } else {
        setErrorMsg(error.message || 'No se pudo crear la cuenta.')
      }

      setLoading(false)
      return
    }

    setSuccessMsg('Cuenta creada correctamente. Ahora puedes iniciar sesión.')
    setLoading(false)

    setTimeout(() => {
      onSwitchToLogin()
    }, 1200)
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">🚀</div>

        <span className="auth-kicker">Tu nueva etapa financiera</span>
        <h1 className="auth-title">Crear cuenta</h1>
        <p className="auth-subtitle">
          Empieza a organizar tu dinero con una estructura clara y profesional.
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field">
            <label>Nombre</label>
            <input
              type="text"
              name="nombre"
              placeholder="Tu nombre"
              value={form.nombre}
              onChange={handleChange}
              required
            />
          </div>

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
              placeholder="Mínimo 8 caracteres"
              value={form.password}
              onChange={handleChange}
              required
            />
            <small className="helper-text">
              Usa mínimo 8 caracteres, 1 mayúscula, 1 minúscula y 1 número.
            </small>
          </div>

          {errorMsg && <p className="field-error">{errorMsg}</p>}
          {successMsg && <p className="field-success">{successMsg}</p>}

          <button type="submit" className="btn-primary auth-btn" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes cuenta?{' '}
          <button
            type="button"
            className="auth-link-btn"
            onClick={onSwitchToLogin}
          >
            Iniciar sesión
          </button>
        </p>
      </div>
    </div>
  )
}