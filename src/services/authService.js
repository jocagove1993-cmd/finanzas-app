import { supabase } from '../lib/supabaseClient'

// ==========================================
// 🧾 REGISTRO DE USUARIO
// ==========================================
export async function register({ nombre, email, password }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        nombre,
      },
    },
  })

  if (error) {
    return { data: null, error }
  }

  if (!data.session) {
    return {
      data,
      error: null,
      needsConfirmation: true,
    }
  }

  return {
    data,
    error: null,
    needsConfirmation: false,
  }
}

// ==========================================
// 🔐 LOGIN
// ==========================================
export async function login({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

// ==========================================
// 🚪 LOGOUT
// ==========================================
export async function logout() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

// ==========================================
// 📦 SESIÓN ACTUAL
// ==========================================
export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  return { data, error }
}

// ==========================================
// 👤 USUARIO ACTUAL
// ==========================================
export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  return { data, error }
}

// ==========================================
// 🔁 RECUPERAR CONTRASEÑA (FIX REAL)
// ==========================================
export async function resetPassword(email) {
  if (!email) {
    throw new Error('El correo es obligatorio')
  }

  const redirectUrl = window.location.origin

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: redirectUrl,
  })

  if (error) {
    console.error('ERROR RESET:', error)
    throw error
  }

  return true
}