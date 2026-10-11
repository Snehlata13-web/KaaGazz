const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5050/api'

export { API_BASE_URL }

/**
 * Error thrown by every API helper. Carries the HTTP status and the requested
 * path so the UI can explain *why* a section is empty instead of printing a
 * raw backend string such as "Route not found".
 */
export class ApiError extends Error {
  constructor(message, { status, path } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.path = path
  }
}

/**
 * Single fetch wrapper for every KaaGazz endpoint.
 * Clears the stored session and broadcasts `kaagaz-auth-expired` on a 401 so the
 * app can drop straight back to the login screen instead of rendering empty panels.
 */
async function request(path, { method = 'GET', body, token, fallbackError = 'Request failed' } = {}) {
  let response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch {
    // Network-level failure: wrong host, server down, CORS, offline.
    throw new ApiError('Could not reach the KaaGazz API.', { status: 0, path })
  }

  if (response.status === 401 && token) {
    localStorage.removeItem('kaagaz_token')
    localStorage.removeItem('kaagaz_session')
    window.dispatchEvent(new Event('kaagaz-auth-expired'))
  }

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(result.error || fallbackError, { status: response.status, path })
  }
  return result.data
}

/* ----------------------------------------------------------------- auth */

export function registerAccount(role, payload) {
  const endpoint = { institution: 'institution', ngo: 'ngo', recycler: 'recycler' }[role]
  return request(`/auth/register/${endpoint}`, { method: 'POST', body: payload, fallbackError: 'Unable to create account' })
}

export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: { email, password }, fallbackError: 'Unable to sign in' })

export const requestPasswordReset = (email) =>
  request('/auth/forgot-password', { method: 'POST', body: { email }, fallbackError: 'Unable to start password reset' })

export const resetPassword = (token, password) =>
  request('/auth/reset-password', { method: 'POST', body: { token, password }, fallbackError: 'Unable to reset password' })

export const getProfile = (token) =>
  request('/auth/me', { token, fallbackError: 'Unable to load your profile' })

export const updateProfile = (token, updates) =>
  request('/auth/me', { method: 'PATCH', body: updates, token, fallbackError: 'Unable to save your profile' })

/* ---------------------------------------------------------- institution */

export const createPickupRequest = (payload, token) =>
  request('/pickups', { method: 'POST', body: payload, token, fallbackError: 'Unable to queue pickup request' })

export const getInstitutionSummary = (token) =>
  request('/institution/summary', { token, fallbackError: 'Unable to load campus summary' })

export const getInstitutionPickups = (token) =>
  request('/institution/pickups', { token, fallbackError: 'Unable to load pickup requests' })

/* ------------------------------------------------------------------ ngo */

export const createNgoDemand = (payload, token) =>
  request('/ngo/demands', { method: 'POST', body: payload, token, fallbackError: 'Unable to submit material demand' })

export const getNgoSummary = (token) =>
  request('/ngo/summary', { token, fallbackError: 'Unable to load NGO summary' })

export const getNgoDemands = (token) =>
  request('/ngo/demands', { token, fallbackError: 'Unable to load material demands' })

export const getNgoAllocations = (token) =>
  request('/ngo/allocations', { token, fallbackError: 'Unable to load allocations' })

/* ------------------------------------------------------------- recycler */

export const getRecyclerSummary = (token) =>
  request('/recycler/summary', { token, fallbackError: 'Unable to load recycler summary' })

export const getRecyclerQueue = (token) =>
  request('/recycler/queue', { token, fallbackError: 'Unable to load the route queue' })

export const getRecyclerHistory = (token) =>
  request('/recycler/history', { token, fallbackError: 'Unable to load load history' })

export const updateDispatchStatus = (token, dispatchId, status) =>
  request(`/recycler/dispatches/${dispatchId}/status`, {
    method: 'PATCH',
    body: { status },
    token,
    fallbackError: 'Unable to update this route',
  })

export const completeSorting = (token, dispatchId, payload) =>
  request(`/operations/dispatches/${dispatchId}/sorted`, {
    method: 'POST',
    body: payload,
    token,
    fallbackError: 'Unable to submit sorting result',
  })

/* ---------------------------------------------------------------- admin */

export const getAdminApprovals = (token) =>
  request('/admin/approvals', { token, fallbackError: 'Unable to load approvals' })

export const getAdminSchedules = (token) =>
  request('/admin/schedules', { token, fallbackError: 'Unable to load schedules' })

export const getAdminPartners = (token) =>
  request('/admin/partners', { token, fallbackError: 'Unable to load partners' })

export const getAdminSummary = (token) =>
  request('/admin/summary', { token, fallbackError: 'Unable to load network summary' })

export const getAdminImpact = (token) =>
  request('/admin/impact', { token, fallbackError: 'Unable to load the impact report' })

export const getAdminRequests = (token, status = 'REQUESTED') =>
  request(`/admin/requests?status=${encodeURIComponent(status)}`, { token, fallbackError: 'Unable to load pickup requests' })

export const updateAdminApproval = (token, role, id, action) =>
  request(`/admin/approvals/${role}/${id}/${action}`, {
    method: 'POST',
    body: {},
    token,
    fallbackError: 'Unable to update this registration',
  })
