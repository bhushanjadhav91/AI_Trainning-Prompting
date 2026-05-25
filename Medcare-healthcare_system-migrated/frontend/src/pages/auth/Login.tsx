import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { authApi } from '../../api'

export default function Login() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showEmergency, setShowEmergency] = useState(false)
  const [emg, setEmg] = useState({ name: '', mobile: '', age: 0, gender: 'Male', emergencyType: 'Chest Pain / Cardiac', description: '' })
  const [emgMsg, setEmgMsg] = useState('')

  async function signIn() {
    if (!username.trim() || !password) { setError('Please enter username and password.'); return }
    setLoading(true); setError('')
    try {
      const r = await authApi.login(username.trim(), password)
      setAuth(r.token, r.role, r.name, r.userId)
      navigate(r.redirectTo)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setError(err?.response?.data?.error ?? 'Invalid credentials.')
    } finally { setLoading(false) }
  }

  async function bookEmergency() {
    if (!emg.name || !emg.mobile) { alert('Name and mobile required'); return }
    try {
      const r = await authApi.emergency(emg) as { message: string; appointmentId: number }
      setEmgMsg(`✅ ${r.message} Appointment ID: ${r.appointmentId}`)
      setTimeout(() => { setShowEmergency(false); setEmgMsg('') }, 2500)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      alert('Failed: ' + (err?.response?.data?.error ?? 'Server error'))
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0A5285,#0E6BAD,#1A8FCC)', padding: 20 }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: 36, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 28, color: 'var(--primary-dark)' }}>MedCare+</h1>
          <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 4 }}>Clinic Management System</p>
        </div>
        <div className="field"><label>Username / Email</label><input value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username or email" autoComplete="username" /></div>
        <div className="field"><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && signIn()} placeholder="Enter password" autoComplete="current-password" /></div>
        <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={signIn} disabled={loading}>{loading ? 'Signing in...' : 'Sign In'}</button>
        {error && <div className={`notif ${error.includes('Contact Admin') ? 'notif-warning' : 'notif-danger'}`} style={{ marginTop: 14 }}>{error}</div>}
        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 12 }}>
          <Link to="/signup" style={{ color: 'var(--primary)', textDecoration: 'none', padding: '0 8px', fontWeight: 500 }}>Create patient account</Link>
          <span style={{ color: 'var(--border)' }}>·</span>
          <Link to="/forgot" style={{ color: 'var(--primary)', textDecoration: 'none', padding: '0 8px', fontWeight: 500 }}>Forgot password?</Link>
        </div>
        <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: 12, color: 'var(--text3)', textAlign: 'center', marginBottom: 10 }}>Emergency walk-in? No login required:</p>
          <button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowEmergency(true)}>⚡ Emergency Appointment</button>
        </div>
      </div>

      {showEmergency && (
        <div className="overlay" onClick={e => { if ((e.target as HTMLElement).classList.contains('overlay')) setShowEmergency(false) }}>
          <div className="modal">
            <div className="modal-header"><div style={{ fontWeight: 600, color: 'var(--red)' }}>⚡ Emergency Appointment</div><button className="btn btn-outline btn-sm" onClick={() => setShowEmergency(false)}>✕</button></div>
            <div className="notif notif-danger" style={{ margin: '14px 24px 0' }}>No login required. Patient is auto-prioritized in the queue.</div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field"><label>Patient Name *</label><input value={emg.name} onChange={e => setEmg({ ...emg, name: e.target.value })} /></div>
                <div className="field"><label>Mobile *</label><input value={emg.mobile} onChange={e => setEmg({ ...emg, mobile: e.target.value })} /></div>
                <div className="field"><label>Age</label><input type="number" value={emg.age} onChange={e => setEmg({ ...emg, age: +e.target.value })} /></div>
                <div className="field"><label>Gender</label><select value={emg.gender} onChange={e => setEmg({ ...emg, gender: e.target.value })}><option>Male</option><option>Female</option><option>Other</option></select></div>
                <div className="field form-full"><label>Emergency Type *</label>
                  <select value={emg.emergencyType} onChange={e => setEmg({ ...emg, emergencyType: e.target.value })}>
                    {['Chest Pain / Cardiac','Stroke / Neurological','Severe Trauma / Accident','Respiratory Distress','Severe Abdominal Pain','Allergic Reaction / Anaphylaxis','Other Emergency'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field form-full"><label>Description</label><textarea value={emg.description} onChange={e => setEmg({ ...emg, description: e.target.value })} /></div>
              </div>
              {emgMsg && <div className="notif notif-success" style={{ marginTop: 12 }}>{emgMsg}</div>}
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowEmergency(false)}>Close</button><button className="btn btn-danger" onClick={bookEmergency}>⚡ Book Now</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
