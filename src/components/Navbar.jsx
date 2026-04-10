import { logout } from '../services/authService'

export default function Navbar(props) {
  const {
    currentView,
    setCurrentView,
    activeView,
    setActiveView,
    userName = 'Usuario',
    nombre = 'Usuario',
  } = props

  const current = currentView ?? activeView
  const setView = setCurrentView ?? setActiveView

  const handleLogout = async () => {
    const confirmLogout = window.confirm('¿Seguro que quieres cerrar sesión?')
    if (!confirmLogout) return

    await logout()
    window.location.reload()
  }

  const items = [
    { key: 'dashboard', label: 'Panel' },
    { key: 'income', label: 'Ingreso' },
    { key: 'expense', label: 'Gasto' },
    { key: 'history', label: 'Historial' },
    { key: 'goals', label: 'Metas' },
    { key: 'monthly', label: 'Mensual 📊' }, // 🔥 FIX VISUAL
    { key: 'settings', label: 'Config' }, // 🔥 más corto en móvil
  ]

  return (
    <header className="topbar">
      <div className="topbar-inner">

        <div className="brand-block">
          <div className="brand-logo">💸</div>
          <div className="brand-copy">
            <span className="brand-title">Finanzas</span>
            <span className="brand-subtitle">Control personal</span>
          </div>
        </div>

        <nav className="top-nav">
          {items.map((item) => (
            <button
              key={item.key}
              className={`top-nav-link ${current === item.key ? 'active' : ''}`}
              onClick={() => setView && setView(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="topbar-user">
          <div className="user-mini-avatar">👤</div>

          <button className="logout-btn" onClick={handleLogout}>
            Salir
          </button>
        </div>

      </div>
    </header>
  )
}