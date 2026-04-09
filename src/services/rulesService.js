import { supabase } from '../lib/supabaseClient'
import { DEFAULT_RULES, isValidDistribution } from '../utils/financialRules'

// Obtener reglas actuales del usuario
export const getRules = async (userId) => {
  return await supabase
    .from('financial_rules')
    .select('*')
    .eq('user_id', userId)
    .single()
}

// Crear reglas por defecto si no existen
export const initRules = async (userId) => {
  return await supabase
    .from('financial_rules')
    .insert({
      user_id: userId,
      ...DEFAULT_RULES,
    })
    .select()
    .single()
}

// Actualizar reglas financieras del usuario
export const updateRules = async (userId, rules) => {
  if (!isValidDistribution(rules)) {
    return {
      error: { message: 'La distribución debe sumar 100%.' }
    }
  }

  return await supabase
    .from('financial_rules')
    .update({
      ...rules,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()
}

// Restaurar reglas por defecto
export const resetRules = async (userId) => {
  return await supabase
    .from('financial_rules')
    .update({
      ...DEFAULT_RULES,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .select()
    .single()
}