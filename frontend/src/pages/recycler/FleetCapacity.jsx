import { Boxes, Factory, Gauge, Truck } from 'lucide-react'
import { getRecyclerSummary } from '../../api'
import { HealthRow } from '../../components/rows'
import { DataState, DetailGrid, EmptyState, Metric, PageHeader, Panel } from '../../components/ui'
import { formatKg, formatPercent, formatWeight, humanize } from '../../lib/format'
import { useApiData } from '../../lib/useApiData'

/** `GET /api/recycler/summary` — capacity is taken from your registered tons/day. */
export function FleetCapacity({ token, account }) {
  const { data, error, loading, reload } = useApiData(() => getRecyclerSummary(token), [token])

  return (
    <>
      <PageHeader
        eyebrow="Recycler partner workspace"
        title="Fleet & capacity"
        description="How much of your registered daily capacity is committed to assigned routes right now."
      />
      <DataState loading={loading} error={error} onRetry={reload} skeleton="metrics">
        {data && (
          <>
            <div className="metric-grid">
              <Metric icon={Gauge} label="Capacity in use" value={formatPercent(data.metrics.capacityUsedPercent)} note="Assigned vs registered" tone="green" />
              <Metric icon={Factory} label="Daily capacity" value={`${data.capacity.capacityTonsPerDay} t`} note="From your registration" tone="amber" />
              <Metric icon={Truck} label="Assigned load" value={formatWeight(data.capacity.assignedKg)} note="Active routes" tone="blue" />
              <Metric icon={Boxes} label="Available" value={formatWeight(data.capacity.availableKg)} note="Spare capacity today" tone="coral" />
            </div>

            <div className="content-grid two-col">
              <Panel title="Capacity planner" description={`${data.city} · ${data.capacity.capacityTonsPerDay} tons per day`}>
                <div
                  className="capacity-circle"
                  style={{ background: `conic-gradient(#50b67c 0 ${data.metrics.capacityUsedPercent}%, #e5eee7 ${data.metrics.capacityUsedPercent}%)` }}
                >
                  <div><strong>{formatPercent(data.metrics.capacityUsedPercent)}</strong><span>in use</span></div>
                </div>
                <div className="capacity-copy">
                  <span><i className="dot-green" />Assigned loads <b>{formatWeight(data.capacity.assignedKg)}</b></span>
                  <span><i className="dot-sand" />Available capacity <b>{formatWeight(data.capacity.availableKg)}</b></span>
                </div>
              </Panel>

              <Panel title="Routes by status" description="Dispatch batches assigned to your fleet">
                {Object.entries(data.statusCounts).length === 0
                  ? <EmptyState icon={Truck} hint="The scheduler assigns routes automatically when your city reaches the threshold.">No dispatches assigned yet.</EmptyState>
                  : Object.entries(data.statusCounts).map(([status, count]) => (
                    <HealthRow key={status} icon={Truck} label={humanize(status)} value={count} note={`${count} dispatch batch${count === 1 ? '' : 'es'}`} />
                  ))}
              </Panel>

              <Panel title="Service area" description="Where the scheduler assigns your routes" className="wide-panel">
                <DetailGrid
                  fields={[
                    ['Operating city', data.city],
                    ['Registered capacity', `${data.capacity.capacityTonsPerDay} tons/day`],
                    ['Capacity in kilograms', formatKg(data.capacity.capacityKg)],
                    ['Open pickups in city', data.pendingPickupCount],
                    ['Queued material', formatKg(data.metrics.queuedMaterialKg)],
                    ['Depot address', account?.address],
                  ]}
                />
              </Panel>
            </div>
          </>
        )}
      </DataState>
    </>
  )
}
