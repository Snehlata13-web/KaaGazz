import { ClipboardList, Route } from 'lucide-react'
import { getAdminRequests, getAdminSchedules } from '../../api'
import { RecyclerRow } from '../../components/rows'
import { DataState, EmptyState, PageHeader, Panel, Status } from '../../components/ui'
import { formatDateTime, formatKg, formatNumber, humanize, statusTone } from '../../lib/format'
import { useApiData } from '../../lib/useApiData'

/** `GET /api/admin/schedules` + `GET /api/admin/requests?status=REQUESTED` */
export function AdminNetworkMonitor({ token }) {
  const { data, error, loading, reload } = useApiData(
    () => Promise.all([getAdminSchedules(token), getAdminRequests(token, 'REQUESTED')])
      .then(([schedules, requests]) => ({ schedules, requests })),
    [token],
  )

  const schedules = data?.schedules || []
  const requests = data?.requests || []

  return (
    <>
      <PageHeader
        eyebrow="Operations"
        title="Network monitor"
        description="Automated pickup schedules and the open requests still building toward a threshold."
      />
      <DataState loading={loading} error={error} onRetry={reload}>
        <>
          <Panel
            title="Automated pickup schedules"
            description={`${schedules.length} assigned dispatch${schedules.length === 1 ? '' : 'es'}`}
            className="section-panel"
          >
            {schedules.length === 0 ? (
              <EmptyState icon={Route} hint="Dispatches appear here once a city crosses the collection threshold.">No automated schedules yet.</EmptyState>
            ) : (
              <div className="schedule-list">
                {schedules.map((item) => (
                  <div className="schedule-row" key={item.dispatchId}>
                    <Route size={16} />
                    <div>
                      <strong>{item.dispatchId}</strong>
                      <small>
                        {item.city} · {formatNumber(item.totalWeightKg)} kg · {item.recyclerName} ·
                        {' '}{item.pickupIds?.length || 0} pickups · scheduled {item.scheduledPickupDate || '—'}
                      </small>
                    </div>
                    <Status tone={statusTone(item.status)}>{humanize(item.status)}</Status>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel
            title="Open pickup requests"
            description={`${requests.length} request${requests.length === 1 ? '' : 's'} waiting to be grouped into a route`}
            className="route-panel"
          >
            {requests.length === 0 ? (
              <EmptyState icon={ClipboardList} hint="Every request has already been grouped into a route.">No open pickup requests.</EmptyState>
            ) : (
              <>
                <div className="table-head">
                  <span>Request</span>
                  <span>Material & location</span>
                  <span>Weight</span>
                  <span>Raised</span>
                  <span>Status</span>
                  <span />
                </div>
                {requests.map((item) => (
                  <RecyclerRow
                    key={item.requestId}
                    id={item.requestId.replace('PICKUP_', '').slice(0, 6).toUpperCase()}
                    area={item.city}
                    stops={item.materialTypes?.join(', ') || item.paperType}
                    load={formatKg(item.estimatedWeightKg)}
                    date={formatDateTime(item.createdAt)}
                    status={humanize(item.status)}
                    tone={statusTone(item.status)}
                  />
                ))}
              </>
            )}
          </Panel>
        </>
      </DataState>
    </>
  )
}
