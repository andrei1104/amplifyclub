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

const CAT_CONFIG: Record<string, { color: string; bg: string; badge: string; label: string }> = {
  Diamond: { color: '#60A5FA', bg: 'rgba(96,165,250,0.15)', badge: '💎', label: 'Diamond' },
  Gold:    { color: '#FBBF24', bg: 'rgba(251,191,36,0.15)',  badge: '🥇', label: 'Gold'    },
  Silver:  { color: '#A3A3A3', bg: 'rgba(163,163,163,0.15)', badge: '🥈', label: 'Silver'  },
  Start:   { color: '#FB923C', bg: 'rgba(251,146,60,0.15)',  badge: '🚀', label: 'Start'   },
  Safira:  { color: '#C084FC', bg: 'rgba(192,132,252,0.15)', badge: '💜', label: 'Safira'  },
  Origens: { color: '#34D399', bg: 'rgba(52,211,153,0.15)',  badge: '🌱', label: 'Origens' },
}

const CHART_METRICS = [
  { key: 'gmv',      label: 'Meu GMV',     color: '#1B3FE4' },
  { key: 'comissao', label: 'Comissão',     color: '#FBBF24' },
] as const

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

  // Ranking estimado simples baseado na categoria
  const catOrder: Record<string, number> = { Safira: 0, Diamond: 1, Gold: 2, Silver: 3, Start: 4, Origens: 5 }
  const catRank = catOrder[user.categoria] ?? 5

  return (
    <div style={{ background: '#080C1A', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", color: 'white' }}>
      <style>{`
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px }
        .cont { max-width: 900px; margin: 0 auto; padding: 1.5rem 1.25rem }
        .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px }
        .g3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px }
        input[type="date"] { color-scheme: dark }
        @media(max-width:600px){.g2{grid-template-columns:1fr}.g3{grid-template-columns:1fr 1fr}}
      `}</style>

      {/* Header */}
      <header style={{
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0.875rem 1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #1B3FE4, #E4003A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 900,
          }}>A</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '14px' }}>
              {user.name || `@${user.handle}`}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '1px' }}>
              <span style={{
                fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '100px',
                background: cfg.bg, color: cfg.color,
              }}>
                {cfg.badge} {cfg.label}
              </span>
              <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>@{user.handle}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Período:</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={dateInputStyle} />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>até</span>
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
          background: `linear-gradient(135deg, ${cfg.color}18 0%, rgba(255,255,255,0.02) 100%)`,
          border: `1px solid ${cfg.color}25`,
          borderRadius: '20px', padding: '1.5rem',
          marginTop: '1.25rem', marginBottom: '1.25rem',
          display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap',
        }}>
          {/* Avatar placeholder */}
          <div style={{
            width: '64px', height: '64px', borderRadius: '50%',
            background: `linear-gradient(135deg, ${cfg.color}, ${cfg.color}66)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '28px', flexShrink: 0,
          }}>
            {cfg.badge}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '4px' }}>
              {user.name || `@${user.handle}`}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', fontFamily: "'DM Mono', monospace" }}>
              @{user.handle}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Nível
            </div>
            <div style={{
              fontSize: '1.1rem', fontWeight: 800, color: cfg.color,
              padding: '6px 16px', background: cfg.bg, borderRadius: '100px',
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
            color="#FBBF24"
          />
          <KpiCard
            label="Status"
            value={creator && creator.gmv > 0 ? 'Ativo ✓' : 'Sem vendas'}
            sub="período selecionado"
            color={creator && creator.gmv > 0 ? '#34D399' : '#6B7280'}
          />
        </div>

        {/* Mensagem motivacional */}
        {creator && creator.gmv > 0 && (
          <div style={{
            background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
            borderRadius: '12px', padding: '12px 16px', marginBottom: '1.25rem',
            display: 'flex', alignItems: 'center', gap: '10px',
          }}>
            <span style={{ fontSize: '18px' }}>🎯</span>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#34D399' }}>
                Você gerou {fmtBRL(creator.gmv)} em GMV!
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>
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
                      border: 'none', cursor: 'pointer',
                      background: metric === m.key ? m.color : 'rgba(255,255,255,0.07)',
                      color: metric === m.key ? 'white' : 'rgba(255,255,255,0.4)',
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
                    <stop offset="5%" stopColor={CHART_METRICS.find(m => m.key === metric)?.color ?? '#1B3FE4'} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={CHART_METRICS.find(m => m.key === metric)?.color ?? '#1B3FE4'} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="date" tickFormatter={fmtWeek} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#0D1227', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px' }}
                  labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
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
                <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Última semana: <strong style={{ color: 'white' }}>{fmtBRLd(lastWeek[metric] ?? 0)}</strong>
                </span>
                <span style={{ color: diff >= 0 ? '#34D399' : '#F87171', fontWeight: 700 }}>
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
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {['Semana', 'GMV', 'Comissão'].map((h, i) => (
                      <th key={h} style={{
                        padding: '8px 10px', textAlign: i > 0 ? 'right' : 'left',
                        fontWeight: 700, color: 'rgba(255,255,255,0.25)', fontSize: '10px',
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...weekData].reverse().filter(w => w.gmv > 0).map((w, i) => (
                    <tr key={w.date} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <td style={{ padding: '9px 10px', color: 'rgba(255,255,255,0.5)', fontFamily: "'DM Mono', monospace", fontSize: '11px' }}>
                        {fmtDate(w.date)}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: 'white', fontVariantNumeric: 'tabular-nums' }}>
                        {fmtBRL(w.gmv)}
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 600, color: '#FBBF24', fontVariantNumeric: 'tabular-nums' }}>
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
          background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '10px', padding: '10px 14px',
          fontSize: '11px', color: 'rgba(255,255,255,0.25)',
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
      background: accent ? `linear-gradient(135deg, ${color}18, ${color}06)` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${accent ? color + '30' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: '14px', padding: '1rem 1.1rem',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>{sub}</div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#080C1A', flexDirection: 'column', gap: '14px' }}>
      <div style={{ width: '36px', height: '36px', border: '2px solid rgba(255,255,255,0.08)', borderTop: '2px solid #1B3FE4', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>Carregando seu painel...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function NotFoundScreen({ handle, onLogout }: { handle: string; onLogout: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#080C1A', flexDirection: 'column', gap: '12px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ fontSize: '2rem' }}>🔍</div>
      <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>Creator @{handle} não encontrado</div>
      <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.25)' }}>Verifique se o @ está correto ou contate a Amplify</div>
      <button onClick={onLogout} style={{ marginTop: '8px', ...btnGhost }}>← Voltar ao login</button>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px', padding: '1.25rem',
}

const sectionLabel: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)',
  letterSpacing: '0.08em', textTransform: 'uppercase',
}

const dateInputStyle: React.CSSProperties = {
  fontSize: '11px', padding: '4px 8px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)',
  color: 'white', outline: 'none', fontFamily: "'DM Sans', sans-serif",
}

const btnPrimary: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '8px',
  border: 'none', background: '#1B3FE4', color: 'white', cursor: 'pointer',
}

const btnGhost: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, padding: '4px 10px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
  color: 'rgba(255,255,255,0.5)', cursor: 'pointer',
}
