import { useMemo, useState } from 'react'
import {
  ArrowUpRight, Bell, CircleHelp, Leaf, LogOut, Menu, MoreHorizontal, Search, X,
} from 'lucide-react'
import { getProfile } from '../api'
import { navByRole, roleMeta, roleOptions } from '../lib/constants'
import { accountName, initialsFrom } from '../lib/format'
import { alertSectionFor, loadAlertFor } from '../lib/alerts'
import { useApiData } from '../lib/useApiData'
import { navIcon } from './navIcon'
import { sectionsByRole } from '../pages/sections'

/**
 * Workspace shell: sidebar, topbar, and the active section.
 *
 * Every sidebar item renders its own section component *inside* this shell, so
 * the sidebar, breadcrumb, and topbar stay on screen on every page, including
 * the profile page.
 */
export function DashboardLayout({ role, user, token, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const nav = navByRole[role]
  const [activePage, setActivePage] = useState(nav[0])
  const [query, setQuery] = useState('')

  // The signed-in account is loaded once here and shared with every section so
  // forms can pre-fill city/address and the profile page shows live values.
  const profile = useApiData(() => getProfile(token), [token])
  const account = profile.data || user || {}

  // Real count behind the bell, taken from this role's own summary endpoint.
  const alert = useApiData(() => loadAlertFor(role, token), [role, token])
  const alertSection = alertSectionFor(role)
  const alertCount = alert.data?.count || 0

  const displayName = accountName(account, user?.name || roleMeta[role].name)
  const meta = {
    ...roleMeta[role],
    name: displayName,
    initials: initialsFrom(displayName, roleMeta[role].initials),
  }
  const RoleIcon = roleOptions.find((item) => item.id === role).icon

  const sections = sectionsByRole[role]
  const Section = sections[activePage] || sections[nav[0]]

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []
    return nav.filter((item) => item.toLowerCase().includes(term))
  }, [query, nav])

  const goTo = (item) => {
    setActivePage(item)
    setQuery('')
    setMobileOpen(false)
  }

  return (
    <div className="dashboard-shell">
      <aside className={`dashboard-sidebar ${mobileOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <span className="brand-symbol"><Leaf size={18} /></span>
          <strong>KaaGazz</strong>
          <button className="close-sidebar" onClick={() => setMobileOpen(false)}><X size={19} /></button>
        </div>
        <div className="sidebar-context">
          <span>Signed in as</span>
          <strong><RoleIcon size={14} />{meta.short}</strong>
        </div>
        {role === 'admin' && <div className="sidebar-section-label">Administration</div>}
        <nav className="dashboard-nav">
          {nav.map((item) => (
            <button
              key={item}
              className={activePage === item ? 'nav-active' : ''}
              onClick={() => goTo(item)}
            >
              {navIcon(item)}<span>{item}</span>
              {item === alertSection && alertCount > 0 && <b>{String(alertCount).padStart(2, '0')}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-guide">
            <CircleHelp size={17} />
            <span><strong>Need a hand?</strong><small>Talk to your guide</small></span>
            <ArrowUpRight size={14} />
          </div>
          <button className="side-action" onClick={onLogout}><LogOut size={16} />Sign out</button>
          <div className="account-row">
            <span className="avatar">{meta.initials}</span>
            <span><strong>{meta.name}</strong><small>{account.email || 'Active workspace'}</small></span>
            <MoreHorizontal size={16} />
          </div>
        </div>
      </aside>
      {mobileOpen && <button className="sidebar-overlay" onClick={() => setMobileOpen(false)} aria-label="Close menu" />}
      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <button className="mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
          <div className="topbar-crumb">
            <span>Workspace</span><b>/</b><strong>{meta.short}</strong><b>/</b><strong>{activePage}</strong>
          </div>
          <div className="topbar-right">
            <div className="top-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && matches.length) goTo(matches[0])
                  if (event.key === 'Escape') setQuery('')
                }}
                placeholder="Search your workspace"
                aria-label="Search workspace sections"
              />
              {query && (
                <div className="search-results">
                  {matches.length === 0
                    ? <span className="search-empty">No section matches “{query}”.</span>
                    : matches.map((item) => (
                      <button type="button" key={item} onClick={() => goTo(item)}>
                        {navIcon(item)}{item}
                      </button>
                    ))}
                </div>
              )}
            </div>
            <button
              className="top-icon"
              onClick={() => alertSection && goTo(alertSection)}
              title={alert.data ? `${alertCount} ${alert.data.label}` : 'Loading activity…'}
              aria-label={alert.data ? `${alertCount} ${alert.data.label}` : 'Loading activity'}
            >
              <Bell size={18} />
              {alertCount > 0 && <i />}
              {alertCount > 0 && <b className="top-badge">{alertCount > 9 ? '9+' : alertCount}</b>}
            </button>
            <span className="avatar" title={displayName}>{meta.initials}</span>
          </div>
        </header>
        <div className="dashboard-page">
          <Section
            role={role}
            meta={meta}
            token={token}
            account={account}
            accountLoading={profile.loading}
            accountError={profile.error}
            onReloadAccount={() => { profile.reload(); alert.reload() }}
            onNavigate={setActivePage}
          />
        </div>
      </main>
    </div>
  )
}
