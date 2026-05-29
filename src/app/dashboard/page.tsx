'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

// ── Types ─────────────────────────────────────────────────────
interface Creator {
  id: string; nome: string; handle: string; categoria: string
  gmv: number; comissao: number; amplifyRevenue: number
}
interface Summary {
  total: number; active: number; totalGmv: number; totalCom: number; amplifyTotal: number
  updatedAt: string; firstDate: string; lastDate: string
}
interface WeekPoint { date: string; gmv: number; comissao: number; amplifyRevenue: number }

// ── Constants ─────────────────────────────────────────────────
const fmtBRL  = (n: number) => 'R$\u00a0' + n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtBRLd = (n: number) => 'R$\u00a0' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtWeek = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return `${d.getDate()}/${d.getMonth() + 1}` }
const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

const CAT_CONFIG: Record<string, { color: string; bg: string; badge: string; label: string; border: string }> = {
  Diamond: { color: '#2563EB', bg: 'rgba(37,99,235,0.10)',  border: 'rgba(37,99,235,0.20)',  badge: '💎', label: 'Diamond' },
  Gold:    { color: '#D97706', bg: 'rgba(217,119,6,0.10)',   border: 'rgba(217,119,6,0.20)',   badge: '🥇', label: 'Gold'    },
  Silver:  { color: '#64748B', bg: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.20)', badge: '🥈', label: 'Silver'  },
  Start:   { color: '#1B3FE4', bg: 'rgba(27,63,228,0.10)',   border: 'rgba(27,63,228,0.20)',   badge: '🚀', label: 'Start'   },
  Safira:  { color: '#7C3AED', bg: 'rgba(124,58,237,0.10)',  border: 'rgba(124,58,237,0.20)',  badge: '💜', label: 'Safira'  },
  Origens: { color: '#059669', bg: 'rgba(5,150,105,0.10)',   border: 'rgba(5,150,105,0.20)',   badge: '🌱', label: 'Origens' },
}

const CHART_METRICS = [
  { key: 'gmv',      label: 'Meu GMV',  color: '#1B3FE4' },
  { key: 'comissao', label: 'Comissão', color: '#D97706' },
] as const

// ── Amplify Logo SVG ──────────────────────────────────────────
function AmplifyLogo({ size = 28 }: { size?: number }) {
  const s = size / 28
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 14 L10 4 L14 4 L6 14 L14 24 L10 24 Z" fill="#1B3FE4"/>
      <path d="M10 14 L18 4 L22 4 L14 14 L22 24 L18 24 Z" fill="#E4003A"/>
      <path d="M16 14 L21 8 L21 20 Z" fill="white"/>
    </svg>
  )
}

