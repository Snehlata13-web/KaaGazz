/** Formatting helpers shared by every workspace section. */

export const formatNumber = (value) => Number(value || 0).toLocaleString('en')

export const formatKg = (value) => `${formatNumber(Math.round(Number(value) || 0))} kg`

/** Shows kilograms under a tonne, and tonnes above it, so metrics stay readable. */
export const formatWeight = (value) => {
  const kg = Number(value) || 0
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : formatKg(kg)
}

export const formatPercent = (value) => `${Math.round((Number(value) || 0) * 10) / 10}%`

export const padCount = (value) => String(Number(value) || 0).padStart(2, '0')

export const formatDate = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString('en', { day: '2-digit', month: 'short' })
}

export const formatDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return `${date.toLocaleDateString('en', { day: '2-digit', month: 'short' })} · ${date.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}`
}

export const formatDayMonth = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en', { day: '2-digit', month: 'short' }).toUpperCase()
}

/** Turns API enum values such as `IN_TRANSIT` into `In transit`. */
export const humanize = (value) => {
  const text = String(value || '').replace(/_/g, ' ').trim()
  return text ? text.charAt(0).toUpperCase() + text.slice(1).toLowerCase() : '—'
}

const STATUS_TONES = {
  REQUESTED: 'amber',
  BUILDING: 'amber',
  PENDING: 'amber',
  MATCHING: 'amber',
  ASSIGNED: 'green',
  SCHEDULED: 'green',
  IN_TRANSIT: 'blue',
  COLLECTED: 'blue',
  SORTED: 'blue',
  PICKED_UP: 'green',
  COMPLETED: 'green',
  APPROVED: 'green',
  REJECTED: 'coral',
}

export const statusTone = (status) => STATUS_TONES[String(status || '').toUpperCase()] || 'sand'

/** Scales a series of values into 8-95% bar heights for the mini chart. */
export const toBarHeights = (values) => {
  const max = Math.max(...values.map((value) => Number(value) || 0), 0)
  if (!max) return values.map(() => 8)
  return values.map((value) => Math.max(8, Math.round(((Number(value) || 0) / max) * 95)))
}

export const accountName = (account, fallback = '') =>
  account?.name || account?.companyName || fallback

/** Builds avatar initials from the real account name, e.g. "EcoMill Logistics" -> "EL". */
export const initialsFrom = (name, fallback = '··') => {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean)
  if (!words.length) return fallback
  const letters = words.slice(0, 2).map((word) => word[0]).join('')
  return (letters.length === 1 ? words[0].slice(0, 2) : letters).toUpperCase()
}
