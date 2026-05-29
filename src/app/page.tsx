'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router   = useRouter()
  const [login,    setLogin]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleLogin() {
    if (!login || !password) return
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao entrar.'); setLoading(false); return }

      sessionStorage.setItem('amplify_session', JSON.stringify(data))
      router.push(data.role === 'admin' ? '/admin' : '/dashboard')
    } catch {
      setError('Erro de conexão. Tente novamente.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080C1A',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.04,
        backgroundImage: 'linear-gradient(#1B3FE4 1px, transparent 1px), linear-gradient(90deg, #1B3FE4 1px, transparent 1px)',
        backgroundSize: '60px 60px',
      }} />
      {/* Glow top-left */}
      <div style={{
        position: 'absolute', top: '-180px', left: '-120px',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(27,63,228,0.18) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      {/* Glow bottom-right */}
      <div style={{
        position: 'absolute', bottom: '-150px', right: '-100px',
        width: '420px', height: '420px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(228,0,58,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '400px' }}>
        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            gap: '10px', marginBottom: '12px',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #1B3FE4, #E4003A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', fontWeight: 900, color: 'white',
            }}>A</div>
            <span style={{ fontSize: '20px', fontWeight: 800, color: 'white', letterSpacing: '-0.02em' }}>
              Amplify
            </span>
          </div>
          <div style={{
            fontSize: '11px', fontWeight: 600, color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.15em', textTransform: 'uppercase',
          }}>
            Creator Performance
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '2rem',
          backdropFilter: 'blur(20px)',
        }}>
          <h1 style={{
            fontSize: '1.4rem', fontWeight: 800, color: 'white',
            marginBottom: '6px', letterSpacing: '-0.02em',
          }}>
            Entrar no painel
          </h1>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '1.75rem', fontWeight: 400 }}>
            Acesse seu relatório de performance
          </p>

          <label style={labelStyle}>Login</label>
          <input
            value={login}
            onChange={e => setLogin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="amplify  ou  @seutiktok"
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = '#1B3FE4'; e.target.style.background = 'rgba(27,63,228,0.08)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)' }}
          />

          <label style={{ ...labelStyle, marginTop: '1rem' }}>Senha</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••"
            style={inputStyle}
            onFocus={e => { e.target.style.borderColor = '#1B3FE4'; e.target.style.background = 'rgba(27,63,228,0.08)' }}
            onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)'; e.target.style.background = 'rgba(255,255,255,0.05)' }}
          />

          {error && (
            <div style={{
              background: 'rgba(228,0,58,0.12)', border: '1px solid rgba(228,0,58,0.3)',
              borderRadius: '10px', padding: '10px 14px',
              fontSize: '13px', color: '#FF5C7A', marginTop: '1rem', fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !login || !password}
            style={{
              width: '100%', marginTop: '1.5rem', padding: '13px',
              background: login && password
                ? 'linear-gradient(135deg, #1B3FE4 0%, #0D2DB0 100%)'
                : 'rgba(255,255,255,0.06)',
              color: login && password ? 'white' : 'rgba(255,255,255,0.25)',
              border: 'none', borderRadius: '12px',
              fontSize: '14px', fontWeight: 700, cursor: login && password ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', letterSpacing: '0.01em',
              transition: 'all 0.2s',
              boxShadow: login && password ? '0 4px 20px rgba(27,63,228,0.35)' : 'none',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar →'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>
          Amplify UGC · Acesso restrito
        </div>
      </div>

      <style>{`
        input::placeholder { color: rgba(255,255,255,0.2); }
        input { color: white !important; }
      `}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)',
  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px',
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px', fontSize: '14px',
  fontFamily: "'DM Sans', sans-serif",
  outline: 'none', boxSizing: 'border-box',
  transition: 'all 0.2s',
}
