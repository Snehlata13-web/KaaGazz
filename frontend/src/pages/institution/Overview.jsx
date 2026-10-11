import { useState } from 'react'
import { Clock3, FileText, MapPin, Recycle, ShieldCheck } from 'lucide-react'
import { createPickupRequest, getInstitutionSummary } from '../../api'
import { PickupForm } from '../../components/PickupForm'
import { JourneyStep, RequestRow } from '../../components/rows'
import { DataState, EmptyState, Metric, MiniBars, NetworkStrip, Notice, PageHeader, Panel } from '../../components/ui'
import { formatKg, formatNumber, formatPercent, formatWeight, humanize, padCount, statusTone } from '../../lib/format'
import { useApiAction, useApiData } from '../../lib/useApiData'

const JOURNEY = ['REQUESTED', 'ASSIGNED', 'SCHEDULED', 'COMPLETED']
const JOURNEY_LABEL = { REQUESTED: 'Requested', ASSIGNED: 'Aggregated', SCHEDULED: 'Scheduled', COMPLETED: 'Picked up' }

/** `GET /api/institution/summary` */
export function InstitutionOverview({ meta, token, account, onNavigate }) {
  const [pickupOpen, setPickupOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const { data, error, loading, reload } = useApiData(() => getInstitutionSummary(token), [token])

  const create = useApiAction(
    (payload) => createPickupRequest(payload, token),
    {
      onSuccess: () => {
        setPickupOpen(false)
        setNotice('Pickup request queued. KaaGazz will schedule it automatically when your area reaches the threshold.')
        reload()
      },
    },
  )

  const latest = data?.latest
  const latestStep = JOURNEY.indexOf(String(latest?.status || '').toUpperCase())

  return (
    <>
      <PageHeader
        eyebrow="Institution workspace"
        title={`Good morning, ${meta.name.split(' ')[0]}.`}
        description="Keep your campus collection moving and see the impact of every pickup."
        action="Raise a pickup"
        onAction={() => setPickupOpen(true)}
      />
      {notice && <Notice text={notice} onClose={() => setNotice('')} />}

      <DataState loading={loading} error={error} onRetry={reload} skeleton="metrics">
        {data && (
          <>
            <NetworkStrip
              label="Campus impact"
              diverted={formatNumber(data.impact.divertedKg)}
              trees={formatNumber(data.impact.treeEquivalents)}
              co2={formatWeight(data.impact.co2AvoidedKg)}
              trend={formatPercent(data.metrics.completionRate)}
            />
            <div className="metric-grid">
              <Metric icon={FileText} label="Active requests" value={padCount(data.metrics.activeRequests)} note="Awaiting collection" tone="green" />
              <Metric icon={Clock3} label="In progress" value={padCount(data.metrics.inProgress)} note="Scheduled or assigned" tone="amber" />
              <Metric icon={Recycle} label="Paper diverted" value={formatKg(data.metrics.divertedKg)} note="Completed pickups" tone="blue" />
              <Metric icon={ShieldCheck} label="Completion rate" value={formatPercent(data.metrics.completionRate)} note="All requests" tone="coral" />
            </div>

            <div className="content-grid two-col">
              <Panel title="Pickup journey" description="Your latest collection request" action="View all" onAction={() => onNavigate('Pickup requests')}>
                {latest ? (
                  <div className="journey-card">
                    <div className="journey-top">
                      <div>
                        <span className="request-label">Request {latest.requestId}</span>
                        <strong>{latest.materialTypes?.join(', ') || latest.paperType}</strong>
                        <small>{formatKg(latest.estimatedWeightKg)} · {latest.city} · {humanize(latest.status)}</small>
                      </div>
                    </div>
                    <div className="journey-steps">
                      {JOURNEY.map((step, index) => (
                        <JourneyStep
                          key={step}
                          label={JOURNEY_LABEL[step]}
                          done={latestStep > index}
                          active={latestStep === index}
                        />
                      ))}
                    </div>
                    <div className="journey-meta">
                      <span><MapPin size={14} />{latest.pickupAddress}</span>
                      <span><Clock3 size={14} />{latest.scheduledPickupDate ? `Scheduled ${latest.scheduledPickupDate}` : 'Auto-scheduling in progress'}</span>
                    </div>
                  </div>
                ) : (
                  <EmptyState icon={FileText} hint="Use “Raise a pickup” to add your first collection request.">No pickup requests yet.</EmptyState>
                )}
              </Panel>

              <Panel title="Campus impact" description="Paper collected over the last 8 months" action="View ledger" onAction={() => onNavigate('Impact ledger')}>
                <div className="impact-total">
                  <div><strong>{formatKg(data.metrics.totalWeightKg)}</strong><small>paper requested</small></div>
                </div>
                <MiniBars series={data.monthly} />
              </Panel>

              <Panel title="Recent requests" description="Latest activity from your campus" action="See all" onAction={() => onNavigate('Pickup requests')} className="wide-panel">
                {data.recent.length === 0
                  ? <EmptyState icon={FileText}>No requests recorded yet.</EmptyState>
                  : data.recent.map((item) => (
                    <RequestRow
                      key={item.requestId}
                      title={item.materialTypes?.join(', ') || item.paperType}
                      meta={`${formatKg(item.estimatedWeightKg)} · ${item.city}`}
                      status={humanize(item.status)}
                      tone={statusTone(item.status)}
                    />
                  ))}
              </Panel>
            </div>
          </>
        )}
      </DataState>

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
