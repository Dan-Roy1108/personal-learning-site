import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../services/supabase'
import { setCloudUser, syncUserData } from '../services/cloudSync'

type AuthContextValue = {
  user: User | null
  loading: boolean
  syncing: boolean
  syncVersion: number
  error: string
  configured: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncVersion, setSyncVersion] = useState(0)
  const [error, setError] = useState('')

  const applyUser = async (nextUser: User | null) => {
    setUser(nextUser)
    setCloudUser(nextUser?.id ?? null)
    if (!nextUser || !supabase) { setSyncing(false); setSyncVersion((value) => value + 1); return }
    setSyncing(true); setError('')
    try { await syncUserData(nextUser.id); setSyncVersion((value) => value + 1) } catch (syncError) { setError(syncError instanceof Error ? syncError.message : '同步失败，请稍后重试') } finally { setSyncing(false) }
  }

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    let active = true
    void supabase.auth.getSession().then(({ data }) => { if (active) { void applyUser(data.session?.user ?? null); setLoading(false) } })
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => { void applyUser(session?.user ?? null) })
    return () => { active = false; listener.subscription.unsubscribe() }
  }, [])

  const signIn = async (email: string, password: string) => {
    if (!supabase) return
    setError(''); const { error: authError } = await supabase.auth.signInWithPassword({ email, password }); if (authError) throw authError
  }
  const signUp = async (email: string, password: string) => {
    if (!supabase) return
    const emailRedirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
    setError(''); const { error: authError } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo } }); if (authError) throw authError
  }
  const signOut = async () => { if (supabase) { const { error: authError } = await supabase.auth.signOut(); if (authError) throw authError } }
  const value = useMemo(() => ({ user, loading, syncing, syncVersion, error, configured: isSupabaseConfigured, signIn, signUp, signOut }), [user, loading, syncing, syncVersion, error])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('useAuth must be used within AuthProvider'); return value }
