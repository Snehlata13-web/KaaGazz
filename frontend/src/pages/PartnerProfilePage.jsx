import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { updateProfile } from '../api'
import { canEditProfile } from '../lib/profileFields'
import { ProfileForm } from '../components/ProfileForm'
import { DataState, DetailGrid, Notice, PageHeader, Panel } from '../components/ui'
import { accountName, formatDate, humanize } from '../lib/format'
import { useApiAction } from '../lib/useApiData'

const ROLE_LABEL = {
  institution: 'Institution profile',
  ngo: 'NGO profile',
  recycler: 'Recycler profile',
  admin: 'Administrator profile',
}

/**
 * Shared profile section for every role.
 * Values come from `GET /api/auth/me`; edits are saved with `PATCH /api/auth/me`
 * and the shell's account data is reloaded so the sidebar updates too.
 */
export function PartnerProfilePage({ role, meta, token, account, accountLoading, accountError, onReloadAccount }) {
  const [editing, setEditing] = useState(false)
  const [notice, setNotice] = useState('')
  const displayName = accountName(account, meta.name)
  const editable = canEditProfile(role)

  const save = useApiAction(
    (updates) => updateProfile(token, updates),
    {
      onSuccess: () => {
        setEditing(false)
        setNotice('Profile updated.')
        onReloadAccount()
      },
    },
  )

  const fields = [
    ['Partner type', account.role || role.toUpperCase()],
    ['Email', account.email],
    ['Contact person', account.contactPerson],
    ['Phone', account.phone],
    ['City', account.city],
    ['Address', account.address],
    ['Institution type', account.category && humanize(account.category)],
    ['Department', account.department && humanize(account.department)],
    ['Registration number', account.registrationNumber],
    ['Daily capacity', account.capacityTonsPerDay && `${account.capacityTonsPerDay} tons`],
    ['Approval status', account.approvalStatus && humanize(account.approvalStatus)],
    ['Member since', account.createdAt && formatDate(account.createdAt)],
    ['Last updated', account.profileUpdatedAt && formatDate(account.profileUpdatedAt)],
  ]

  return (
    <>
      <PageHeader
        eyebrow="Your workspace"
        title={displayName}
        description="View and update the details connected to your KaaGazz partner account."
        action={editable ? 'Edit profile' : undefined}
        actionIcon={Pencil}
        onAction={() => setEditing(true)}
      />
      {notice && <Notice text={notice} onClose={() => setNotice('')} />}

      <Panel
        title={ROLE_LABEL[role]}
        description="Account and organisation details"
        className="section-panel"
      >
        <DataState loading={accountLoading && !account.email} error={accountError} onRetry={onReloadAccount}>
          <>
            <div className="profile-summary">
              <span className="avatar avatar-lg">{meta.initials}</span>
              <div><strong>{displayName}</strong><small>{account.role || role.toUpperCase()}</small></div>
            </div>
            <DetailGrid fields={fields} />
          </>
        </DataState>
      </Panel>

      {editing && (
        <ProfileForm
          role={role}
          account={account}
          pending={save.pending}
          error={save.error}
          onClose={() => setEditing(false)}
          onSubmit={save.run}
        />
      )}
    </>
  )
}
