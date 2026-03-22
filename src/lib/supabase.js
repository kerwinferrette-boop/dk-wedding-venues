import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xrgzaovididcizstwswy.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_feE5EFiIqR14CGYTElCCAg_nfP3Nv8V'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const USERS = {
  kerwin: { id: 'kerwin', label: 'Kerwin', color: '#A51C30' },
  dani: { id: 'dani', label: 'Dani', color: '#2D6A4F' },
}

export function getCurrentUser() {
  return localStorage.getItem('wos_user') || null
}

export function setCurrentUser(userId) {
  localStorage.setItem('wos_user', userId)
}

export function clearCurrentUser() {
  localStorage.removeItem('wos_user')
}
