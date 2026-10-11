import {
  getAdminApprovals, getInstitutionSummary, getNgoSummary, getRecyclerSummary,
} from '../api'

/**
 * The single number shown on the topbar bell, per role, plus the section it
 * links to. Each entry reuses an endpoint the workspace already serves rather
 * than inventing a notification feed.
 */
const ALERT_BY_ROLE = {
  institution: {
    section: 'Pickup requests',
    load: (token) => getInstitutionSummary(token)
      .then((data) => ({ count: data.metrics.activeRequests, label: 'pickup requests awaiting collection' })),
  },
  ngo: {
    section: 'Material demand',
    load: (token) => getNgoSummary(token)
      .then((data) => ({ count: data.metrics.openDemands, label: 'material demands still unmatched' })),
  },
  recycler: {
    section: 'Route queue',
    load: (token) => getRecyclerSummary(token)
      .then((data) => ({ count: data.metrics.readyRoutes, label: 'routes assigned to your fleet' })),
  },
  admin: {
    section: 'Registration approvals',
    load: (token) => getAdminApprovals(token)
      .then((items) => ({ count: items.length, label: 'registrations waiting for approval' })),
  },
}

export const alertSectionFor = (role) => ALERT_BY_ROLE[role]?.section
export const loadAlertFor = (role, token) => ALERT_BY_ROLE[role].load(token)
