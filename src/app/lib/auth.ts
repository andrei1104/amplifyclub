// Auth dinâmica: creators vêm do Notion (@ TikTok como login)
// Admin: login "amplify" / senha "12345"
// Creator: login = @ do TikTok (sem @) / senha = "12345"

export const ADMIN_LOGIN = 'amplify'
export const ADMIN_PASSWORD = '12345'
export const CREATOR_PASSWORD = '12345'

export type UserSession =
  | { role: 'admin' }
  | { role: 'creator'; handle: string; name: string; categoria: string }