export default function CreatorDashboard() {
  const router = useRouter()
  const [user,      setUser]      = useState<{ handle: string; name: string; categoria: string } | null>(null)
  const [creator,   setCreator]   = useState<Creator | null>(null)
  const [summary,   setSummary]   = useState<Summary | null>(null)
  const [weekData,  setWeekData]  = useState<WeekPoint[]>([])
  const [loading,   setLoading]   = useState(true)
  const [metric,    setMetric]    = useState<'gmv' | 'comissao'>('gmv')
  const [startDate, setStartDate] = useState('')
  const [endDate,   setEndDate]   = useState('')
  const [applied,   setApplied]   = useState({ start: '', end: '' })

  useEffect(() => {
    const s = sessionStorage.getItem('amplify_session')
    if (!s) { router.push('/'); return }
    const u = JSON.parse(s)
    if (u.role === 'admin') { router.push('/admin'); return }
    setUser(u)
  }, [router])

  useEffect(() => {
    if (!user) return
    setLoading(true)
    const params = new URLSearchParams({ handle: user.handle })
    if (applied.start) params.set('startDate', applied.start)
    if (applied.end)   params.set('endDate', applied.end)

    fetch(`/api/data?${params}`)
      .then(r => r.json())
      .then(d => {
        setSummary(d.summary)
        const c = d.creators?.[0] ?? null
        setCreator(c)
        if (c && d.weeklyByCreator?.[c.handle]) {
          setWeekData(
            d.weeklyByCreator[c.handle].map((w: any) => ({
              ...w, amplifyRevenue: w.comissao * 0.10,
            }))
          )
        } else {
          setWeekData(d.weeklyAmplifyData ?? [])
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [user, applied])

  if (!user || loading) return <LoadingScreen />
  if (!creator && !loading) return <NotFoundScreen handle={user.handle} onLogout={() => { sessionStorage.clear(); router.push('/') }} />

  const cfg = CAT_CONFIG[user.categoria] ?? CAT_CONFIG['Start']

  const lastWeek = weekData[weekData.length - 1]
  const prevWeek = weekData[weekData.length - 2]
  const diff = lastWeek && prevWeek ? (lastWeek[metric] ?? 0) - (prevWeek[metric] ?? 0) : 0
  const pct  = prevWeek?.[metric] ? (diff / prevWeek[metric] * 100) : 0

  return (
    <div style={{ background: '#F4F6FB', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", color: '#1A1F3C' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-thumb { background: rgba(27,63,228,0.15); border-radius: 2px }
        .cont { max-width: 900px; margin: 0 auto; padding: 1.5rem 1.25rem }
        .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px }
        .g3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px }
        input[type="date"] { color-scheme: light }
        @media(max-width:600px){.g2{grid-template-columns:1fr}.g3{grid-template-columns:1fr 1fr}}
      `}</style>

      {/* Header */}
      <header style={{
        background: 'rgba(255,255,255,0.92)',
        borderBottom: '1px solid rgba(27,63,228,0.08)',
        padding: '0.875rem 1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(20px)',
        boxShadow: '0 1px 16px rgba(27,63,228,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <AmplifyLogo size={32} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '14px', color: '#1A1F3C' }}>
              {user.name || `@${user.handle}`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
              <span style={{
                fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '100px',
                background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
              }}>
                {cfg.badge} {cfg.label}
              </span>
              <span style={{ fontSize: '10px', color: '#8B95C4', fontFamily: "'DM Mono', monospace" }}>@{user.handle}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: '#8B95C4' }}>Período:</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={dateInputStyle} />
          <span style={{ fontSize: '11px', color: '#B0BFEE' }}>até</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={dateInputStyle} />
          <button onClick={() => setApplied({ start: startDate, end: endDate })} style={btnPrimary}>
            Filtrar
          </button>
          {(applied.start || applied.end) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); setApplied({ start: '', end: '' }) }}
              style={btnGhost}>×</button>
          )}
          <button onClick={() => { sessionStorage.clear(); router.push('/') }} style={btnGhost}>
            Sair
          </button>
        </div>
      </header>

      <div className="cont">

        {/* Hero do creator */}
        <div style={{
          background: `linear-gradient(135deg, ${cfg.color}12 0%, rgba(255,255,255,0.6) 100%)`,
          border: `1px solid ${cfg.border}`,
          borderRadius: '20px', padding: '1.5rem',
          marginTop: '1.25rem', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
          boxShadow: `0 4px 24px ${cfg.color}10`,
        }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${cfg.color}30, ${cfg.color}10)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', flexShrink: 0,
            border: `2px solid ${cfg.border}`,
          }}>
            {cfg.badge}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px', color: '#1A1F3C' }}>
              {user.name || `@${user.handle}`}
            </div>
            <div style={{ fontSize: '13px', color: '#8B95C4', fontFamily: "'DM Mono', monospace" }}>
              @{user.handle}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: '#8B95C4', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Nível
            </div>
            <div style={{
              fontSize: '1rem', fontWeight: 800, color: cfg.color,
              padding: '6px 16px', background: cfg.bg, borderRadius: '100px',
              border: `1px solid ${cfg.border}`,
            }}>
              {cfg.badge} {cfg.label}
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="g3" style={{ marginBottom: '1.25rem' }}>
          <KpiCard
            label="Meu GMV"
            value={creator ? fmtBRL(creator.gmv) : 'R$\u00a00'}
            sub="total vendido"
            color={cfg.color}
            accent
          />
          <KpiCard
            label="Comissão estimada"
            value={creator ? fmtBRL(creator.comissao) : 'R$\u00a00'}
            sub="ganhos do TikTok"
            color="#D97706"
          />
          <KpiCard
            label="Status"
            value={creator && creator.gmv > 0 ? 'Ativo ✓' : 'Sem vendas'}
            sub="período selecionado"
            color={creator && creator.gmv > 0 ? '#059669' : '#94A3B8'}
          />
        </div>

        {/* Mensagem motivacional */}
        {creator && creator.gmv > 0 && (
          <div style={{
            background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.18)',
            borderRadius: '12px', padding: '12px 16px', marginBottom: '1.25rem',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ fontSize: '18px' }}>🎯</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#059669' }}>
                Você gerou {fmtBRL(creator.gmv)} em GMV!
              </div>
              <div style={{ fontSize: '11px', color: '#8B95C4', marginTop: '2px' }}>
                Sua comissão estimada do TikTok é de {fmtBRLd(creator.comissao)}.
              </div>
            </div>
          </div>
        )}

        {/* Gráfico semanal */}
        {weekData.length > 1 && (
          <div style={{ ...cardStyle, marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
              <div style={sectionLabel as any}>Evolução semanal</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {CHART_METRICS.map(m => (
                  <button key={m.key} onClick={() => setMetric(m.key)}
                    style={{
                      fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px',
                      border: `1px solid ${metric === m.key ? m.color : 'rgba(27,63,228,0.15)'}`,
                      cursor: 'pointer',
                      background: metric === m.key ? m.color : 'white',
                      color: metric === m.key ? 'white' : '#8B95C4',
                    }}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={weekData}>
                <defs>
                  <linearGradient id="cgrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_METRICS.find(m => m.key === metric)?.color ?? '#1B3FE4'} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART_METRICS.find(m => m.key === metric)?.color ?? '#1B3FE4'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,63,228,0.06)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtWeek} tick={{ fontSize: 10, fill: '#8B95C4' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'white', border: '1px solid rgba(27,63,228,0.12)', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 16px rgba(27,63,228,0.10)' }}
                  labelStyle={{ color: '#8B95C4' }}
                  formatter={(v: number) => [fmtBRLd(v), CHART_METRICS.find(m => m.key === metric)?.label ?? '']}
                  labelFormatter={l => fmtDate(l)}
                />
                <Area
                  type="monotone"
                  dataKey={metric}
                  stroke={CHART_METRICS.find(m => m.key === metric)?.color ?? '#1B3FE4'}
                  strokeWidth={2.5}
                  fill="url(#cgrad)"
                  dot={{ r: 3, fill: CHART_METRICS.find(m => m.key === metric)?.color ?? '#1B3FE4', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
            {lastWeek && prevWeek && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '16px', fontSize: '11px', flexWrap: 'wrap' }}>
                <span style={{ color: '#8B95C4' }}>
                  Última semana: <strong style={{ color: '#1A1F3C' }}>{fmtBRLd(lastWeek[metric] ?? 0)}</strong>
                </span>
                <span style={{ color: diff >= 0 ? '#059669' : '#DC2626', fontWeight: 700 }}>
                  {diff >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}% vs semana anterior
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tabela semanal */}
        {weekData.filter(w => w.gmv > 0).length > 0 && (
          <div style={{ ...cardStyle, marginBottom: '1.25rem' }}>
            <div style={{ ...sectionLabel as any, marginBottom: '1rem' }}>Detalhe semanal</div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(27,63,228,0.08)' }}>
                    {['Semana', 'GMV', 'Comissão'].map((h, i) => (
                      <th key={h} style={{
                        padding: '8px 10px', textAlign: i > 0 ? 'right' : 'left',
                        fontWeight: 700, color: '#8B95C4', fontSize: '10px',
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...weekData].reverse().filter(w => w.gmv > 0).map((w) => (
                    <tr key={w.date} style={{ borderBottom: '1px solid rgba(27,63,228,0.05)' }}>
                      <td style={{ padding: '9px 10px', color: '#8B95C4', fontFamily: "'DM Mono', monospace", fontSize: '11px' }}>
                        {fmtDate(w.date)}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#1A1F3C', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtBRL(w.gmv)}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600, color: '#D97706', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtBRL(w.comissao)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Nota de cálculo */}
        <div style={{
          background: 'rgba(27,63,228,0.04)', border: '1px solid rgba(27,63,228,0.09)',
          borderRadius: '10px', padding: '10px 14px',
          fontSize: '11px', color: '#8B95C4',
        }}>
          💡 Os valores de GMV e comissão são estimativas baseadas nos relatórios semanais do TikTok Partner Center.
          A comissão mostrada é a estimada pelo TikTok — valores finais podem variar.
          Atualizado em {summary ? new Date(summary.updatedAt).toLocaleString('pt-BR') : '—'} · Cache 5 min.
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────
function KpiCard({ label, value, sub, color, accent }: { label: string; value: string; sub: string; color: string; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? `linear-gradient(135deg, ${color}10, white)` : 'white',
      border: `1px solid ${accent ? color + '25' : 'rgba(27,63,228,0.09)'}`,
      borderRadius: '14px', padding: '1rem 1.1rem',
      boxShadow: accent ? `0 4px 20px ${color}12` : '0 1px 8px rgba(27,63,228,0.05)',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#8B95C4', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', color: '#B0BFEE', fontWeight: 500 }}>{sub}</div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F4F6FB', flexDirection: 'column', gap: '14px' }}>
      <div style={{ width: '36px', height: '36px', border: '2px solid rgba(27,63,228,0.12)', borderTop: '2px solid #1B3FE4', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: '13px', color: '#8B95C4', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>Carregando seu painel...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function NotFoundScreen({ handle, onLogout }: { handle: string; onLogout: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F4F6FB', flexDirection: 'column', gap: '12px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ fontSize: '2rem' }}>🔍</div>
      <div style={{ fontSize: '14px', color: '#1A1F3C', fontWeight: 600 }}>Creator @{handle} não encontrado</div>
      <div style={{ fontSize: '12px', color: '#8B95C4' }}>Verifique se o @ está correto ou contate a Amplify</div>
      <button onClick={onLogout} style={{ marginTop: '8px', ...btnGhost }}>← Voltar ao login</button>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'white',
  border: '1px solid rgba(27,63,228,0.09)',
  borderRadius: '16px', padding: '1.25rem',
  boxShadow: '0 1px 8px rgba(27,63,228,0.05)',
}

const sectionLabel: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: '#8B95C4',
  letterSpacing: '0.08em', textTransform: 'uppercase',
}

const dateInputStyle: React.CSSProperties = {
  fontSize: '11px', padding: '4px 8px', borderRadius: '8px',
  border: '1px solid rgba(27,63,228,0.15)', background: 'white',
  color: '#1A1F3C', outline: 'none', fontFamily: "'DM Sans', sans-serif",
}

const btnPrimary: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '8px',
  border: 'none', background: '#1B3FE4', color: 'white', cursor: 'pointer',
}

const btnGhost: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, padding: '5px 10px', borderRadius: '8px',
  border: '1px solid rgba(27,63,228,0.15)', background: 'white',
  color: '#6B78B0', cursor: 'pointer',
}
