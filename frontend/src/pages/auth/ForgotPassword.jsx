import { useState } from 'react'
import { ArrowRight, Check, Leaf, ShieldCheck } from 'lucide-react'
import { requestPasswordReset, resetPassword } from '../../api'

export function ForgotPassword({ onBack }) {
  const [email, setEmail] = useState('')
  const [token, setToken] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const request = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await requestPasswordReset(email)
      setToken(result.resetToken || '')
      setMessage(result.message)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  const reset = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const result = await resetPassword(token, password)
      setMessage(result.message)
      setTimeout(onBack, 900)
    } catch (resetError) {
      setError(resetError.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-story">
        <div className="login-brand"><span className="brand-symbol"><Leaf size={21} /></span><strong>KaaGazz</strong></div>
        <div className="story-content">
          <span className="eyebrow eyebrow-light"><i />Account recovery</span>
          <h1>Back to the<br /><em>good work.</em></h1>
          <p>We’ll help you get back into your circular paper workspace securely.</p>
        </div>
        <div className="story-footer">
          <span><ShieldCheck size={14} />Secure account recovery</span>
          <span>© 2025 KaaGazz</span>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-panel-inner">
          <button className="back-link login-back" onClick={onBack}>
            <ArrowRight size={15} className="back-arrow" />Back to sign in
          </button>
          <div className="login-heading recovery-heading">
            <span className="eyebrow">Forgot password</span>
            <h2>Reset your<br />workspace password.</h2>
            <p>Enter your account email to receive reset instructions.</p>
          </div>
          <form className="login-form" onSubmit={request}>
            <label>Email address
              <input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@organisation.org" />
            </label>
            {message && <div className="form-success"><Check size={14} />{message}</div>}
            {error && <div className="form-error">{error}</div>}
            <button className="login-button" disabled={loading} type="submit">
              {loading ? 'Sending...' : 'Send reset instructions'} <ArrowRight size={17} />
            </button>
          </form>
          {token && (
            <form className="reset-form" onSubmit={reset}>
              <span className="reset-label">Development reset token</span>
              <input required value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste reset token" />
              <input required minLength="8" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password, at least 8 characters" />
              <button className="outline-action" disabled={loading} type="submit">Update password</button>
            </form>
          )}
          <p className="login-help">Remembered your password? <button type="button" onClick={onBack}>Sign in</button></p>
        </div>
      </section>
    </main>
  )
}
