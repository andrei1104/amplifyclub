'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, BarChart, Bar, Cell,
} from 'recharts'

// ── Types ─────────────────────────────────────────────────────
interface Creator {
  id: string; nome: string; handle: string; handleRaw: string
  categoria: string; gmv: number; comissao: number; amplifyRevenue: number
}
interface Summary {
  total: number; active: number; totalGmv: number; totalCom: number; amplifyTotal: number
  byCategoria: Record<string, { count: number; gmv: number; comissao: number; amplify: number }>
  updatedAt: string; firstDate: string; lastDate: string
}
interface WeekPoint { date: string; gmv: number; comissao: number; amplifyRevenue: number }

// ── Constants ─────────────────────────────────────────────────
const fmtBRL = (n: number) => 'R$\u00a0' + n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtBRLd = (n: number) => 'R$\u00a0' + n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtWeek = (iso: string) => { const d = new Date(iso + 'T00:00:00'); return `${d.getDate()}/${d.getMonth() + 1}` }
const fmtDate = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

const CAT_CONFIG: Record<string, { color: string; bg: string; border: string; badge: string }> = {
  Diamond: { color: '#2563EB', bg: 'rgba(37,99,235,0.10)',  border: 'rgba(37,99,235,0.20)',  badge: '💎' },
  Gold:    { color: '#D97706', bg: 'rgba(217,119,6,0.10)',   border: 'rgba(217,119,6,0.20)',   badge: '🥇' },
  Silver:  { color: '#64748B', bg: 'rgba(100,116,139,0.10)', border: 'rgba(100,116,139,0.20)', badge: '🥈' },
  Start:   { color: '#1B3FE4', bg: 'rgba(27,63,228,0.10)',   border: 'rgba(27,63,228,0.20)',   badge: '🚀' },
  Safira:  { color: '#7C3AED', bg: 'rgba(124,58,237,0.10)',  border: 'rgba(124,58,237,0.20)',  badge: '💜' },
  Origens: { color: '#059669', bg: 'rgba(5,150,105,0.10)',   border: 'rgba(5,150,105,0.20)',   badge: '🌱' },
  Desvinculada: { color: '#94A3B8', bg: 'rgba(148,163,184,0.10)', border: 'rgba(148,163,184,0.20)', badge: '⛔' },
}
const CATEGORIAS = ['Diamond', 'Gold', 'Silver', 'Start', 'Safira', 'Origens']
const CHART_COLORS = ['#1B3FE4', '#E4003A', '#D97706', '#059669', '#7C3AED', '#FB923C']

// ── Amplify Logo ──────────────────────────────────────────────
function AmplifyLogo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 14 L10 4 L14 4 L6 14 L14 24 L10 24 Z" fill="#1B3FE4"/>
      <path d="M10 14 L18 4 L22 4 L14 14 L22 24 L18 24 Z" fill="#E4003A"/>
      <path d="M16 14 L21 8 L21 20 Z" fill="white"/>
    </svg>
  )
}

