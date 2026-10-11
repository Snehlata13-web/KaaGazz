import { Boxes, Truck } from 'lucide-react'
import { getRecyclerHistory } from '../../api'
import { RecyclerRow } from '../../components/rows'
import { DataState, EmptyState, Metric, MiniBars, PageHeader, Panel } from '../../components/ui'
import { formatDateTime, formatKg, formatWeight, humanize, padCount, statusTone } from '../../lib/format'
import { useApiData } from '../../lib/useApiData'

/** `GET /api/recycler/history` */
export function LoadHistory({ token }) {
  const { data, error, loading, reload } = useApiData(() => getRecyclerHistory(token), [token])
  const loads = data?.loads || []

  return (
    <>
      <PageHeader
        eyebrow="Recycler partner workspace"
        title="Load history"
        description="Every dispatch you have collected, sorted, or closed, with the weight recorded against it."
      />
      <DataState loading={loading} error={error} onRetry={reload} skeleton="metrics">
        {data && (
          <>
            <div className="metric-grid metric-grid-two">
              <Metric icon={Truck} label="Completed loads" value={padCount(data.totals.loadCount)} note="Collected, sorted, or closed" tone="green" />
              <Metric icon={Boxes} label="Total collected" value={formatWeight(data.totals.totalWeightKg)} note="All time" tone="blue" />
            </div>

            <Panel title="Monthly collection" description="Weight collected over the last 8 months">
              <MiniBars series={data.monthly} />
            </Panel>

            <Panel title="Collected loads" description={`${loads.length} record${loads.length === 1 ? '' : 's'}`} className="route-panel">
              {loads.length === 0 ? (
                <EmptyState icon={Truck} hint="Mark a route collected in the route queue and it will appear here.">No completed loads yet.</EmptyState>
              ) : (
                <>
                  <div className="table-head">
                    <span>Route</span>
                    <span>Area & stops</span>
                    <span>Collection load</span>
                    <span>Completed</span>
                    <span>Status</span>
                    <span />
                  </div>
                  {loads.map((item) => (
                    <RecyclerRow
                      key={item.dispatchId}
                      id={item.dispatchId.replace('DISPATCH_', '').slice(0, 6).toUpperCase()}
                      area={item.city}
                      stops={`${item.pickupIds?.length || 0} institutions`}
                      load={formatKg(item.totalWeightKg)}
                      date={formatDateTime(item.statusUpdatedAt || item.createdAt)}
                      status={humanize(item.status)}
                      tone={statusTone(item.status)}
                    />
                  ))}
                </>
              )}
            </Panel>
          </>
        )}
      </DataState>
    </>
  )
}
