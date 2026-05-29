# Amplify · Creator Performance Dashboard

Dashboard de performance de creators — Notion (Base de Creators) + Google Drive (Export Partner Center).

## Como funciona

- **Login `amplify` / `12345`** → painel admin com todos os creators, filtro por categoria, gráficos, tabela completa
- **Login `@seutiktok` / `12345`** → painel individual do creator, vê só os próprios dados

O handle do TikTok é buscado no campo **"Qual seu @ do TikTok?"** da base do Notion.  
A senha universal para creators é **12345**.

## Variáveis de ambiente (Vercel → Settings → Env Vars)

| Variável | Valor |
|---|---|
| `NOTION_TOKEN` | Token da integration (secret_...) |
| `GDRIVE_FOLDER_ID` | ID da pasta "Export Partner Center" no Drive |
| `GDRIVE_API_KEY` | Chave de API do Google Cloud (Drive API ativada) |

## Notion

- **Database**: `👥 Base de Creators` (ID: `2efb0bbef153811b946ddf8f0fff81a3`)
- **Campos usados**:
  - `Qual seu @ do TikTok?` → login do creator
  - `Nome Completo` → nome exibido
  - `Categoria Amplify Club` → Diamond / Gold / Silver / Start / Safira / Origens
  - `Status` → só creators com status **Ativo** são buscados

## Google Drive

- A pasta deve conter arquivos `.xlsx` com nome no formato:
  `YYYY-MM-DD_YYYY-MM-DD.xlsx` (ex: `2024-04-22_2024-04-28.xlsx`)
- O dashboard busca automaticamente os arquivos no range de datas selecionado
- Cada arquivo deve ter colunas: `Criador`, `GMV de Afiliado`, `Comissão estimada`

## Cálculo da Receita Amplify

```
Receita Amplify = Comissão Estimada × 10%
```

## Como obter o NOTION_TOKEN

1. [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Crie ou abra a integration existente
3. Copie o token `secret_...`
4. No database de Creators → `...` → **Connections** → conecte a integration

## Como obter o GDRIVE_API_KEY

1. [console.cloud.google.com](https://console.cloud.google.com)
2. Ative a **Google Drive API**
3. Credenciais → **Criar credenciais → Chave de API**
4. (Recomendado) Restrinja ao domínio do Vercel

## Deploy no Vercel

```bash
git push origin main
```

O Vercel detecta automaticamente Next.js. Configure as variáveis de ambiente e faça o deploy.

## Dev local

```bash
npm install
# Crie .env.local com as variáveis acima
npm run dev
```
