import { Boxes, Gauge, Route, Sparkles, Truck } from 'lucide-react'
import { getRecyclerQueue, getRecyclerSummary } from '../../api'
import { RecyclerRow, RequestRow } from '../../components/rows'
import { DataState, EmptyState, Metric, PageHeader, Panel, Status } from '../../components/ui'
import { formatDateTime, formatKg, formatPercent, formatWeight, humanize, padCount, statusTone } from '../../lib/format'
import { useApiData } from '../../lib/useApiData'

/** `GET /api/recycler/summary` + `GET /api/recycler/queue` */
export function RecyclerOverview({ token, onNavigate }) {
  const { data, error, loading, reload } = useApiData(
    () => Promise.all([getRecyclerSummary(token), getRecyclerQueue(token)]).then(([summary, queue]) => ({ summary, queue })),
    [token],
  )

  const summary = data?.summary
  const queue = data?.queue

  return (
    <>
      <PageHeader
        eyebrow="Recycler partner workspace"
        title="Routes that make a difference."
        description="Your regional queue is grouped automatically as institutions cross the collection threshold."
        action="View route queue"
        onAction={() => onNavigate('Route queue')}
      />

      <div className="automation-banner">
        <div className="automation-icon"><Sparkles size={20} /></div>
        <div>
          <strong>Automatic dispatch is active</strong>
          <span>KaaGazz is clustering nearby institutions and assigning loads to your available capacity.</span>
        </div>
        <Status tone="green">System live</Status>
      </div>

      <DataState loading={loading} error={error} onRetry={reload} skeleton="metrics">
        {summary && queue && (
          <>
            <div className="metric-grid">
              <Metric icon={Route} label="Ready routes" value={padCount(summary.metrics.readyRoutes)} note={`Assigned in ${summary.city}`} tone="green" />
              <Metric icon={Boxes} label="Queued material" value={formatKg(summary.metrics.queuedMaterialKg)} note={`${summary.pendingPickupCount} pickups waiting`} tone="amber" />
              <Metric icon={Truck} label="Collected this month" value={formatWeight(summary.metrics.collectedThisMonthKg)} note="Completed loads" tone="blue" />
              <Metric icon={Gauge} label="Fleet capacity" value={formatPercent(summary.metrics.capacityUsedPercent)} note={`${formatWeight(summary.capacity.availableKg)} available`} tone="coral" />
            </div>

            <Panel
              title="Automated route queue"
              description={`Routes are created when local collection crosses ${queue.threshold} kg`}
              action="Open route queue"
              onAction={() => onNavigate('Route queue')}
              className="route-panel"
            >
              {queue.routes.length === 0 ? (
                <EmptyState
                  icon={Route}
                  hint={`${formatKg(queue.building.remainingToThresholdKg)} more needed in ${queue.building.city} to trigger the next one.`}
                >
                  No routes assigned yet.
                </EmptyState>
              ) : (
                <>
                  <div className="table-head">
                    <span>Route</span>
                    <span>Area & stops</span>
                    <span>Collection load</span>
                    <span>Scheduled</span>
                    <span>Status</span>
                    <span />
                  </div>
                  {queue.routes.slice(0, 5).map((item) => (
                    <RecyclerRow
                      key={item.dispatchId}
                      id={item.dispatchId.replace('DISPATCH_', '').slice(0, 6).toUpperCase()}
                      area={item.city}
                      stops={`${item.pickupIds?.length || 0} institutions`}
                      load={formatKg(item.totalWeightKg)}
                      date={item.scheduledPickupDate || formatDateTime(item.createdAt)}
                      status={humanize(item.status)}
                      tone={statusTone(item.status)}
                      onOpen={() => onNavigate('Route queue')}
                    />
                  ))}
                </>
              )}
            </Panel>

            <div className="content-grid two-col">
              <Panel title="Capacity planner" description={`Today · ${summary.capacity.capacityTonsPerDay} tons/day`} action="Fleet & capacity" onAction={() => onNavigate('Fleet & capacity')}>
                <div
                  className="capacity-circle"
                  style={{ background: `conic-gradient(#50b67c 0 ${summary.metrics.capacityUsedPercent}%, #e5eee7 ${summary.metrics.capacityUsedPercent}%)` }}
                >
                  <div><strong>{formatPercent(summary.metrics.capacityUsedPercent)}</strong><span>in use</span></div>
                </div>
                <div className="capacity-copy">
                  <span><i className="dot-green" />Assigned loads <b>{formatWeight(summary.capacity.assignedKg)}</b></span>
                  <span><i className="dot-sand" />Available capacity <b>{formatWeight(summary.capacity.availableKg)}</b></span>
                </div>
              </Panel>

              <Panel title="Route status mix" description="Every dispatch assigned to you" action="View history" onAction={() => onNavigate('Load history')}>
                {Object.entries(summary.statusCounts).length === 0
                  ? <EmptyState icon={Truck} hint="Routes are assigned automatically by the scheduler.">No dispatches assigned yet.</EmptyState>
                  : Object.entries(summary.statusCounts).map(([status, count]) => (
                    <RequestRow
                      key={status}
                      title={humanize(status)}
                      meta={`${count} route${count === 1 ? '' : 's'}`}
                      status={String(count)}
                      tone={statusTone(status)}
                    />
                  ))}
              </Panel>
            </div>
          </>
        )}
      </DataState>
    </>
  )
}