export default function Admin() {
  const router = useRouter()
  const [data,      setData]      = useState<{ summary: Summary; creators: Creator[]; weeklyAmplifyData: WeekPoint[]; weeklyByCreator: Record<string, any[]> } | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [catFilter, setCatFilter] = useState<string>('all')
  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState<Creator | null>(null)
  const [metric,    setMetric]    = useState<'gmv' | 'amplifyRevenue'>('gmv')
  const todayStr = new Date().toISOString().slice(0, 10)
  const [startDate, setStartDate] = useState('2025-01-01')
  const [endDate,   setEndDate]   = useState(todayStr)
  const [applied,   setApplied]   = useState({ start: '2025-01-01', end: todayStr })
  const [sortBy,    setSortBy]    = useState<'gmv' | 'comissao' | 'nome'>('gmv')

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (applied.start) params.set('startDate', applied.start)
    if (applied.end)   params.set('endDate', applied.end)
    if (catFilter !== 'all') params.set('categoria', catFilter)

    fetch(`/api/data?${params}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [applied, catFilter])

  useEffect(() => {
    const s = sessionStorage.getItem('amplify_session')
    if (!s) { router.push('/'); return }
    const u = JSON.parse(s)
    if (u.role !== 'admin') { router.push('/dashboard'); return }
    load()
  }, [load, router])

  if (loading || !data) return <LoadingScreen />

  const { summary: s, creators, weeklyAmplifyData, weeklyByCreator } = data

  const visible = creators
    .filter(c => {
      const matchSearch = !search || c.nome.toLowerCase().includes(search.toLowerCase()) || c.handle.includes(search.toLowerCase())
      const matchCat    = catFilter === 'all' || c.categoria === catFilter
      return matchSearch && matchCat
    })
    .sort((a, b) => {
      if (sortBy === 'nome') return a.nome.localeCompare(b.nome)
      return b[sortBy] - a[sortBy]
    })

  const chartData = selected && weeklyByCreator[selected.handle]
    ? weeklyByCreator[selected.handle].map(w => ({ ...w, amplifyRevenue: w.comissao * 0.10 }))
    : weeklyAmplifyData

  const catBarData = CATEGORIAS.map(cat => ({
    name: cat,
    gmv: s.byCategoria[cat]?.gmv ?? 0,
    amplify: s.byCategoria[cat]?.amplify ?? 0,
    count: s.byCategoria[cat]?.count ?? 0,
  })).filter(d => d.count > 0)

  return (
    <div style={{ background: '#F4F6FB', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", color: '#1A1F3C' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width: 4px; height: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(27,63,228,0.15); border-radius: 2px }
        .cont { max-width: 1280px; margin: 0 auto; padding: 1.5rem 1.25rem }
        .g3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px }
        .g4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px }
        .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px }
        input::placeholder { color: #B0BFEE }
        @media(max-width:768px){.g4{grid-template-columns:1fr 1fr}.g3{grid-template-columns:1fr 1fr}.g2{grid-template-columns:1fr}}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <AmplifyLogo size={32} />
          <div>
            <div style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '-0.01em', color: '#1A1F3C' }}>Amplify</div>
            <div style={{ fontSize: '10px', color: '#8B95C4', fontWeight: 500 }}>Creator Performance · Admin</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: '#8B95C4', fontWeight: 600 }}>Período:</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={dateInputStyle} />
          <span style={{ fontSize: '11px', color: '#B0BFEE' }}>até</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={dateInputStyle} />
          <button onClick={() => { setApplied({ start: startDate, end: endDate }) }}
            style={btnPrimary}>Filtrar</button>
          {(applied.start || applied.end) && (
            <button onClick={() => { setStartDate('2025-01-01'); setEndDate(new Date().toISOString().slice(0,10)); setApplied({ start: '2025-01-01', end: new Date().toISOString().slice(0,10) }) }}
              style={btnGhost}>×</button>
          )}
          <button onClick={() => { sessionStorage.clear(); router.push('/') }}
            style={{ ...btnGhost, marginLeft: '8px' }}>Sair</button>
        </div>
      </header>

      <div className="cont">

        {/* KPI Row */}
        <div className="g4" style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
          <KpiCard label="Creators ativos" value={String(s.active)} sub={`de ${s.total} cadastrados`} color="#2563EB" />
          <KpiCard label="GMV total" value={fmtBRL(s.totalGmv)} sub="período selecionado" color="#1B3FE4" accent />
          <KpiCard label="Comissão estimada" value={fmtBRL(s.totalCom)} sub="TikTok → creators" color="#D97706" />
          <KpiCard label="Receita Amplify" value={fmtBRL(s.amplifyTotal)} sub="10% da comissão" color="#059669" accent />
        </div>

        {/* Categoria pills + search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
            {['all', ...CATEGORIAS].map(cat => {
              const cfg = CAT_CONFIG[cat]
              const active = catFilter === cat
              return (
                <button key={cat} onClick={() => setCatFilter(cat)}
                  style={{
                    fontSize: '11px', fontWeight: 700, padding: '5px 12px', borderRadius: '100px',
                    border: active ? 'none' : `1px solid ${cfg?.border ?? 'rgba(27,63,228,0.15)'}`,
                    background: active ? (cfg?.color ?? '#1B3FE4') : 'white',
                    color: active ? 'white' : (cfg?.color ?? '#6B78B0'),
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: active ? `0 2px 10px ${cfg?.color ?? '#1B3FE4'}35` : '0 1px 4px rgba(27,63,228,0.06)',
                  }}>
                  {cat === 'all' ? 'Todos' : `${cfg?.badge} ${cat}`}
                  {cat !== 'all' && s.byCategoria[cat]?.count > 0 && (
                    <span style={{ marginLeft: '4px', opacity: 0.7 }}>
                      ({s.byCategoria[cat].count})
                    </span>
                  )}
                </button>
              )
            })}
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar creator..."
            style={{
              background: 'white', border: '1px solid rgba(27,63,228,0.15)',
              borderRadius: '10px', padding: '7px 12px', fontSize: '12px', color: '#1A1F3C',
              fontFamily: 'inherit', outline: 'none', width: '200px',
              boxShadow: '0 1px 4px rgba(27,63,228,0.06)',
            }}
          />
        </div>

        {/* Main grid: chart + categoria breakdown */}
        <div className="g2" style={{ marginBottom: '1.25rem' }}>
          {/* Gráfico semanal */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={sectionLabel}>
                  {selected ? `📊 ${selected.nome || selected.handle}` : 'Evolução semanal — Amplify'}
                </div>
                {selected && (
                  <div style={{ fontSize: '11px', color: '#8B95C4', marginTop: '2px' }}>
                    GMV {fmtBRL(selected.gmv)} · Receita Amplify {fmtBRLd(selected.amplifyRevenue)}
                    <button onClick={() => setSelected(null)}
                      style={{ marginLeft: '8px', fontSize: '10px', color: '#1B3FE4', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      ← voltar
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['gmv', 'amplifyRevenue'] as const).map(m => (
                  <button key={m} onClick={() => setMetric(m)}
                    style={{
                      fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px',
                      border: `1px solid ${metric === m ? '#1B3FE4' : 'rgba(27,63,228,0.15)'}`,
                      background: metric === m ? '#1B3FE4' : 'white',
                      color: metric === m ? 'white' : '#8B95C4', cursor: 'pointer',
                    }}>
                    {m === 'gmv' ? 'GMV' : 'Receita Amplify'}
                  </button>
                ))}
              </div>
            </div>
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="agrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1B3FE4" stopOpacity={0.20} />
                      <stop offset="95%" stopColor="#1B3FE4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(27,63,228,0.06)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtWeek} tick={{ fontSize: 10, fill: '#8B95C4' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: 'white', border: '1px solid rgba(27,63,228,0.12)', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 16px rgba(27,63,228,0.10)' }}
                    labelStyle={{ color: '#8B95C4' }}
                    itemStyle={{ color: '#1B3FE4' }}
                    formatter={(v: number) => [fmtBRLd(v), metric === 'gmv' ? 'GMV' : 'Receita Amplify']}
                    labelFormatter={l => fmtDate(l)}
                  />
                  <Area type="monotone" dataKey={metric} stroke="#1B3FE4" strokeWidth={2.5} fill="url(#agrad)"
                    dot={{ r: 3, fill: '#1B3FE4', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#B0BFEE', fontSize: '13px' }}>
                Sem dados suficientes para o gráfico
              </div>
            )}
            {chartData.length >= 2 && (() => {
              const last = chartData[chartData.length - 1]
              const prev = chartData[chartData.length - 2]
              const diff = (last[metric] ?? 0) - (prev[metric] ?? 0)
              const pct  = prev[metric] ? (diff / prev[metric] * 100) : 0
              return (
                <div style={{ marginTop: '10px', display: 'flex', gap: '16px', fontSize: '11px' }}>
                  <span style={{ color: '#8B95C4' }}>
                    Última semana: <strong style={{ color: '#1A1F3C' }}>{fmtBRLd(last[metric] ?? 0)}</strong>
                  </span>
                  <span style={{ color: diff >= 0 ? '#059669' : '#DC2626', fontWeight: 700 }}>
                    {diff >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}% vs semana anterior
                  </span>
                </div>
              )
            })()}
          </div>

          {/* Categoria breakdown */}
          <div style={cardStyle}>
            <div style={sectionLabel as any}>GMV por categoria</div>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={catBarData} barCategoryGap="35%">
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8B95C4' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: 'white', border: '1px solid rgba(27,63,228,0.12)', borderRadius: '10px', fontSize: '12px', boxShadow: '0 4px 16px rgba(27,63,228,0.10)' }}
                  formatter={(v: number) => [fmtBRL(v), 'GMV']}
                />
                <Bar dataKey="gmv" radius={[6, 6, 0, 0]}>
                  {catBarData.map((entry, i) => (
                    <Cell key={entry.name} fill={CAT_CONFIG[entry.name]?.color ?? CHART_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px' }}>
              {catBarData.map(cat => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '2px', flexShrink: 0,
                    background: CAT_CONFIG[cat.name]?.color ?? '#666',
                  }} />
                  <span style={{ fontSize: '10px', color: '#8B95C4' }}>
                    {CAT_CONFIG[cat.name]?.badge} {cat.name}
                  </span>
                  <span style={{ fontSize: '10px', color: '#1A1F3C', fontWeight: 700, marginLeft: 'auto' }}>
                    {cat.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sortbar + Table */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '8px' }}>
            <div style={sectionLabel as any}>
              {visible.length} creator{visible.length !== 1 ? 's' : ''} {catFilter !== 'all' ? `· ${catFilter}` : ''}
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(['gmv', 'comissao', 'nome'] as const).map(k => (
                <button key={k} onClick={() => setSortBy(k)}
                  style={{
                    fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px',
                    border: `1px solid ${sortBy === k ? '#1B3FE4' : 'rgba(27,63,228,0.15)'}`,
                    cursor: 'pointer',
                    background: sortBy === k ? 'rgba(27,63,228,0.10)' : 'white',
                    color: sortBy === k ? '#1B3FE4' : '#8B95C4',
                  }}>
                  {k === 'gmv' ? 'GMV ↓' : k === 'comissao' ? 'Comissão ↓' : 'Nome A-Z'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(27,63,228,0.08)' }}>
                  {['#', 'Creator', '@ TikTok', 'Categoria', 'GMV', 'Comissão', 'Receita Amplify'].map((h, i) => (
                    <th key={h} style={{
                      padding: '8px 10px', textAlign: i >= 4 ? 'right' : 'left',
                      fontWeight: 700, color: '#8B95C4', fontSize: '10px',
                      letterSpacing: '0.08em', textTransform: 'uppercase', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((c, i) => {
                  const cfg = CAT_CONFIG[c.categoria] ?? CAT_CONFIG['Start']
                  const isSelected = selected?.id === c.id
                  return (
                    <tr key={c.id}
                      onClick={() => setSelected(isSelected ? null : c)}
                      style={{
                        borderBottom: '1px solid rgba(27,63,228,0.05)',
                        background: isSelected ? 'rgba(27,63,228,0.06)' : 'transparent',
                        borderLeft: isSelected ? '2px solid #1B3FE4' : '2px solid transparent',
                        cursor: 'pointer', transition: 'all 0.1s',
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(27,63,228,0.03)' }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <td style={{ padding: '10px 10px', color: '#B0BFEE', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: '10px 10px', fontWeight: 600, color: '#1A1F3C', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.nome || '—'}
                      </td>
                      <td style={{ padding: '10px 10px', color: '#8B95C4', fontSize: '11px', fontFamily: "'DM Mono', monospace" }}>
                        @{c.handle}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '100px',
                          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                        }}>
                          {cfg.badge} {c.categoria}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: c.gmv > 0 ? '#1A1F3C' : '#B0BFEE', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {c.gmv > 0 ? fmtBRL(c.gmv) : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: c.comissao > 0 ? '#D97706' : '#B0BFEE', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {c.comissao > 0 ? fmtBRL(c.comissao) : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: c.amplifyRevenue > 0 ? '#059669' : '#B0BFEE', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {c.amplifyRevenue > 0 ? fmtBRLd(c.amplifyRevenue) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {visible.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '1px solid rgba(27,63,228,0.08)', background: 'rgba(27,63,228,0.03)' }}>
                    <td colSpan={4} style={{ padding: '10px 10px', fontSize: '10px', fontWeight: 700, color: '#8B95C4', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Total
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: '#1A1F3C', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtBRL(visible.reduce((acc, c) => acc + c.gmv, 0))}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: '#D97706', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtBRL(visible.reduce((acc, c) => acc + c.comissao, 0))}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: '#059669', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtBRLd(visible.reduce((acc, c) => acc + c.amplifyRevenue, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {visible.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#B0BFEE', fontSize: '13px' }}>
              Nenhum creator encontrado
            </div>
          )}
        </div>

        <div style={{ marginTop: '12px', fontSize: '10px', color: '#B0BFEE', textAlign: 'right' }}>
          Atualizado em {new Date(s.updatedAt).toLocaleString('pt-BR')} · Cache 5 min
        </div>
      </div>
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────
function KpiCard({ label, value, sub, color, accent }: { label: string; value: string; sub: string; color: string; accent?: boolean }) {
  return (
    <div style={{
      background: accent ? `linear-gradient(135deg, ${color}12, white)` : 'white',
      border: `1px solid ${accent ? color + '25' : 'rgba(27,63,228,0.09)'}`,
      borderRadius: '14px', padding: '1.1rem 1.25rem',
      boxShadow: accent ? `0 4px 20px ${color}12` : '0 1px 8px rgba(27,63,228,0.05)',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: '#8B95C4', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', color: '#B0BFEE', fontWeight: 500 }}>{sub}</div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F4F6FB', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        width: '36px', height: '36px', border: '2px solid rgba(27,63,228,0.12)',
        borderTop: '2px solid #1B3FE4', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
      }} />
      <div style={{ fontSize: '13px', color: '#8B95C4', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>Carregando dados...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
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
  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0',
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
