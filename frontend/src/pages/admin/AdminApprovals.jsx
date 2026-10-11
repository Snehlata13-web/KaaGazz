import { useState } from 'react'
import { ShieldCheck, Users } from 'lucide-react'
import { getAdminApprovals, updateAdminApproval } from '../../api'
import { DataState, DetailGrid, Notice, PageHeader, Panel, Status } from '../../components/ui'
import { accountName, formatDate, humanize } from '../../lib/format'
import { useApiAction, useApiData } from '../../lib/useApiData'

const partnerId = (item) => item.institutionId || item.ngoId || item.recyclerId

/** `GET /api/admin/approvals` + `POST /api/admin/approvals/:role/:id/:action` */
export function AdminApprovals({ token }) {
  const [notice, setNotice] = useState('')
  const { data, error, loading, reload } = useApiData(() => getAdminApprovals(token), [token])

  const decide = useApiAction(
    (item, action) => updateAdminApproval(token, item.role, partnerId(item), action),
    {
      onSuccess: (result) => {
        setNotice(`${accountName(result, 'Registration')} ${String(result.approvalStatus).toLowerCase()}.`)
        reload()
      },
    },
  )

  const approvals = data || []

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Registration approvals"
        description="Review partner details and approve access to the KaaGazz network."
      />
      {notice && <Notice text={notice} onClose={() => setNotice('')} />}
      {decide.error && <div className="form-error">{decide.error}</div>}

      <Panel
        title="Pending registrations"
        description={`${approvals.length} registration${approvals.length === 1 ? '' : 's'} waiting for a decision`}
        className="section-panel"
      >
        <DataState
          loading={loading}
          error={error}
          onRetry={reload}
          isEmpty={approvals.length === 0}
          emptyIcon={ShieldCheck}
          emptyText="No registrations waiting for approval."
        >
          <div className="approval-list">
            {approvals.map((item) => (
              <div className="approval-row" key={item.PK}>
                <div className="approval-icon"><Users size={16} /></div>
                <div className="approval-body">
                  <div className="approval-head">
                    <strong>{accountName(item)}</strong>
                    <Status tone="amber">Pending approval</Status>
                  </div>
                  <DetailGrid
                    fields={[
                      ['Partner type', item.role],
                      ['Email', item.email],
                      ['Contact person', item.contactPerson],
                      ['Phone', item.phone],
                      ['City', item.city],
                      ['Institution type', item.category && humanize(item.category)],
                      ['Registration number', item.registrationNumber],
                      ['Daily capacity', item.capacityTonsPerDay && `${item.capacityTonsPerDay} tons`],
                      ['Submitted', formatDate(item.createdAt)],
                      ['Address', item.address],
                    ]}
                  />
                </div>
                <div className="approval-actions">
                  <button className="approve-button" disabled={decide.pending} onClick={() => decide.run(item, 'approve')}>Approve</button>
                  <button className="reject-button" disabled={decide.pending} onClick={() => decide.run(item, 'reject')}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        </DataState>
      </Panel>
    </>
  )
}
