import { useState } from 'react'
import { useAuth } from './hooks/useAuth'

import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'

import Dashboard from './pages/Dashboard'
import AddIncome from './pages/AddIncome'
import AddExpense from './pages/AddExpense'
import History from './pages/History'
import Settings from './pages/Settings'
import SavingsGoals from './pages/SavingsGoals'
import MonthlyHistory from './pages/MonthlyHistory'

export default function App() {
  const { user, nombre, loading } = useAuth()

  const [authView, setAuthView] = useState('login')
  const [activeView, setActiveView] = useState('dashboard')

  // 🔥 DETECTAR RECOVERY
  const hash = window.location.hash || ''
  const isRecovery =
    hash.includes('type=recovery') ||
    (hash.includes('access_token') && hash.includes('refresh_token'))

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
      </div>
    )
  }

  // 🔥 PRIORIDAD TOTAL (ANTES DE TODO)
  if (isRecovery) {
    return <ResetPassword />
  }

  // 🔥 IMPORTANTE: SOLO BLOQUEA AUTH SI NO ES RECOVERY
  if (!user) {
    if (authView === 'login') {
      return (
        <Login
          onSwitchToRegister={() => setAuthView('register')}
          onSwitchToForgot={() => setAuthView('forgot')}
        />
      )
    }

    if (authView === 'register') {
      return <Register onSwitchToLogin={() => setAuthView('login')} />
    }

    if (authView === 'forgot') {
      return <ForgotPassword onBackToLogin={() => setAuthView('login')} />
    }
  }

  // 🔥 APP NORMAL
  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard />
      case 'income':
        return <AddIncome />
      case 'expense':
        return <AddExpense />
      case 'history':
        return <History />
      case 'goals':
        return <SavingsGoals />
      case 'monthly':
        return <MonthlyHistory />
      case 'settings':
        return <Settings />
      default:
        return <Dashboard />
    }
  }

  return (
    <>
      <Navbar
        activeView={activeView}
        setActiveView={setActiveView}
        nombre={nombre}
      />
      {renderView()}
    </>
  )
}