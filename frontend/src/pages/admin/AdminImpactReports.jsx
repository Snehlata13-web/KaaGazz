import { PackageCheck, Recycle, Sparkles, TreeDeciduous } from 'lucide-react'
import { getAdminImpact } from '../../api'
import { HealthRow } from '../../components/rows'
import { DataState, EmptyState, Metric, MiniBars, PageHeader, Panel } from '../../components/ui'
import { formatKg, formatNumber, formatPercent, formatWeight, humanize } from '../../lib/format'
import { useApiData } from '../../lib/useApiData'

/** `GET /api/admin/impact` */
export function AdminImpactReports({ token }) {
  const { data, error, loading, reload } = useApiData(() => getAdminImpact(token), [token])

  return (
    <>
      <PageHeader
        eyebrow="Reporting"
        title="Impact reports"
        description="Network-wide environmental outcomes calculated from every recorded pickup and allocation."
      />
      <DataState loading={loading} error={error} onRetry={reload} skeleton="metrics">
        {data && (
          <>
            <div className="metric-grid">
              <Metric icon={Recycle} label="Paper diverted" value={formatWeight(data.impact.divertedKg)} note="All recorded pickups" tone="green" />
              <Metric icon={TreeDeciduous} label="Tree equivalents" value={formatNumber(data.impact.treeEquivalents)} note="11.8 kg per tree" tone="amber" />
              <Metric icon={Sparkles} label="CO₂ avoided" value={formatWeight(data.impact.co2AvoidedKg)} note="0.92 kg per kg paper" tone="blue" />
              <Metric icon={PackageCheck} label="This month" value={formatKg(data.impact.monthDivertedKg)} note="Diverted in the current month" tone="coral" />
            </div>

            <div className="content-grid two-col">
              <Panel title="Collection trend" description="Paper collected over the last 8 months">
                <MiniBars series={data.monthly} />
              </Panel>
              <Panel title="Allocation trend" description="Bundles allocated to NGOs over the last 8 months">
                <MiniBars series={data.allocationMonthly} />
              </Panel>

              <Panel title="Network impact" description="Environmental outcomes and upcycling share" className="wide-panel">
                <div className="admin-impact">
                  <div><strong>{formatKg(data.impact.divertedKg)}</strong><span>paper diverted</span></div>
                  <div><strong>{formatNumber(data.impact.treeEquivalents)}</strong><span>tree equivalents</span></div>
                  <div><strong>{formatWeight(data.impact.co2AvoidedKg)}</strong><span>CO₂ avoided</span></div>
                  <div className="admin-progress">
                    <span>Upcycling share <b>{formatPercent(data.impact.upcyclingSharePercent)}</b></span>
                    <div className="progress-track"><i style={{ width: `${Math.min(100, data.impact.upcyclingSharePercent)}%` }} /></div>
                  </div>
                </div>
              </Panel>

              <Panel title="Pickup status breakdown" description="Every pickup request in the network" className="wide-panel">
                {Object.entries(data.statusCounts).length === 0
                  ? <EmptyState icon={Recycle}>No pickup requests recorded yet.</EmptyState>
                  : Object.entries(data.statusCounts).map(([status, count]) => (
                    <HealthRow key={status} icon={Recycle} label={humanize(status)} value={count} note={`${count} request${count === 1 ? '' : 's'}`} />
                  ))}
              </Panel>
            </div>
          </>
        )}
      </DataState>
    </>
  )
}
