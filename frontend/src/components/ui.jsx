import {
  ArrowUpRight, Boxes, Check, Leaf, MoreHorizontal, Plus, RefreshCw, TriangleAlert, X,
} from 'lucide-react'
import { API_BASE_URL } from '../api'
import { formatNumber, toBarHeights } from '../lib/format'

export function PageHeader({ eyebrow, title, description, action, onAction, actionIcon: ActionIcon = Plus }) {
  return (
    <section className="page-header">
      <div>
        <span className="eyebrow"><i />{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && (
        <button className="primary-action" onClick={onAction}>
          <ActionIcon size={17} />{action}
        </button>
      )}
    </section>
  )
}

export function Panel({ title, description, action, onAction, children, className = '' }) {
  return (
    <section className={`data-panel ${className}`}>
      <div className="panel-title">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {action && (
          onAction
            ? <button className="panel-action" onClick={onAction}>{action}<ArrowUpRight size={13} /></button>
            : <span className="panel-action panel-action-static">{action}<ArrowUpRight size={13} /></span>
        )}
      </div>
      {children}
    </section>
  )
}

/**
 * `trend` is optional: the arrow is only drawn when a direction is given, so a
 * neutral note is not dressed up as growth.
 */
export function Metric({ icon: Icon, label, value, note, tone, trend }) {
  return (
    <div className="metric">
      <span className={`metric-badge ${tone}`}><Icon size={17} /></span>
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
        <span className={`metric-note ${trend ? `trend-${trend}` : ''}`}>
          {trend === 'up' && <ArrowUpRight size={11} />}
          {trend === 'down' && <ArrowUpRight size={11} className="arrow-down" />}
          {note}
        </span>
      </div>
      <MoreHorizontal size={16} className="dots" />
    </div>
  )
}

export function Status({ children, tone = 'green' }) {
  return <span className={`status status-${tone}`}>{children}</span>
}

export function Notice({ text, onClose, tone = 'green' }) {
  return (
    <div className={`notice notice-${tone}`}>
      <Check size={15} />{text}
      <button onClick={onClose}><X size={14} /></button>
    </div>
  )
}

export function ImpactNumber({ value, label }) {
  return <div className="strip-number"><strong>{value}</strong><small>{label}</small></div>
}

export function NetworkStrip({ label = 'Network impact', diverted, trees, co2, trend }) {
  return (
    <div className="network-strip">
      <div className="strip-leaf"><Leaf size={19} /></div>
      <div className="strip-intro">
        <small>{label}</small>
        <strong>Small actions, a lighter footprint.</strong>
      </div>
      <ImpactNumber value={diverted} label="kg paper diverted" />
      <ImpactNumber value={trees} label="tree equivalents" />
      <ImpactNumber value={co2} label="CO₂ avoided" />
      <div className="strip-trend">
        <span>{trend}</span>
        <small>this month <ArrowUpRight size={12} /></small>
      </div>
    </div>
  )
}

/** Bar chart driven by an API monthly series: `[{ label, value }]`. */
export function MiniBars({ series = [] }) {
  const heights = toBarHeights(series.map((point) => point.value))
  const hasValues = series.some((point) => Number(point.value) > 0)
  if (!series.length) return <EmptyState>No chart data yet.</EmptyState>
  return (
    <>
      <div className={`mini-bars ${hasValues ? '' : 'mini-bars-flat'}`}>
        {series.map((point, index) => (
          <i key={point.label + index} style={{ height: `${heights[index]}%` }} title={`${point.label}: ${formatNumber(point.value)}`} />
        ))}
      </div>
      <div className="mini-bars-axis">
        {series.map((point, index) => <span key={point.label + index}>{point.label}</span>)}
      </div>
      {!hasValues && <p className="chart-note">No activity recorded in this period yet.</p>}
    </>
  )
}

export function EmptyState({ icon: Icon = Boxes, children, hint }) {
  return (
    <div className="state-card">
      <span className="state-icon"><Icon size={19} /></span>
      <div>
        <strong>{children}</strong>
        {hint && <small>{hint}</small>}
      </div>
    </div>
  )
}

/** Shimmer placeholders that match the shape of the content being loaded. */
export function Skeleton({ variant = 'panel' }) {
  if (variant === 'metrics') {
    return (
      <div className="metric-grid">
        {[0, 1, 2, 3].map((index) => (
          <div className="metric skeleton-metric" key={index}>
            <span className="skeleton-block skeleton-badge" />
            <div>
              <span className="skeleton-block skeleton-line short" />
              <span className="skeleton-block skeleton-line big" />
              <span className="skeleton-block skeleton-line" />
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div className="skeleton-rows">
      {[0, 1, 2, 3].map((index) => (
        <div className="skeleton-row" key={index}>
          <span className="skeleton-block skeleton-dot" />
          <span className="skeleton-block skeleton-line" />
          <span className="skeleton-block skeleton-line short" />
        </div>
      ))}
    </div>
  )
}

/**
 * Turns an ApiError into something a person can act on.
 *
 * A 404 from our own API means the connected backend does not expose the
 * endpoint at all, which is a deployment/configuration problem rather than
 * "there is no data" — so it is reported as such instead of printing the raw
 * "Route not found" string.
 */
function describeError(error) {
  const status = error?.status
  const path = error?.path
  if (status === 0) {
    return {
      title: 'Cannot reach the KaaGazz API',
      detail: `No response from ${API_BASE_URL}. Check that the API is running and that VITE_API_URL is correct.`,
    }
  }
  if (status === 404) {
    return {
      title: 'This feature is not available on the connected API',
      detail: `${API_BASE_URL}${path || ''} returned 404. The backend serving this workspace is missing the endpoint — it most likely needs redeploying.`,
    }
  }
  if (status === 403) {
    return {
      title: 'Not permitted for this account',
      detail: error.message,
    }
  }
  if (status === 503) {
    return {
      title: 'Backend storage is unavailable',
      detail: error.message,
    }
  }
  if (status >= 500) {
    return {
      title: 'The API could not complete this request',
      detail: `${error.message} (HTTP ${status} from ${path || 'the API'}).`,
    }
  }
  return { title: error?.message || 'Something went wrong', detail: path ? `Requested ${path}.` : null }
}

export function ErrorState({ error, onRetry }) {
  const { title, detail } = describeError(error)
  return (
    <div className="state-card state-error">
      <span className="state-icon"><TriangleAlert size={19} /></span>
      <div>
        <strong>{title}</strong>
        {detail && <small>{detail}</small>}
      </div>
      {onRetry && <button type="button" className="state-retry" onClick={onRetry}><RefreshCw size={13} />Retry</button>}
    </div>
  )
}

/**
 * Standard wrapper for every data-backed section: skeleton while loading, an
 * actionable error card, an empty state, or the loaded children.
 */
export function DataState({ loading, error, onRetry, isEmpty, emptyIcon, emptyText, emptyHint, skeleton = 'panel', children }) {
  if (loading) return <Skeleton variant={skeleton} />
  if (error) return <ErrorState error={error} onRetry={onRetry} />
  if (isEmpty) return <EmptyState icon={emptyIcon} hint={emptyHint}>{emptyText}</EmptyState>
  return children
}

/** Label/value grid used by the profile, approvals, and directory sections. */
export function DetailGrid({ fields }) {
  return (
    <div className="detail-grid">
      {fields.filter(([, value]) => value !== undefined && value !== null && value !== '').map(([label, value]) => (
        <div className="profile-detail" key={label}>
          <small>{label}</small>
          <strong>{value}</strong>
        </div>
      ))}
    </div>
  )
}
