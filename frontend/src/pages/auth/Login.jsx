import { useState } from 'react'
import { ArrowRight, Check, ChevronDown, Eye, EyeOff, Leaf, ShieldCheck } from 'lucide-react'
import { login as loginRequest } from '../../api'
import { roleOptions } from '../../lib/constants'
import { ROLE_BY_API_ROLE } from '../../lib/session'
import { ForgotPassword } from './ForgotPassword'

export function Login({ onLogin, onRegister }) {
  const [role, setRole] = useState('institution')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotMode, setForgotMode] = useState(false)
  const selected = roleOptions.find((item) => item.id === role)
  const Icon = selected.icon

  if (forgotMode) return <ForgotPassword onBack={() => setForgotMode(false)} />

  const submit = async (event) => {
    event.preventDefault()
    if (!email || !password) return setError('Enter your email and password to continue.')
    setError('')
    setLoading(true)
    try {
      const result = await loginRequest(email, password)
      onLogin({
        role: ROLE_BY_API_ROLE[result.user.role] || role,
        token: result.token,
        user: result.user,
      })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-brand"><span className="brand-symbol"><Leaf size={21} /></span><strong>KaaGazz</strong></div>
        <div className="story-content">
          <span className="eyebrow eyebrow-light"><i />Circular paper network</span>
          <h1>Paper deserves<br /><em>another chapter.</em></h1>
          <p>One calm workspace for the institutions, NGOs, and recyclers keeping paper in motion.</p>
          <div className="story-impact">
            <div><strong>12,480</strong><span>kg diverted from landfill</span></div>
            <div><strong>1,060</strong><span>tree equivalents saved</span></div>
          </div>
        </div>
        <div className="story-footer">
          <span><ShieldCheck size={14} />Trusted partner network</span>
          <span>© 2025 KaaGazz</span>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-panel-inner">
          <div className="mobile-login-brand"><span className="brand-symbol"><Leaf size={18} /></span><strong>KaaGazz</strong></div>
          <div className="login-heading">
            <span className="eyebrow">Welcome back</span>
            <h2>Good work starts<br />with a good loop.</h2>
            <p>Sign in to your KaaGazz workspace.</p>
          </div>
          <form className="login-form" onSubmit={submit}>
            <label>Email address
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@organisation.org" />
            </label>
            <label>Password
              <div className="password-field">
                <input required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter your password" />
                <button type="button" className="eye-toggle" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </label>
            <div className="form-row">
              <label className="check-label"><input type="checkbox" /> Keep me signed in</label>
              <button type="button" className="forgot-button" onClick={() => setForgotMode(true)}>Forgot password?</button>
            </div>
            {error && <div className="form-error">{error}</div>}
            <button className="login-button" disabled={loading} type="submit">
              {loading ? 'Signing in...' : 'Sign in to workspace'} {!loading && <ArrowRight size={17} />}
            </button>
          </form>
          <div className="role-picker">
            <span className="role-picker-label">Workspace type</span>
            <button type="button" className="selected-role">
              <Icon size={16} />
              <span><strong>{selected.label}</strong><small>{selected.detail}</small></span>
              <ChevronDown size={16} />
            </button>
            <div className="role-options">
              {roleOptions.map((item) => {
                const RoleIcon = item.icon
                return (
                  <button type="button" key={item.id} className={role === item.id ? 'role-option-selected' : ''} onClick={() => setRole(item.id)}>
                    <RoleIcon size={16} />
                    <span><strong>{item.label}</strong><small>{item.detail}</small></span>
                    {role === item.id && <Check size={15} />}
                  </button>
                )
              })}
            </div>
          </div>
          <p className="login-help">New to KaaGazz? <button type="button" onClick={onRegister}>Request partner access</button></p>
        </div>
      </section>
    </main>
  )
}
