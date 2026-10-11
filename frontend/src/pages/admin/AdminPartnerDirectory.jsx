import { useState } from 'react'
import { Users } from 'lucide-react'
import { getAdminPartners } from '../../api'
import { DataState, DetailGrid, PageHeader, Panel, Status } from '../../components/ui'
import { accountName, humanize } from '../../lib/format'
import { useApiData } from '../../lib/useApiData'

const ROLE_FILTERS = ['ALL', 'INSTITUTION', 'NGO', 'RECYCLER']

/** `GET /api/admin/partners` */
export function AdminPartnerDirectory({ token }) {
  const [roleFilter, setRoleFilter] = useState('ALL')
  const { data, error, loading, reload } = useApiData(() => getAdminPartners(token), [token])

  const partners = data || []
  const visible = roleFilter === 'ALL' ? partners : partners.filter((item) => item.role === roleFilter)

  return (
    <>
      <PageHeader
        eyebrow="Network directory"
        title="Partner directory"
        description="All approved schools, colleges, NGOs, and recyclers in the KaaGazz network."
      />
      <Panel
        title="Approved partners"
        description={`${partners.length} active partner${partners.length === 1 ? '' : 's'} across the network`}
        className="section-panel"
      >
        <div className="filter-row">
          {ROLE_FILTERS.map((role) => (
            <button
              key={role}
              type="button"
              className={roleFilter === role ? 'filter-chip chip-active' : 'filter-chip'}
              onClick={() => setRoleFilter(role)}
            >
              {role === 'ALL' ? 'All' : humanize(role)}
            </button>
          ))}
        </div>
        <DataState
          loading={loading}
          error={error}
          onRetry={reload}
          isEmpty={visible.length === 0}
          emptyIcon={Users}
          emptyText="No approved partners match this filter."
        >
          <div className="approval-list">
            {visible.map((item) => (
              <div className="approval-row" key={item.PK}>
                <div className="approval-icon"><Users size={16} /></div>
                <div className="approval-body">
                  <div className="approval-head">
                    <strong>{accountName(item)}</strong>
                    <Status tone="green">{item.role}</Status>
                  </div>
                  <DetailGrid
                    fields={[
                      ['Email', item.email],
                      ['Contact', item.contactPerson],
                      ['Phone', item.phone],
                      ['Location', item.city],
                      ['Institution type', item.category && humanize(item.category)],
                      ['Registration no.', item.registrationNumber],
                      ['Daily capacity', item.capacityTonsPerDay && `${item.capacityTonsPerDay} tons`],
                      ['Address', item.address],
                    ]}
                  />
                </div>
              </div>
            ))}
          </div>
        </DataState>
      </Panel>
    </>
  )
}
