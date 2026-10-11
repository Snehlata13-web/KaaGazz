import { useState } from 'react'
import { ClipboardList } from 'lucide-react'
import { createNgoDemand, getNgoDemands } from '../../api'
import { DemandForm } from '../../components/DemandForm'
import { RecyclerRow } from '../../components/rows'
import { DataState, Notice, PageHeader, Panel } from '../../components/ui'
import { DEMAND_ITEM_TYPES } from '../../lib/constants'
import { formatDateTime, formatNumber, humanize, statusTone } from '../../lib/format'
import { useApiAction, useApiData } from '../../lib/useApiData'

const itemLabel = (value) => DEMAND_ITEM_TYPES.find((item) => item.value === value)?.label || humanize(value)

/** `GET /api/ngo/demands` and `POST /api/ngo/demands` */
export function MaterialDemand({ token, account }) {
  const [demandOpen, setDemandOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const { data, error, loading, reload } = useApiData(() => getNgoDemands(token), [token])

  const create = useApiAction(
    (payload) => createNgoDemand(payload, token),
    {
      onSuccess: () => {
        setDemandOpen(false)
        setNotice('Demand submitted. It will appear here once the worker has processed it.')
        reload()
      },
    },
  )

  const demands = data || []
  const statuses = ['ALL', ...new Set(demands.map((item) => item.status).filter(Boolean))]
  const visible = statusFilter === 'ALL' ? demands : demands.filter((item) => item.status === statusFilter)

  return (
    <>
      <PageHeader
        eyebrow="NGO partner workspace"
        title="Material demand"
        description="Every requisition you have raised, and how much of it has been matched to sorted stock."
        action="Request materials"
        onAction={() => setDemandOpen(true)}
      />
      {notice && <Notice text={notice} onClose={() => setNotice('')} />}

      <Panel
        title="All demands"
        description={`${demands.length} requisition${demands.length === 1 ? '' : 's'} on record`}
        className="section-panel"
      >
        <div className="filter-row">
          {statuses.map((status) => (
            <button
              key={status}
              type="button"
              className={statusFilter === status ? 'filter-chip chip-active' : 'filter-chip'}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'ALL' ? 'All' : humanize(status)}
            </button>
          ))}
        </div>
        <DataState
          loading={loading}
          error={error}
          onRetry={reload}
          isEmpty={visible.length === 0}
          emptyIcon={ClipboardList}
          emptyText="No material demands match this filter."
        >
          <>
            <div className="table-head">
              <span>Demand</span>
              <span>Material & delivery</span>
              <span>Quantity</span>
              <span>Raised</span>
              <span>Status</span>
              <span />
            </div>
            {visible.map((item) => (
              <RecyclerRow
                key={item.demandId}
                id={item.demandId.replace('DEMAND_', '').slice(0, 6).toUpperCase()}
                area={itemLabel(item.itemType)}
                stops={item.deliveryAddress}
                load={`${formatNumber(item.quantity)} bdl`}
                date={formatDateTime(item.createdAt)}
                status={humanize(item.status)}
                tone={statusTone(item.status)}
              />
            ))}
          </>
        </DataState>
      </Panel>

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
