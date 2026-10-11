const SESSION_KEY = 'kaagaz_session'
const TOKEN_KEY = 'kaagaz_token'

export const ROLE_BY_API_ROLE = {
  INSTITUTION: 'institution',
  NGO: 'ngo',
  RECYCLER: 'recycler',
  ADMIN: 'admin',
}

export function readSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null
  } catch {
    return null
  }
}

export function writeSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  localStorage.setItem(TOKEN_KEY, session.token)
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

export const readToken = () => localStorage.getItem(TOKEN_KEY)
