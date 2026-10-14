import { createClient, type Session, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey && !url.includes('your-project'))
export const supabase: SupabaseClient | null = isSupabaseConfigured && url && anonKey
  ? createClient(url, anonKey)
  : null

export type AuthState = {
  session: Session | null
  loading: boolean
}
