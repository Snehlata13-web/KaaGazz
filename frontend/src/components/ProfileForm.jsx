import { useState } from 'react'
import { Save, X } from 'lucide-react'
import { PROFILE_FIELDS_BY_ROLE } from '../lib/profileFields'

/** Edits the signed-in account via `PATCH /api/auth/me`. */
export function ProfileForm({ role, account, pending, error, onClose, onSubmit }) {
  const fields = PROFILE_FIELDS_BY_ROLE[role] || []
  const [form, setForm] = useState(() =>
    fields.reduce((values, field) => ({ ...values, [field.name]: account?.[field.name] ?? '' }), {}),
  )

  const update = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }))

  // Only changed fields are sent, so an untouched value is never rewritten.
  const changed = fields.filter((field) => String(form[field.name] ?? '') !== String(account?.[field.name] ?? ''))

  const submit = (event) => {
    event.preventDefault()
    onSubmit(changed.reduce((updates, field) => ({ ...updates, [field.name]: form[field.name] }), {}))
  }

  return (
    <div className="modal-layer">
      <form className="pickup-modal" onSubmit={submit}>
        <div className="modal-heading">
          <div>
            <span className="eyebrow">Your account</span>
            <h2>Edit profile</h2>
          </div>
          <button type="button" className="close-modal" onClick={onClose}><X size={18} /></button>
        </div>
        <p>
          Update the details your partners and the automated scheduler use.
          Your sign-in email cannot be changed here.
        </p>
        <div className="profile-form-grid">
          {fields.map((field) => (
            <label key={field.name} className={field.full ? 'full-field' : ''}>
              {field.label}
              {field.type === 'select' ? (
                <select required value={form[field.name] || ''} onChange={update(field.name)}>
                  <option value="">Select type</option>
                  {field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              ) : (
                <input
                  required
                  type={field.type || 'text'}
                  min={field.min}
                  step={field.step}
                  value={form[field.name] ?? ''}
                  onChange={update(field.name)}
                />
              )}
            </label>
          ))}
        </div>
        {error && <div className="form-error">{error}</div>}
        <div className="modal-actions">
          <button type="button" className="outline-action" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary-action" disabled={pending || changed.length === 0}>
            <Save size={15} />
            {pending ? 'Saving…' : changed.length ? `Save ${changed.length} change${changed.length === 1 ? '' : 's'}` : 'No changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
