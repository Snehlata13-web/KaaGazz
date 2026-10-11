import { Recycle, Sparkles, TreeDeciduous } from 'lucide-react'
import { getInstitutionSummary } from '../../api'
import { HealthRow } from '../../components/rows'
import { DataState, EmptyState, Metric, MiniBars, PageHeader, Panel } from '../../components/ui'
import { formatKg, formatNumber, formatPercent, formatWeight, humanize } from '../../lib/format'
import { useApiData } from '../../lib/useApiData'

/** `GET /api/institution/summary` — environmental outcomes of completed pickups. */
export function ImpactLedger({ token }) {
  const { data, error, loading, reload } = useApiData(() => getInstitutionSummary(token), [token])

  return (
    <>
      <PageHeader
        eyebrow="Institution workspace"
        title="Impact ledger"
        description="What your campus collection adds up to, calculated from recorded pickup weights."
      />
      <DataState loading={loading} error={error} onRetry={reload} skeleton="metrics">
        {data && (
          <>
            <div className="metric-grid">
              <Metric icon={Recycle} label="Paper diverted" value={formatKg(data.impact.divertedKg)} note="Completed pickups" tone="green" />
              <Metric icon={TreeDeciduous} label="Tree equivalents" value={formatNumber(data.impact.treeEquivalents)} note="11.8 kg per tree" tone="amber" />
              <Metric icon={Sparkles} label="CO₂ avoided" value={formatWeight(data.impact.co2AvoidedKg)} note="0.92 kg per kg paper" tone="blue" />
              <Metric icon={Recycle} label="Total requested" value={formatKg(data.metrics.totalWeightKg)} note="Including open requests" tone="coral" />
            </div>

            <div className="content-grid two-col">
              <Panel title="Monthly collection" description="Requested weight over the last 8 months">
                <MiniBars series={data.monthly} />
              </Panel>
              <Panel title="Request breakdown" description="Every request by current status">
                {Object.entries(data.statusCounts).length === 0
                  ? <EmptyState icon={Recycle}>No requests recorded yet.</EmptyState>
                  : Object.entries(data.statusCounts).map(([status, count]) => (
                    <HealthRow key={status} icon={Recycle} label={humanize(status)} value={count} note={`${formatPercent((count / Math.max(1, Object.values(data.statusCounts).reduce((a, b) => a + b, 0))) * 100)} of all requests`} />
                  ))}
              </Panel>
            </div>
          </>
        )}
      </DataState>
    </>
  )
}
