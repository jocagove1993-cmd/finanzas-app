import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import Navbar from './components/Navbar'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import AddIncome from './pages/AddIncome'
import AddExpense from './pages/AddExpense'
import History from './pages/History'
import Settings from './pages/Settings'
import SavingsGoals from './pages/SavingsGoals'

export default function App() {
  const { user, nombre, loading } = useAuth()
  const [authView, setAuthView] = useState('login')
  const [activeView, setActiveView] = useState('dashboard')

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner" />
      </div>
    )
  }

  if (!user) {
    return authView === 'login' ? (
      <Login onSwitchToRegister={() => setAuthView('register')} />
    ) : (
      <Register onSwitchToLogin={() => setAuthView('login')} />
    )
  }

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