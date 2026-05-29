export const dynamic = 'force-dynamic'

import { NextResponse, NextRequest } from 'next/server'
import { Client } from '@notionhq/client'
import { ADMIN_LOGIN, ADMIN_PASSWORD, CREATOR_PASSWORD } from '../../lib/auth'

const notion      = new Client({ auth: process.env.NOTION_TOKEN })
const CREATORS_DB = '2efb0bbef153811b946ddf8f0fff81a3'

export async function POST(req: NextRequest) {
  try {
    const { login, password } = await req.json()
    const loginClean = String(login).toLowerCase().replace(/^@/, '').trim()

    // Admin
    if (loginClean === ADMIN_LOGIN) {
      if (password !== ADMIN_PASSWORD)
        return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })
      return NextResponse.json({ role: 'admin' })
    }

    // Creator — senha universal
    if (password !== CREATOR_PASSWORD)
      return NextResponse.json({ error: 'Senha incorreta.' }, { status: 401 })

    // Valida handle no Notion
    const res = await notion.databases.query({
      database_id: CREATORS_DB,
      filter: {
        property: 'Qual seu @ do TikTok?',
        rich_text: { contains: loginClean },
      },
      page_size: 5,
    })

    if (!res.results.length)
      return NextResponse.json({ error: 'Creator não encontrado.' }, { status: 404 })

    // Pega o primeiro match com handle exato ou parcial
    const page: any = res.results.find(p => {
      const h = (p as any).properties?.['Qual seu @ do TikTok?']?.rich_text?.[0]?.plain_text ?? ''
      return h.toLowerCase().replace(/^@/, '').trim() === loginClean
    }) ?? res.results[0]

    const p         = (page as any).properties
    const nome      = p['Nome Completo']?.rich_text?.[0]?.plain_text ?? p['Qual ']?.title?.[0]?.plain_text ?? loginClean
    const handle    = (p['Qual seu @ do TikTok?']?.rich_text?.[0]?.plain_text ?? loginClean).replace(/^@/, '').trim().toLowerCase()
    const categoria = p['Categoria Amplify Club']?.select?.name ?? 'Start'

    return NextResponse.json({ role: 'creator', handle, name: nome, categoria })
  } catch (e: any) {
    console.error('auth error:', e)
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 })
  }
}
