import { useEffect, useState } from 'react'
import { DashboardLayout } from './components/DashboardLayout'
import { Notice } from './components/ui'
import { Login } from './pages/auth/Login'
import { Register } from './pages/auth/Register'
import { clearSession, readSession, writeSession } from './lib/session'
import './App.css'

export default function App() {
  const [session, setSession] = useState(readSession)
  const [registering, setRegistering] = useState(false)
  const [registrationNotice, setRegistrationNotice] = useState('')

  // `api.js` fires this event whenever any request comes back 401, so an expired
  // token drops straight back to the login screen instead of empty panels.
  useEffect(() => {
    const expireSession = () => setSession(null)
    window.addEventListener('kaagaz-auth-expired', expireSession)
    return () => window.removeEventListener('kaagaz-auth-expired', expireSession)
  }, [])

  const handleLogin = (nextSession) => {
    writeSession(nextSession)
    setSession(nextSession)
  }

  const handleLogout = () => {
    clearSession()
    setSession(null)
  }

  if (!session && registering) {
    return (
      <Register
        onBack={() => setRegistering(false)}
        onRegistered={() => {
          setRegistrationNotice('Approval request submitted. Your account is pending admin approval.')
          setRegistering(false)
        }}
      />
    )
  }

  if (!session) {
    return (
      <>
        <Login onLogin={handleLogin} onRegister={() => setRegistering(true)} />
        <div className="floating-notice">
          {registrationNotice && <Notice text={registrationNotice} onClose={() => setRegistrationNotice('')} />}
        </div>
      </>
    )
  }

  return (
    <DashboardLayout
      role={session.role}
      user={session.user}
      token={session.token}
      onLogout={handleLogout}
    />
  )
}
