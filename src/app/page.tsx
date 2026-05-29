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
      background: 'linear-gradient(145deg, #F0F4FF 0%, #E8EEFF 50%, #F5F0FF 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', sans-serif",
      padding: '1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background soft blobs */}
      <div style={{
        position: 'absolute', top: '-100px', left: '-150px',
        width: '500px', height: '500px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(27,63,228,0.10) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-120px', right: '-120px',
        width: '450px', height: '450px', borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(228,0,58,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      {/* Subtle dot pattern */}
      <div style={{
        position: 'absolute', inset: 0, opacity: 0.35,
        backgroundImage: 'radial-gradient(circle, #B0BFEE 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '420px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.25rem' }}>
          {/* Amplify SVG Logo */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
            <svg width="180" height="56" viewBox="0 0 360 112" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Blue chevron (back) */}
              <path d="M20 56 L60 14 L80 14 L40 56 L80 98 L60 98 Z" fill="#1B3FE4"/>
              {/* Red chevron (front) */}
              <path d="M50 56 L90 14 L110 14 L70 56 L110 98 L90 98 Z" fill="#E4003A"/>
              {/* White inner triangle */}
              <path d="M70 56 L95 32 L95 80 Z" fill="white"/>
              {/* Amplify wordmark */}
              <text x="130" y="72" fontFamily="DM Sans, sans-serif" fontWeight="800" fontSize="52" fill="#1A1F3C" letterSpacing="-1">Amplify</text>
            </svg>
          </div>
          <div style={{
            fontSize: '12px', fontWeight: 600, color: '#8B95C4',
            letterSpacing: '0.18em', textTransform: 'uppercase',
          }}>
            Creator Performance
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: 'rgba(255,255,255,0.85)',
          border: '1px solid rgba(27,63,228,0.12)',
          borderRadius: '24px',
          padding: '2.25rem',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 8px 40px rgba(27,63,228,0.10), 0 1px 0 rgba(255,255,255,0.8) inset',
        }}>
          <h1 style={{
            fontSize: '1.35rem', fontWeight: 800, color: '#1A1F3C',
            marginBottom: '6px', letterSpacing: '-0.02em',
          }}>
            Entrar no painel
          </h1>
          <p style={{ fontSize: '13px', color: '#8B95C4', marginBottom: '1.75rem', fontWeight: 400 }}>
            Acesse seu relatório de performance
          </p>

          <label style={labelStyle}>Login</label>
          <input
            value={login}
            onChange={e => setLogin(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="Seu usuário"
            style={inputStyle}
            onFocus={e => {
              e.target.style.borderColor = '#1B3FE4'
              e.target.style.background = 'rgba(27,63,228,0.04)'
              e.target.style.boxShadow = '0 0 0 3px rgba(27,63,228,0.10)'
            }}
            onBlur={e => {
              e.target.style.borderColor = 'rgba(27,63,228,0.15)'
              e.target.style.background = 'rgba(255,255,255,0.8)'
              e.target.style.boxShadow = 'none'
            }}
          />

          <label style={{ ...labelStyle, marginTop: '1rem' }}>Senha</label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            placeholder="••••••"
            style={inputStyle}
            onFocus={e => {
              e.target.style.borderColor = '#1B3FE4'
              e.target.style.background = 'rgba(27,63,228,0.04)'
              e.target.style.boxShadow = '0 0 0 3px rgba(27,63,228,0.10)'
            }}
            onBlur={e => {
              e.target.style.borderColor = 'rgba(27,63,228,0.15)'
              e.target.style.background = 'rgba(255,255,255,0.8)'
              e.target.style.boxShadow = 'none'
            }}
          />

          {error && (
            <div style={{
              background: 'rgba(228,0,58,0.07)', border: '1px solid rgba(228,0,58,0.25)',
              borderRadius: '10px', padding: '10px 14px',
              fontSize: '13px', color: '#C5003A', marginTop: '1rem', fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading || !login || !password}
            style={{
              width: '100%', marginTop: '1.5rem', padding: '14px',
              background: login && password
                ? 'linear-gradient(135deg, #1B3FE4 0%, #0D2DB0 100%)'
                : '#E8ECFA',
              color: login && password ? 'white' : '#9BA5D0',
              border: 'none', borderRadius: '12px',
              fontSize: '14px', fontWeight: 700, cursor: login && password ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', letterSpacing: '0.01em',
              transition: 'all 0.2s',
              boxShadow: login && password ? '0 4px 20px rgba(27,63,228,0.30)' : 'none',
            }}
          >
            {loading ? 'Entrando...' : 'Entrar →'}
          </button>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '11px', color: '#B0BFEE' }}>
          Amplify UGC · Acesso restrito
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        input::placeholder { color: #B0BFEE; }
      `}</style>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px', fontWeight: 700, color: '#6B78B0',
  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px',
  background: 'rgba(255,255,255,0.8)',
  border: '1.5px solid rgba(27,63,228,0.15)',
  borderRadius: '10px', fontSize: '14px', color: '#1A1F3C',
  fontFamily: "'DM Sans', sans-serif",
  outline: 'none', boxSizing: 'border-box',
  transition: 'all 0.2s',
}
