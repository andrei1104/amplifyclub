export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { Client } from '@notionhq/client'
import * as XLSX from 'xlsx'

const notion     = new Client({ auth: process.env.NOTION_TOKEN })
const CREATORS_DB = '2efb0bbef153811b946ddf8f0fff81a3'
const FOLDER_ID  = process.env.GDRIVE_FOLDER_ID || '1VeOK2-DTfnDbbRueHpKK-a5QkQtyP_Nj'
const GDRIVE_KEY = process.env.GDRIVE_API_KEY || ''

export const revalidate = 300 // 5 min cache

// ── Notion: busca todos os creators ativos ──────────────────
async function fetchCreators(handleFilter?: string) {
  const results: any[] = []
  let cursor: string | undefined
  do {
    const res = await notion.databases.query({
      database_id: CREATORS_DB,
      start_cursor: cursor,
      page_size: 100,
      filter: {
        property: 'Status',
        status: { equals: 'Ativo' },
      },
    })
    results.push(...res.results)
    cursor = res.has_more ? (res.next_cursor ?? undefined) : undefined
  } while (cursor)

  const mapped = results.map((page: any) => {
    const p = page.properties
    const nome     = p['Nome Completo']?.rich_text?.[0]?.plain_text ?? p['Qual ']?.title?.[0]?.plain_text ?? ''
    const handle   = p['Qual seu @ do TikTok?']?.rich_text?.[0]?.plain_text ?? ''
    const categoria = p['Categoria Amplify Club']?.select?.name ?? 'Start'
    const gmvInfo  = p['GMV informado']?.number ?? 0
    return {
      id: page.id,
      nome,
      handle: handle.replace(/^@/, '').trim().toLowerCase(),
      handleRaw: handle,
      categoria,
      gmvInfo,
      createdAt: page.created_time,
    }
  }).filter(c => c.handle) // só quem tem @

  if (handleFilter) {
    return mapped.filter(c => c.handle === handleFilter.toLowerCase().replace(/^@/, ''))
  }
  return mapped
}

// ── Helpers ──────────────────────────────────────────────────
function parseBRL(v: any): number {
  if (!v) return 0
  const s = String(v).replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.').trim()
  return parseFloat(s) || 0
}

function cleanHandle(h: string): string {
  h = h.toLowerCase().trim()
  const m = h.match(/tiktok\.com\/@([^/?&\s]+)/)
  if (m) return m[1]
  return h.replace('@', '').split('?')[0].split('&')[0].trim()
}

function matchCreator(
  notionHandle: string,
  salesMap: Record<string, { gmv: number; comissao: number }>
): { gmv: number; comissao: number } | null {
  const h = cleanHandle(notionHandle)
  if (!h) return null
  if (salesMap[h]) return salesMap[h]
  if (h.length >= 5) {
    const key = Object.keys(salesMap).find(k => k.includes(h) || h.includes(k))
    if (key) return salesMap[key]
  }
  if (h.length >= 5) {
    const hc  = h.replace(/[^a-z0-9_]/g, '')
    const key = Object.keys(salesMap).find(k => k.replace(/[^a-z0-9_]/g, '') === hc)
    if (key) return salesMap[key]
  }
  if (h.length >= 8) {
    const key = Object.keys(salesMap).find(k => k.startsWith(h.slice(0, 8)))
    if (key) return salesMap[key]
  }
  return null
}

