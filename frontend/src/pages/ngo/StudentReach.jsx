import { BookOpen, MapPin, Sparkles, Users } from 'lucide-react'
import { getNgoSummary } from '../../api'
import { DataState, EmptyState, Metric, MiniBars, PageHeader, Panel } from '../../components/ui'
import { DEMAND_ITEM_TYPES } from '../../lib/constants'
import { formatNumber, formatPercent, humanize } from '../../lib/format'
import { useApiData } from '../../lib/useApiData'

const itemLabel = (value) => DEMAND_ITEM_TYPES.find((item) => item.value === value)?.label || humanize(value)

/** `GET /api/ngo/summary` — reach derived from allocated bundles. */
export function StudentReach({ token }) {
  const { data, error, loading, reload } = useApiData(() => getNgoSummary(token), [token])

  return (
    <>
      <PageHeader
        eyebrow="NGO partner workspace"
        title="Student reach"
        description="The people behind the numbers, estimated at four students per allocated bundle."
      />
      <DataState loading={loading} error={error} onRetry={reload} skeleton="metrics">
        {data && (
          <>
            <div className="metric-grid">
              <Metric icon={BookOpen} label="Students reached" value={formatNumber(data.reach.studentsReached)} note="4 students per bundle" tone="green" />
              <Metric icon={Users} label="Bundles delivered" value={formatNumber(data.metrics.allocatedQuantity)} note="Allocated to your centres" tone="amber" />
              <Metric icon={MapPin} label="Cities served" value={formatNumber(data.reach.centres)} note="Distinct delivery cities" tone="blue" />
              <Metric icon={Sparkles} label="Allocation rate" value={formatPercent(data.metrics.allocationRate)} note="Of requested bundles" tone="coral" />
            </div>

            <div className="content-grid two-col">
              <Panel title="Reach by material" description="Allocated bundles by material type">
                {data.byItemType.length === 0 ? (
                  <EmptyState icon={BookOpen} hint="Reach is calculated from bundles allocated to your demands.">No allocations recorded yet.</EmptyState>
                ) : (
                  <div className="reach-bars reach-bars-standalone">
                    {data.byItemType.map((item) => {
                      const max = Math.max(...data.byItemType.map((entry) => entry.quantity), 1)
                      return (
                        <div key={item.itemType}>
                          <span>{itemLabel(item.itemType)}</span>
                          <i style={{ height: `${Math.max(8, Math.round((item.quantity / max) * 95))}%` }} />
                          <b>{formatNumber(item.quantity)}</b>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Panel>
              <Panel title="Allocation trend" description="Bundles allocated over the last 8 months">
                <MiniBars series={data.monthly} />
              </Panel>
            </div>
          </>
        )}
      </DataState>
    </>
  )
}
