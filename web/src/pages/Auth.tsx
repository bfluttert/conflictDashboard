import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useLocation } from 'react-router-dom'

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
      }
      const redirectTo = (location.state as any)?.from ?? '/'
      navigate(redirectTo)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white text-black flex items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm border rounded p-4 shadow bg-white">
        <div className="text-lg font-semibold mb-2">{mode === 'signin' ? 'Log in' : 'Sign up'}</div>
        <label className="block text-sm mb-1">Email</label>
        <input
          className="w-full border rounded p-2 mb-3"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <label className="block text-sm mb-1">Password</label>
        <input
          className="w-full border rounded p-2 mb-3"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <button disabled={loading} className="w-full bg-black text-white rounded py-2 disabled:opacity-50">
          {loading ? 'Please wait…' : mode === 'signin' ? 'Log in' : 'Sign up'}
        </button>
        <div className="text-xs text-gray-600 mt-3">
          {mode === 'signin' ? (
            <button type="button" className="underline" onClick={() => setMode('signup')}>Need an account? Sign up</button>
          ) : (
            <button type="button" className="underline" onClick={() => setMode('signin')}>Have an account? Log in</button>
          )}
        </div>
      </form>
    </div>
  )
}