// ── Drive: busca XLSX no range ──────────────────────────────
async function fetchDriveXlsx(sinceDate: string, untilDate: string) {
  try {
    const listUrl =
      `https://www.googleapis.com/drive/v3/files?` +
      `q='${FOLDER_ID}'+in+parents+and+mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'` +
      `&orderBy=modifiedTime+desc&pageSize=50&fields=files(id,name,modifiedTime)` +
      `&key=${GDRIVE_KEY}`

    const listRes = await fetch(listUrl)
    if (!listRes.ok) return { weeklySalesMap: {}, weeklyAmplify: {} }
    const { files } = await listRes.json()
    if (!files?.length) return { weeklySalesMap: {}, weeklyAmplify: {} }

    // Filtra arquivos no range
    const relevant = files.filter((f: any) => {
      const m = f.name.match(/(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})/)
      if (!m) return false
      return m[2] >= sinceDate && m[2] <= untilDate
    })

    if (!relevant.length) return { weeklySalesMap: {}, weeklyAmplify: {} }

    const processed = await Promise.all(
      relevant.map(async (file: any) => {
        try {
          const dlRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${GDRIVE_KEY}`
          )
          if (!dlRes.ok) return null
          const buf  = await dlRes.arrayBuffer()
          const wb   = XLSX.read(buf, { type: 'array' })
          const ws   = wb.Sheets[wb.SheetNames[0]]
          const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 })
          if (rows.length < 2) return null

          const header = rows[0] as string[]
          const idx    = (n: string) => header.findIndex(h => String(h).toLowerCase().includes(n.toLowerCase()))
          const iNome  = idx('criador')
          const iGmv   = idx('GMV de Afiliado') !== -1 ? idx('GMV de Afiliado') : idx('GMV')
          const iCom   = idx('Comissão estimada') !== -1 ? idx('Comissão estimada') : idx('Comiss')

          const resumoRow = rows.find(
            r => String(r[iNome]).toLowerCase().includes('resumo') || String(r[0]).toLowerCase().includes('resumo')
          )
          const dataRows = rows.slice(1).filter(r => r[iNome] && !['--', '-'].includes(String(r[iNome])))

          const amplifyGmv = resumoRow
            ? parseBRL(resumoRow[iGmv])
            : dataRows.reduce((s: number, r: any) => s + parseBRL(r[iGmv]), 0)
          const amplifyCom = resumoRow
            ? parseBRL(resumoRow[iCom])
            : dataRows.reduce((s: number, r: any) => s + parseBRL(r[iCom]), 0)

          const sales = dataRows
            .filter(r => !['Resumo', '--', '-'].includes(String(r[iNome])))
            .map(r => ({
              creator:  cleanHandle(String(r[iNome] ?? '')),
              gmv:      parseBRL(r[iGmv]),
              comissao: parseBRL(r[iCom]),
            }))
            .filter(r => r.creator && r.creator !== '-' && r.creator !== '--')

          const m = file.name.match(/(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})/)
          return { weekStart: m?.[1], weekEnd: m?.[2], sales, amplifyGmv, amplifyCom }
        } catch {
          return null
        }
      })
    )

    const valid = processed.filter(Boolean) as any[]
    const weeklySalesMap: Record<string, any[]> = {}
    const weeklyAmplify: Record<string, { gmv: number; com: number }> = {}

    valid.forEach(v => {
      if (v.weekEnd) {
        weeklySalesMap[v.weekEnd] = v.sales
        weeklyAmplify[v.weekEnd]  = { gmv: v.amplifyGmv, com: v.amplifyCom }
      }
    })

    return { weeklySalesMap, weeklyAmplify }
  } catch (e) {
    console.error('fetchDrive error:', e)
    return { weeklySalesMap: {}, weeklyAmplify: {} }
  }
}

// ── GET ──────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const handle    = req.nextUrl.searchParams.get('handle')    ?? ''
    const categoria = req.nextUrl.searchParams.get('categoria') ?? ''
    const startDate = req.nextUrl.searchParams.get('startDate') ?? ''
    const endDate   = req.nextUrl.searchParams.get('endDate')   ?? new Date().toISOString().slice(0, 10)

    // 1. Busca creators do Notion
    const creators = await fetchCreators(handle || undefined)

    // 2. Filtra por categoria se informado
    const filtered = categoria
      ? creators.filter(c => c.categoria.toLowerCase() === categoria.toLowerCase())
      : creators

    // 3. Define range de datas
    const firstDate = startDate || '2024-01-01'
    const lastDate  = endDate

    // 4. Busca XLSX do Drive
    const { weeklySalesMap, weeklyAmplify } = await fetchDriveXlsx(firstDate, lastDate)

    // 5. Acumula GMV de todas as semanas por creator
    const accumulatedSales: Record<string, { gmv: number; comissao: number }> = {}
    Object.values(weeklySalesMap).forEach(weekSales => {
      weekSales.forEach((s: any) => {
        if (!accumulatedSales[s.creator]) accumulatedSales[s.creator] = { gmv: 0, comissao: 0 }
        accumulatedSales[s.creator].gmv      += s.gmv
        accumulatedSales[s.creator].comissao += s.comissao
      })
    })

    // 6. Enriquece creators com GMV
    const enriched = filtered.map(c => {
      const sale = matchCreator(c.handle, accumulatedSales)
      return {
        ...c,
        gmv:      sale?.gmv ?? 0,
        comissao: sale?.comissao ?? 0,
        amplifyRevenue: (sale?.comissao ?? 0) * 0.10,
      }
    })

    // 7. Sumário geral
    const totalGmv     = enriched.reduce((s, c) => s + c.gmv, 0)
    const totalCom     = enriched.reduce((s, c) => s + c.comissao, 0)
    const amplifyTotal = totalCom * 0.10
    const activeCount  = enriched.filter(c => c.gmv > 0).length

    // 8. Por categoria
    const byCategoria: Record<string, { count: number; gmv: number; comissao: number; amplify: number }> = {}
    enriched.forEach(c => {
      if (!byCategoria[c.categoria]) byCategoria[c.categoria] = { count: 0, gmv: 0, comissao: 0, amplify: 0 }
      byCategoria[c.categoria].count++
      byCategoria[c.categoria].gmv      += c.gmv
      byCategoria[c.categoria].comissao += c.comissao
      byCategoria[c.categoria].amplify  += c.amplifyRevenue
    })

    // 9. Gráfico semanal (GMV total + receita Amplify por semana)
    const weeklyAmplifyData = Object.entries(weeklyAmplify)
      .map(([date, v]) => ({
        date,
        gmv:           v.gmv,
        comissao:      v.com,
        amplifyRevenue: v.com * 0.10,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // 10. Gráfico semanal por creator individualmente
    const weeklyByCreator: Record<string, { date: string; gmv: number; comissao: number }[]> = {}
    enriched.forEach(c => {
      const points = Object.entries(weeklySalesMap).map(([date, weekSales]) => {
        const match = (weekSales as any[]).find(s => {
          const h = c.handle
          return s.creator === h ||
            (h.length >= 5 && (s.creator.includes(h) || h.includes(s.creator))) ||
            (h.length >= 8 && s.creator.startsWith(h.slice(0, 8)))
        })
        return { date, gmv: match?.gmv ?? 0, comissao: match?.comissao ?? 0 }
      }).sort((a, b) => a.date.localeCompare(b.date))

      if (points.some(p => p.gmv > 0)) {
        weeklyByCreator[c.handle] = points
      }
    })

    return NextResponse.json(
      {
        summary: {
          total:         enriched.length,
          active:        activeCount,
          totalGmv,
          totalCom,
          amplifyTotal,
          byCategoria,
          updatedAt:     new Date().toISOString(),
          firstDate,
          lastDate,
        },
        creators: enriched.sort((a, b) => b.gmv - a.gmv),
        weeklyAmplifyData,
        weeklyByCreator,
      },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate' } }
    )
  } catch (e: any) {
    console.error('GET /api/data error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
