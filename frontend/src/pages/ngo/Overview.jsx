import { useState } from 'react'
import { BookOpen, ClipboardList, Clock3, PackageCheck } from 'lucide-react'
import { createNgoDemand, getNgoAllocations, getNgoSummary } from '../../api'
import { DemandForm } from '../../components/DemandForm'
import { AllocationRow } from '../../components/rows'
import { DataState, EmptyState, Metric, MiniBars, Notice, PageHeader, Panel } from '../../components/ui'
import { DEMAND_ITEM_TYPES } from '../../lib/constants'
import { formatDayMonth, formatNumber, formatPercent, humanize, padCount, statusTone } from '../../lib/format'
import { useApiAction, useApiData } from '../../lib/useApiData'

const itemLabel = (value) => DEMAND_ITEM_TYPES.find((item) => item.value === value)?.label || humanize(value)

/** `GET /api/ngo/summary` + `GET /api/ngo/allocations` */
export function NgoOverview({ token, account, onNavigate }) {
  const [demandOpen, setDemandOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const { data, error, loading, reload } = useApiData(
    () => Promise.all([getNgoSummary(token), getNgoAllocations(token)]).then(([summary, allocations]) => ({ summary, allocations })),
    [token],
  )

  const create = useApiAction(
    (payload) => createNgoDemand(payload, token),
    {
      onSuccess: () => {
        setDemandOpen(false)
        setNotice('Demand submitted. It will be matched automatically against sorted material in your city.')
        reload()
      },
    },
  )

  const summary = data?.summary
  const upcoming = (data?.allocations || []).filter((item) => item.status === 'ASSIGNED').slice(0, 5)

  return (
    <>
      <PageHeader
        eyebrow="NGO partner workspace"
        title="Materials for the next chapter."
        description="Track your requisitions, upcoming notebook allocations, and student reach."
        action="Request materials"
        onAction={() => setDemandOpen(true)}
      />
      {notice && <Notice text={notice} onClose={() => setNotice('')} />}

      <DataState loading={loading} error={error} onRetry={reload} skeleton="metrics">
        {summary && (
          <>
            <div className="metric-grid">
              <Metric icon={ClipboardList} label="Open demands" value={padCount(summary.metrics.openDemands)} note={`${summary.metrics.totalDemands} submitted in total`} tone="green" />
              <Metric icon={PackageCheck} label="Bundles allocated" value={formatNumber(summary.metrics.allocatedQuantity)} note={`of ${formatNumber(summary.metrics.requestedQuantity)} requested`} tone="amber" />
              <Metric icon={BookOpen} label="Students reached" value={formatNumber(summary.reach.studentsReached)} note={`Across ${summary.reach.centres} cities`} tone="blue" />
              <Metric
                icon={Clock3}
                label="Next allocation"
                value={summary.nextAllocation ? formatDayMonth(summary.nextAllocation.createdAt) : '—'}
                note={summary.nextAllocation ? `${formatNumber(summary.nextAllocation.quantity)} bundles` : 'Nothing scheduled'}
                tone="coral"
              />
            </div>

            <div className="content-grid two-col">
              <Panel title="Demand overview" description="Your material requests by status" action="Open demand portal" onAction={() => onNavigate('Material demand')}>
                <div className="demand-total">
                  <div>
                    <strong>{formatNumber(summary.metrics.requestedQuantity)}</strong>
                    <span>bundles requested</span>
                  </div>
                  <div className="demand-progress">
                    <div><span>Allocated</span><b>{formatPercent(summary.metrics.allocationRate)}</b></div>
                    <div className="progress-track"><i style={{ width: `${Math.min(100, summary.metrics.allocationRate)}%` }} /></div>
                    <small>{formatNumber(summary.metrics.allocatedQuantity)} bundles matched to available stock</small>
                  </div>
                </div>
                <div className="demand-breakdown">
                  {summary.byItemType.length === 0
                    ? <span>No allocations yet.</span>
                    : summary.byItemType.map((item, index) => (
                      <span key={item.itemType}>
                        <i className={index % 2 === 0 ? 'dot-green' : 'dot-blue'} />
                        {itemLabel(item.itemType)} <b>{formatNumber(item.quantity)}</b>
                      </span>
                    ))}
                </div>
              </Panel>

              <Panel title="Upcoming allocations" description="Material on its way to your centres" action="See all" onAction={() => onNavigate('Allocations')}>
                {upcoming.length === 0
                  ? <EmptyState icon={PackageCheck} hint="Material is matched automatically once a recycler reports sorted output.">No allocations scheduled yet.</EmptyState>
                  : upcoming.map((item) => (
                    <AllocationRow
                      key={item.allocationId}
                      date={formatDayMonth(item.createdAt)}
                      title={itemLabel(item.itemType)}
                      meta={`${formatNumber(item.quantity)} bundles · ${item.dispatchId}`}
                      status={humanize(item.status)}
                      tone={statusTone(item.status)}
                    />
                  ))}
              </Panel>

              <Panel title="Allocation trend" description="Bundles allocated over the last 8 months" className="wide-panel">
                <MiniBars series={summary.monthly} />
              </Panel>
            </div>
          </>
        )}
      </DataState>

      {demandOpen && (
        <DemandForm
          account={account}
          pending={create.pending}
          error={create.error}
          onClose={() => setDemandOpen(false)}
          onSubmit={create.run}
        />
      )}
    </>
  )
}
