import { supabase } from '../lib/supabaseClient'

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

  return { data, error }
}

export async function login({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
}

export async function logout() {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  return { data, error }
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  return { data, error }
}