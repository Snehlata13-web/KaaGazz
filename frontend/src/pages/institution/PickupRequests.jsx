import { useState } from 'react'
import { FileText } from 'lucide-react'
import { createPickupRequest, getInstitutionPickups } from '../../api'
import { PickupForm } from '../../components/PickupForm'
import { RecyclerRow } from '../../components/rows'
import { DataState, Notice, PageHeader, Panel } from '../../components/ui'
import { formatDateTime, formatKg, humanize, statusTone } from '../../lib/format'
import { useApiAction, useApiData } from '../../lib/useApiData'

/** `GET /api/institution/pickups` */
export function PickupRequests({ token, account }) {
  const [pickupOpen, setPickupOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const { data, error, loading, reload } = useApiData(() => getInstitutionPickups(token), [token])

  const create = useApiAction(
    (payload) => createPickupRequest(payload, token),
    {
      onSuccess: () => {
        setPickupOpen(false)
        setNotice('Pickup request queued. It will appear here once the worker has processed it.')
        reload()
      },
    },
  )

  const pickups = data || []
  const statuses = ['ALL', ...new Set(pickups.map((item) => item.status).filter(Boolean))]
  const visible = statusFilter === 'ALL' ? pickups : pickups.filter((item) => item.status === statusFilter)

  return (
    <>
      <PageHeader
        eyebrow="Institution workspace"
        title="Pickup requests"
        description="Every collection request raised by your campus, with its current status in the network."
        action="Raise a pickup"
        onAction={() => setPickupOpen(true)}
      />
      {notice && <Notice text={notice} onClose={() => setNotice('')} />}

      <Panel
        title="All requests"
        description={`${pickups.length} request${pickups.length === 1 ? '' : 's'} on record`}
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
          emptyIcon={FileText}
          emptyText="No pickup requests match this filter."
        >
          <>
            <div className="table-head">
              <span>Request</span>
              <span>Material & location</span>
              <span>Weight</span>
              <span>Raised</span>
              <span>Status</span>
              <span />
            </div>
            {visible.map((item) => (
              <RecyclerRow
                key={item.requestId}
                id={item.requestId.replace('PICKUP_', '').slice(0, 6).toUpperCase()}
                area={item.materialTypes?.join(', ') || item.paperType}
                stops={item.pickupAddress}
                load={formatKg(item.estimatedWeightKg)}
                date={formatDateTime(item.createdAt)}
                status={humanize(item.status)}
                tone={statusTone(item.status)}
              />
            ))}
          </>
        </DataState>
      </Panel>

      {pickupOpen && (
        <PickupForm
          account={account}
          pending={create.pending}
          error={create.error}
          onClose={() => setPickupOpen(false)}
          onSubmit={create.run}
        />
      )}
    </>
  )
}
