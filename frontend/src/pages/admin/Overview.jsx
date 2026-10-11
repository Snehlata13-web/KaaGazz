import { BarChart3, Factory, Library, Recycle, Route, ShieldCheck, Truck, Users } from 'lucide-react'
import { getAdminSchedules, getAdminSummary } from '../../api'
import { HealthRow, Region } from '../../components/rows'
import { DataState, EmptyState, Metric, PageHeader, Panel, Status } from '../../components/ui'
import { formatKg, formatNumber, formatPercent, formatWeight, humanize, padCount, statusTone } from '../../lib/format'
import { useApiData } from '../../lib/useApiData'

/** `GET /api/admin/summary` + `GET /api/admin/schedules` */
export function AdminOverview({ token, onNavigate }) {
  const { data, error, loading, reload } = useApiData(
    () => Promise.all([getAdminSummary(token), getAdminSchedules(token)]).then(([summary, schedules]) => ({ summary, schedules })),
    [token],
  )

  const summary = data?.summary
  const schedules = data?.schedules || []

  return (
    <>
      <PageHeader
        eyebrow="Platform operations"
        title="The whole loop, at a glance."
        description="Monitor the network health. Scheduling is automated; your team stays informed, not buried in dispatch work."
        action="Impact reports"
        onAction={() => onNavigate('Impact reports')}
      />

      <DataState loading={loading} error={error} onRetry={reload} skeleton="metrics">
        {summary && (
          <>
            <div className="admin-alert">
              <div>
                <span className="alert-pulse" />
                <strong>Automations healthy</strong>
                <span>
                  {schedules.length} assigned dispatch{schedules.length === 1 ? '' : 'es'} · summary generated{' '}
                  {new Date(summary.generatedAt).toLocaleTimeString()}
                </span>
              </div>
              <button onClick={() => onNavigate('Network monitor')}>View system log</button>
            </div>

            <div className="metric-grid">
              <Metric icon={Users} label="Active partners" value={padCount(summary.metrics.activePartners)} note={`${summary.partnerCounts.institutions} institutions · ${summary.partnerCounts.ngos} NGOs · ${summary.partnerCounts.recyclers} recyclers`} tone="green" />
              <Metric icon={Truck} label="Activity today" value={padCount(summary.metrics.activityToday)} note="Pickup requests created today" tone="amber" />
              <Metric icon={Recycle} label="Paper circulating" value={formatWeight(summary.metrics.paperCirculatingKg)} note="Sum of recorded pickup weights" tone="blue" />
              <Metric icon={BarChart3} label="Network completion" value={formatPercent(summary.metrics.completionRate)} note="Completed pickup records" tone="coral" />
            </div>

            <div className="content-grid two-col">
              <Panel title="Regional automation" description="Collection volume by city" action="Open monitor" onAction={() => onNavigate('Network monitor')}>
                {summary.regions.length === 0 ? (
                  <EmptyState icon={Route} hint="Regions appear once institutions start raising pickup requests.">No regional activity recorded yet.</EmptyState>
                ) : (
                  <div className="region-row">
                    {summary.regions.map((region) => (
                      <Region
                        key={region.city}
                        city={region.city}
                        amount={formatKg(region.totalWeightKg)}
                        detail={`${region.pickupCount} pickups · ${region.dispatchCount} dispatches`}
                        status={region.dispatchCount > 0 ? 'Assigned' : 'Building'}
                        tone={region.dispatchCount > 0 ? 'green' : 'amber'}
                      />
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Partner health" description="Active stakeholders in the network" action="Directory" onAction={() => onNavigate('Partner directory')}>
                <HealthRow icon={Library} label="Institutions" value={padCount(summary.partnerCounts.institutions)} note="Approved schools and colleges" />
                <HealthRow icon={Users} label="NGO partners" value={padCount(summary.partnerCounts.ngos)} note="Approved organisations" />
                <HealthRow icon={Factory} label="Recyclers" value={padCount(summary.partnerCounts.recyclers)} note="Approved processing partners" />
                <HealthRow icon={ShieldCheck} label="Total approved" value={padCount(summary.metrics.activePartners)} note="Able to sign in today" />
              </Panel>

              <Panel title="Latest dispatches" description="Created automatically after regional thresholds are reached" action="Network monitor" onAction={() => onNavigate('Network monitor')} className="wide-panel">
                {schedules.length === 0 ? (
                  <EmptyState icon={Route} hint="Dispatches are created automatically after a threshold is reached.">No automated schedules yet.</EmptyState>
                ) : (
                  <div className="schedule-list">
                    {schedules.slice(0, 6).map((item) => (
                      <div className="schedule-row" key={item.dispatchId}>
                        <Route size={16} />
                        <div>
                          <strong>{item.dispatchId}</strong>
                          <small>{item.city} · {formatNumber(item.totalWeightKg)} kg · {item.recyclerName}</small>
                        </div>
                        <Status tone={statusTone(item.status)}>{humanize(item.status)}</Status>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </>
        )}
      </DataState>
    </>
  )
}
