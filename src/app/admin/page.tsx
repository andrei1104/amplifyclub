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

const CAT_CONFIG: Record<string, { color: string; bg: string; badge: string }> = {
  Diamond: { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)', badge: '💎' },
  Gold:    { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',  badge: '🥇' },
  Silver:  { color: '#A3A3A3', bg: 'rgba(163,163,163,0.12)', badge: '🥈' },
  Start:   { color: '#FB923C', bg: 'rgba(251,146,60,0.12)',  badge: '🚀' },
  Safira:  { color: '#C084FC', bg: 'rgba(192,132,252,0.12)', badge: '💜' },
  Origens: { color: '#34D399', bg: 'rgba(52,211,153,0.12)',  badge: '🌱' },
  Desvinculada: { color: '#6B7280', bg: 'rgba(107,114,128,0.12)', badge: '⛔' },
}
const CATEGORIAS = ['Diamond', 'Gold', 'Silver', 'Start', 'Safira', 'Origens']
const CHART_COLORS = ['#1B3FE4', '#E4003A', '#FBBF24', '#34D399', '#C084FC', '#FB923C']

export default function Admin() {
  const router = useRouter()
  const [data,      setData]      = useState<{ summary: Summary; creators: Creator[]; weeklyAmplifyData: WeekPoint[]; weeklyByCreator: Record<string, any[]> } | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [catFilter, setCatFilter] = useState<string>('all')
  const [search,    setSearch]    = useState('')
  const [selected,  setSelected]  = useState<Creator | null>(null)
  const [metric,    setMetric]    = useState<'gmv' | 'amplifyRevenue'>('gmv')
  const [startDate, setStartDate] = useState('')
  const [endDate,   setEndDate]   = useState('')
  const [applied,   setApplied]   = useState({ start: '', end: '' })
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

  // Filtra e ordena
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

  // Chart data
  const chartData = selected && weeklyByCreator[selected.handle]
    ? weeklyByCreator[selected.handle].map(w => ({ ...w, amplifyRevenue: w.comissao * 0.10 }))
    : weeklyAmplifyData

  // Categoria breakdown para bar chart
  const catBarData = CATEGORIAS.map(cat => ({
    name: cat,
    gmv: s.byCategoria[cat]?.gmv ?? 0,
    amplify: s.byCategoria[cat]?.amplify ?? 0,
    count: s.byCategoria[cat]?.count ?? 0,
  })).filter(d => d.count > 0)

  return (
    <div style={{ background: '#080C1A', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", color: 'white' }}>
      <style>{`
        * { box-sizing: border-box }
        ::-webkit-scrollbar { width: 4px; height: 4px }
        ::-webkit-scrollbar-track { background: transparent }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px }
        .cont { max-width: 1280px; margin: 0 auto; padding: 1.5rem 1.25rem }
        .g3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 12px }
        .g4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px }
        .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px }
        input::placeholder { color: rgba(255,255,255,0.25) }
        @media(max-width:768px){.g4{grid-template-columns:1fr 1fr}.g3{grid-template-columns:1fr 1fr}.g2{grid-template-columns:1fr}}
      `}</style>

      {/* Header */}
      <header style={{
        background: 'rgba(255,255,255,0.03)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '0.875rem 1.25rem',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50, backdropFilter: 'blur(20px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #1B3FE4, #E4003A)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '14px', fontWeight: 900,
          }}>A</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '14px', letterSpacing: '-0.01em' }}>Amplify</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>Creator Performance · Admin</div>
          </div>
        </div>

        {/* Date filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', fontWeight: 600 }}>Período:</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={dateInputStyle} />
          <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.2)' }}>até</span>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={dateInputStyle} />
          <button onClick={() => { setApplied({ start: startDate, end: endDate }) }}
            style={btnPrimary}>Filtrar</button>
          {(applied.start || applied.end) && (
            <button onClick={() => { setStartDate(''); setEndDate(''); setApplied({ start: '', end: '' }) }}
              style={btnGhost}>×</button>
          )}
          <button onClick={() => { sessionStorage.clear(); router.push('/') }}
            style={{ ...btnGhost, marginLeft: '8px' }}>Sair</button>
        </div>
      </header>

      <div className="cont">

        {/* KPI Row */}
        <div className="g4" style={{ marginTop: '1.25rem', marginBottom: '1.25rem' }}>
          <KpiCard label="Creators ativos" value={String(s.active)} sub={`de ${s.total} cadastrados`} color="#60A5FA" />
          <KpiCard label="GMV total" value={fmtBRL(s.totalGmv)} sub="período selecionado" color="#1B3FE4" accent />
          <KpiCard label="Comissão estimada" value={fmtBRL(s.totalCom)} sub="TikTok → creators" color="#FBBF24" />
          <KpiCard label="Receita Amplify" value={fmtBRL(s.amplifyTotal)} sub="10% da comissão" color="#34D399" accent />
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
                    border: active ? 'none' : '1px solid rgba(255,255,255,0.1)',
                    background: active ? (cfg?.color ?? '#1B3FE4') : 'transparent',
                    color: active ? 'white' : 'rgba(255,255,255,0.5)',
                    cursor: 'pointer', transition: 'all 0.15s',
                    boxShadow: active ? `0 0 12px ${cfg?.color ?? '#1B3FE4'}44` : 'none',
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
              background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', padding: '7px 12px', fontSize: '12px', color: 'white',
              fontFamily: 'inherit', outline: 'none', width: '200px',
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
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '2px' }}>
                    GMV {fmtBRL(selected.gmv)} · Receita Amplify {fmtBRLd(selected.amplifyRevenue)}
                    <button onClick={() => setSelected(null)}
                      style={{ marginLeft: '8px', fontSize: '10px', color: '#60A5FA', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                      ← voltar
                    </button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(['gmv', 'amplifyRevenue'] as const).map(m => (
                  <button key={m} onClick={() => setMetric(m)}
                    style={{
                      fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '100px', border: 'none',
                      background: metric === m ? '#1B3FE4' : 'rgba(255,255,255,0.08)',
                      color: metric === m ? 'white' : 'rgba(255,255,255,0.4)', cursor: 'pointer',
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
                      <stop offset="5%" stopColor="#1B3FE4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#1B3FE4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tickFormatter={fmtWeek} tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: '#0D1227', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px' }}
                    labelStyle={{ color: 'rgba(255,255,255,0.5)' }}
                    itemStyle={{ color: '#60A5FA' }}
                    formatter={(v: number) => [fmtBRLd(v), metric === 'gmv' ? 'GMV' : 'Receita Amplify']}
                    labelFormatter={l => fmtDate(l)}
                  />
                  <Area type="monotone" dataKey={metric} stroke="#1B3FE4" strokeWidth={2.5} fill="url(#agrad)"
                    dot={{ r: 3, fill: '#1B3FE4', strokeWidth: 0 }} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
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
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Última semana: <strong style={{ color: 'white' }}>{fmtBRLd(last[metric] ?? 0)}</strong>
                  </span>
                  <span style={{ color: diff >= 0 ? '#34D399' : '#F87171', fontWeight: 700 }}>
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
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.35)' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: '#0D1227', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '12px' }}
                  formatter={(v: number) => [fmtBRL(v), 'GMV']}
                />
                <Bar dataKey="gmv" radius={[6, 6, 0, 0]}>
                  {catBarData.map((entry, i) => (
                    <Cell key={entry.name} fill={CAT_CONFIG[entry.name]?.color ?? CHART_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Legenda */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginTop: '10px' }}>
              {catBarData.map(cat => (
                <div key={cat.name} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '2px', flexShrink: 0,
                    background: CAT_CONFIG[cat.name]?.color ?? '#666',
                  }} />
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)' }}>
                    {CAT_CONFIG[cat.name]?.badge} {cat.name}
                  </span>
                  <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: 700, marginLeft: 'auto' }}>
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
                    border: 'none', cursor: 'pointer',
                    background: sortBy === k ? 'rgba(27,63,228,0.3)' : 'rgba(255,255,255,0.06)',
                    color: sortBy === k ? '#60A5FA' : 'rgba(255,255,255,0.35)',
                  }}>
                  {k === 'gmv' ? 'GMV ↓' : k === 'comissao' ? 'Comissão ↓' : 'Nome A-Z'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['#', 'Creator', '@ TikTok', 'Categoria', 'GMV', 'Comissão', 'Receita Amplify'].map((h, i) => (
                    <th key={h} style={{
                      padding: '8px 10px', textAlign: i >= 4 ? 'right' : 'left',
                      fontWeight: 700, color: 'rgba(255,255,255,0.25)', fontSize: '10px',
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
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        background: isSelected ? 'rgba(27,63,228,0.12)' : 'transparent',
                        borderLeft: isSelected ? '2px solid #1B3FE4' : '2px solid transparent',
                        cursor: 'pointer', transition: 'all 0.1s',
                      }}
                      onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)' }}
                      onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                    >
                      <td style={{ padding: '10px 10px', color: 'rgba(255,255,255,0.25)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {i + 1}
                      </td>
                      <td style={{ padding: '10px 10px', fontWeight: 600, color: 'white', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.nome || '—'}
                      </td>
                      <td style={{ padding: '10px 10px', color: 'rgba(255,255,255,0.45)', fontSize: '11px', fontFamily: "'DM Mono', monospace" }}>
                        @{c.handle}
                      </td>
                      <td style={{ padding: '10px 10px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '100px',
                          background: cfg.bg, color: cfg.color,
                        }}>
                          {cfg.badge} {c.categoria}
                        </span>
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: c.gmv > 0 ? 'white' : 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {c.gmv > 0 ? fmtBRL(c.gmv) : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: c.comissao > 0 ? '#FBBF24' : 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {c.comissao > 0 ? fmtBRL(c.comissao) : '—'}
                      </td>
                      <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 700, color: c.amplifyRevenue > 0 ? '#34D399' : 'rgba(255,255,255,0.2)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                        {c.amplifyRevenue > 0 ? fmtBRLd(c.amplifyRevenue) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              {visible.length > 0 && (
                <tfoot>
                  <tr style={{ borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                    <td colSpan={4} style={{ padding: '10px 10px', fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                      Total
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: 'white', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtBRL(visible.reduce((acc, c) => acc + c.gmv, 0))}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: '#FBBF24', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtBRL(visible.reduce((acc, c) => acc + c.comissao, 0))}
                    </td>
                    <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 800, color: '#34D399', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                      {fmtBRLd(visible.reduce((acc, c) => acc + c.amplifyRevenue, 0))}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
          {visible.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'rgba(255,255,255,0.2)', fontSize: '13px' }}>
              Nenhum creator encontrado
            </div>
          )}
        </div>

        <div style={{ marginTop: '12px', fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'right' }}>
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
      background: accent ? `linear-gradient(135deg, ${color}18, ${color}08)` : 'rgba(255,255,255,0.03)',
      border: `1px solid ${accent ? color + '30' : 'rgba(255,255,255,0.07)'}`,
      borderRadius: '14px', padding: '1.1rem 1.25rem',
    }}>
      <div style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '6px' }}>
        {label}
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color, letterSpacing: '-0.02em', lineHeight: 1, marginBottom: '4px' }}>
        {value}
      </div>
      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', fontWeight: 500 }}>{sub}</div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#080C1A', flexDirection: 'column', gap: '14px' }}>
      <div style={{
        width: '36px', height: '36px', border: '2px solid rgba(255,255,255,0.08)',
        borderTop: '2px solid #1B3FE4', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
      }} />
      <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 }}>Carregando dados...</div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: '16px', padding: '1.25rem',
}

const sectionLabel: React.CSSProperties = {
  fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.4)',
  letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0',
}

const dateInputStyle: React.CSSProperties = {
  fontSize: '11px', padding: '4px 8px', borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.06)',
  color: 'white', outline: 'none', fontFamily: "'DM Sans', sans-serif",
  colorScheme: 'dark',
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
