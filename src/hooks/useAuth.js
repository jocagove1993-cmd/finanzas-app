import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'

export const useAuth = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 🔹 Cargar sesión inicial
    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Error obteniendo sesión:', error)
      }

      setUser(data?.session?.user ?? null)
      setLoading(false)
    }

    loadSession()

    // 🔹 Escuchar cambios de sesión (login / logout)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false) // 🔥 clave para evitar pantalla azul
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const nombre =
    user?.user_metadata?.nombre ||
    user?.email?.split('@')[0] ||
    'Usuario'

  return { user, loading, nombre }
}