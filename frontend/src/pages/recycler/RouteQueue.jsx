import { useState } from 'react'
import { MapPin, Route, Sparkles } from 'lucide-react'
import { completeSorting, getRecyclerQueue, updateDispatchStatus } from '../../api'
import { SortingForm } from '../../components/SortingForm'
import { DataState, Notice, PageHeader, Panel, Status } from '../../components/ui'
import { DISPATCH_STATUS_FLOW } from '../../lib/constants'
import { formatDateTime, formatKg, humanize, statusTone } from '../../lib/format'
import { useApiAction, useApiData } from '../../lib/useApiData'

/**
 * `GET /api/recycler/queue`
 * Routes can be advanced through the dispatch lifecycle with
 * `PATCH /api/recycler/dispatches/:id/status`, and sorted output reported with
 * `POST /api/operations/dispatches/:id/sorted`.
 */
export function RouteQueue({ token }) {
  const [notice, setNotice] = useState('')
  const [sortingFor, setSortingFor] = useState(null)
  const { data, error, loading, reload } = useApiData(() => getRecyclerQueue(token), [token])

  const advance = useApiAction(
    (dispatchId, status) => updateDispatchStatus(token, dispatchId, status),
    {
      onSuccess: (result) => {
        setNotice(`Route ${result.dispatchId} is now ${humanize(result.status).toLowerCase()}.`)
        reload()
      },
    },
  )

  const sort = useApiAction(
    (payload) => completeSorting(token, sortingFor.dispatchId, payload),
    {
      onSuccess: () => {
        setSortingFor(null)
        setNotice('Sorted output submitted. Matching NGO demands will be allocated automatically.')
        reload()
      },
    },
  )

  const routes = data?.routes || []

  return (
    <>
      <PageHeader
        eyebrow="Recycler partner workspace"
        title="Route queue"
        description="Dispatch batches assigned to you by the automated scheduler, with the actions you can take on each."
      />
      {notice && <Notice text={notice} onClose={() => setNotice('')} />}
      {advance.error && <div className="form-error">{advance.error}</div>}

      {data && (
        <div className="automation-banner">
          <div className="automation-icon"><MapPin size={20} /></div>
          <div>
            <strong>{data.building.city} · building toward the next route</strong>
            <span>
              {data.building.pickupCount} open pickup{data.building.pickupCount === 1 ? '' : 's'} · {formatKg(data.building.pendingWeightKg)} queued ·
              {' '}{formatKg(data.building.remainingToThresholdKg)} to the {data.threshold} kg threshold
            </span>
          </div>
          <Status tone={data.building.remainingToThresholdKg === 0 ? 'green' : 'amber'}>
            {data.building.remainingToThresholdKg === 0 ? 'Threshold reached' : 'Building route'}
          </Status>
        </div>
      )}

      <Panel
        title="Assigned routes"
        description={`${routes.length} active route${routes.length === 1 ? '' : 's'}`}
        className="route-panel"
      >
        <DataState
          loading={loading}
          error={error}
          onRetry={reload}
          isEmpty={routes.length === 0}
          emptyIcon={Route}
          emptyText="No routes assigned yet. The scheduler creates one once your city crosses the threshold."
        >
          <div className="route-card-list">
            {routes.map((item) => {
              // An ASSIGNED route has not entered the flow yet, so findIndex
              // returns -1 and the first step is offered.
              const nextStep = DISPATCH_STATUS_FLOW[DISPATCH_STATUS_FLOW.findIndex((step) => step.value === item.status) + 1]
              return (
                <article className="route-card" key={item.dispatchId}>
                  <header>
                    <div>
                      <span className="request-label">{item.dispatchId}</span>
                      <strong>{item.city}</strong>
                      <small>{item.pickupIds?.length || 0} institutions · {formatKg(item.totalWeightKg)}</small>
                    </div>
                    <Status tone={statusTone(item.status)}>{humanize(item.status)}</Status>
                  </header>
                  <dl className="route-card-meta">
                    <div><dt>Scheduled</dt><dd>{item.scheduledPickupDate || '—'}</dd></div>
                    <div><dt>Created</dt><dd>{formatDateTime(item.createdAt)}</dd></div>
                    <div><dt>Load</dt><dd>{formatKg(item.totalWeightKg)}</dd></div>
                  </dl>
                  <footer>
                    {nextStep && (
                      <button
                        type="button"
                        className="primary-action"
                        disabled={advance.pending}
                        onClick={() => advance.run(item.dispatchId, nextStep.value)}
                      >
                        {nextStep.label}
                      </button>
                    )}
                    {['COLLECTED', 'SORTED'].includes(item.status) && (
                      <button type="button" className="outline-action" onClick={() => setSortingFor(item)}>
                        <Sparkles size={14} />Report sorted output
                      </button>
                    )}
                  </footer>
                </article>
              )
            })}
          </div>
        </DataState>
      </Panel>

      {sortingFor && (
        <SortingForm
          dispatch={sortingFor}
          pending={sort.pending}
          error={sort.error}
          onClose={() => setSortingFor(null)}
          onSubmit={sort.run}
        />
      )}
    </>
  )
}
