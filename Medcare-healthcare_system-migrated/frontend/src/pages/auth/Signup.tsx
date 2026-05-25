import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../../api'

export default function Signup() {
  const navigate = useNavigate()
  const [data, setData] = useState({ name:'', username:'', age:0, gender:'Male', mobile:'', password:'', motherName:'', petName:'', homeTown:'' })
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('')

  async function signup() {
    setError(''); setSuccess('')
    const r: string[] = []
    if (!data.name) r.push('name'); if (!data.username) r.push('username')
    if (!data.age) r.push('age'); if (!data.mobile) r.push('mobile')
    if (!data.password) r.push('password'); if (!data.motherName) r.push("mother's name")
    if (!data.petName) r.push("pet's name"); if (!data.homeTown) r.push('home town')
    if (r.length) { setError('Required: ' + r.join(', ')); return }
    setLoading(true)
    try {
      const res = await authApi.signup(data) as { message: string }
      setSuccess(res.message + ' Redirecting to login...')
      setTimeout(() => navigate('/login'), 1800)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } } }
      setError(err?.response?.data?.error ?? 'Signup failed')
    } finally { setLoading(false) }
  }

  const f = (k: keyof typeof data) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setData({ ...data, [k]: k === 'age' ? +e.target.value : e.target.value })

  return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#0A5285,#0E6BAD,#1A8FCC)',padding:20 }}>
      <div style={{ background:'#fff',borderRadius:20,padding:32,width:'100%',maxWidth:540,boxShadow:'0 20px 60px rgba(0,0,0,.2)',maxHeight:'95vh',overflowY:'auto' }}>
        <div style={{ textAlign:'center',marginBottom:18 }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif",fontSize:22,color:'var(--primary-dark)' }}>Create Patient Account</h1>
          <p style={{ color:'var(--text3)',fontSize:12,marginTop:4 }}>Sign up to book appointments and access prescriptions</p>
        </div>
        <div className="form-grid">
          <div className="field"><label>Full Name *</label><input value={data.name} onChange={f('name')} /></div>
          <div className="field"><label>Username *</label><input value={data.username} onChange={f('username')} autoComplete="username" /></div>
          <div className="field"><label>Age *</label><input type="number" value={data.age} onChange={f('age')} /></div>
          <div className="field"><label>Gender *</label><select value={data.gender} onChange={f('gender')}><option>Male</option><option>Female</option><option>Other</option></select></div>
          <div className="field form-full"><label>Mobile Number *</label><input value={data.mobile} onChange={f('mobile')} /></div>
          <div className="field form-full">
            <label>Password *</label>
            <input type="password" value={data.password} onChange={f('password')} placeholder="Min 8 chars, 1 uppercase, 1 digit" />
            <div style={{ fontSize:11,color:'var(--text3)',marginTop:4 }}>At least 8 characters, with one uppercase letter and one digit.</div>
          </div>
        </div>
        <div style={{ marginTop:14,padding:14,background:'var(--primary-light)',borderRadius:10 }}>
          <div style={{ fontWeight:600,color:'var(--primary-dark)',fontSize:13 }}>🔒 Security Questions</div>
          <div style={{ fontSize:11,color:'var(--text3)',marginTop:2 }}>All three are required for account recovery.</div>
          <div className="form-grid" style={{ marginTop:10 }}>
            <div className="field form-full"><label>Mother's Name *</label><input value={data.motherName} onChange={f('motherName')} /></div>
            <div className="field form-full"><label>Pet's Name *</label><input value={data.petName} onChange={f('petName')} /></div>
            <div className="field form-full"><label>Home Town *</label><input value={data.homeTown} onChange={f('homeTown')} /></div>
          </div>
        </div>
        {error && <div className="notif notif-danger" style={{ marginTop:12 }}>{error}</div>}
        {success && <div className="notif notif-success" style={{ marginTop:12 }}>{success}</div>}
        <button className="btn btn-primary" style={{ width:'100%',justifyContent:'center',marginTop:14 }} onClick={signup} disabled={loading}>{loading ? 'Creating account...' : 'Sign Up'}</button>
        <div style={{ textAlign:'center',marginTop:14,fontSize:13 }}>Already have an account? <Link to="/login" style={{ color:'var(--primary)' }}>Sign in</Link></div>
      </div>
    </div>
  )
}
