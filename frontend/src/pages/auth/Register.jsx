import { useState } from 'react'
import { ArrowRight, Leaf, Sparkles } from 'lucide-react'
import { registerAccount } from '../../api'
import { roleOptions } from '../../lib/constants'

export function Register({ onBack, onRegistered }) {
  const [role, setRole] = useState('institution')
  const [form, setForm] = useState({})
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const selected = roleOptions.find((item) => item.id === role)
  const update = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }))

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await registerAccount(role, form)
      onRegistered()
    } catch (registerError) {
      setError(registerError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="register-page">
      <section className="register-aside">
        <button className="back-link" onClick={onBack}>
          <ArrowRight size={15} className="back-arrow" />Back to sign in
        </button>
        <div>
          <span className="brand-symbol"><Leaf size={20} /></span>
          <h1>Join the loop.</h1>
          <p>Connect your work to a network that gives paper a longer life.</p>
        </div>
        <div className="register-quote">
          <Sparkles size={17} />
          <span>Every stakeholder makes the circular economy stronger.</span>
        </div>
      </section>
      <section className="register-panel">
        <div className="register-card">
          <div className="register-heading">
            <span className="eyebrow">Partner onboarding</span>
            <h2>Create your workspace</h2>
            <p>Tell us who you are and we’ll set up the right tools for your team.</p>
          </div>
          <div className="register-role-grid">
            {roleOptions.slice(0, 3).map((item) => {
              const RoleIcon = item.icon
              return (
                <button type="button" className={role === item.id ? 'register-role-active' : ''} key={item.id} onClick={() => setRole(item.id)}>
                  <RoleIcon size={17} />
                  <strong>{item.label}</strong>
                  <small>{item.detail}</small>
                </button>
              )
            })}
          </div>
          <form className="register-form" onSubmit={submit}>
            <div className="register-fields">
              {role === 'recycler' ? (
                <label>Company name
                  <input required value={form.companyName || ''} onChange={update('companyName')} placeholder="EcoMill Logistics" />
                </label>
              ) : (
                <label>{role === 'ngo' ? 'Organisation name' : 'Institution name'}
                  <input required value={form.name || ''} onChange={update('name')} placeholder={role === 'ngo' ? 'Bright Futures Foundation' : 'Greenfield College'} />
                </label>
              )}
              {role === 'institution' && (
                <label>Institution type
                  <select required value={form.category || ''} onChange={update('category')}>
                    <option value="">Select type</option>
                    <option value="SCHOOL">School</option>
                    <option value="COLLEGE">College / university</option>
                  </select>
                </label>
              )}
              {role === 'ngo' && (
                <label>Registration number
                  <input required value={form.registrationNumber || ''} onChange={update('registrationNumber')} placeholder="NGO registration ID" />
                </label>
              )}
              {role === 'recycler' && (
                <label>Daily capacity (tons)
                  <input required min="0.1" step="0.1" type="number" value={form.capacityTonsPerDay || ''} onChange={update('capacityTonsPerDay')} placeholder="e.g. 20" />
                </label>
              )}
              <label>Contact person
                <input required value={form.contactPerson || ''} onChange={update('contactPerson')} placeholder="Full name" />
              </label>
              <label>Phone
                <input required value={form.phone || ''} onChange={update('phone')} placeholder="+61 400 000 000" />
              </label>
              <label>Work email
                <input required type="email" value={form.email || ''} onChange={update('email')} placeholder="you@organisation.org" />
              </label>
              <label>City
                <input required value={form.city || ''} onChange={update('city')} placeholder="Sydney" />
              </label>
              <label className="full-field">Address
                <input required value={form.address || ''} onChange={update('address')} placeholder="Street, suburb, postcode" />
              </label>
              <label>Password
                <input required minLength="8" type="password" value={form.password || ''} onChange={update('password')} placeholder="At least 8 characters" />
              </label>
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="login-button" disabled={loading} type="submit">
              {loading ? 'Creating workspace...' : `Create ${selected.label} workspace`} {!loading && <ArrowRight size={17} />}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
