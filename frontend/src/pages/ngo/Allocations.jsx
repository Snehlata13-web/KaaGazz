import { PackageCheck } from 'lucide-react'
import { getNgoAllocations } from '../../api'
import { AllocationRow } from '../../components/rows'
import { DataState, PageHeader, Panel } from '../../components/ui'
import { DEMAND_ITEM_TYPES } from '../../lib/constants'
import { formatDayMonth, formatNumber, humanize, statusTone } from '../../lib/format'
import { useApiData } from '../../lib/useApiData'

const itemLabel = (value) => DEMAND_ITEM_TYPES.find((item) => item.value === value)?.label || humanize(value)

/** `GET /api/ngo/allocations` */
export function Allocations({ token }) {
  const { data, error, loading, reload } = useApiData(() => getNgoAllocations(token), [token])
  const allocations = data || []
  const totalQuantity = allocations.reduce((total, item) => total + (Number(item.quantity) || 0), 0)

  return (
    <>
      <PageHeader
        eyebrow="NGO partner workspace"
        title="Allocations"
        description="Material matched to your demands by the automated allocation worker."
      />
      <Panel
        title="Allocated material"
        description={`${allocations.length} allocation${allocations.length === 1 ? '' : 's'} · ${formatNumber(totalQuantity)} bundles`}
        className="section-panel"
      >
        <DataState
          loading={loading}
          error={error}
          onRetry={reload}
          isEmpty={allocations.length === 0}
          emptyIcon={PackageCheck}
          emptyText="No allocations yet. They appear once a recycler reports sorted material in your city."
        >
          <>
            {allocations.map((item) => (
              <AllocationRow
                key={item.allocationId}
                date={formatDayMonth(item.createdAt)}
                title={itemLabel(item.itemType)}
                meta={`${formatNumber(item.quantity)} bundles · demand ${item.demandId?.replace('DEMAND_', '').slice(0, 6).toUpperCase()} · dispatch ${item.dispatchId?.replace('DISPATCH_', '').slice(0, 6).toUpperCase()}`}
                status={humanize(item.status)}
                tone={statusTone(item.status)}
              />
            ))}
          </>
        </DataState>
      </Panel>
    </>
  )
}
