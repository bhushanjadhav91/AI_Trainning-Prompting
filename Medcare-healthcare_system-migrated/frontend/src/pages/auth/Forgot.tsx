import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authApi } from '../../api'

export default function Forgot() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [username, setUsername] = useState('')
  const [question, setQuestion] = useState<{ username: string; question: string; questionKey: string } | null>(null)
  const [answer, setAnswer] = useState(''); const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('')

  async function getQuestion() {
    if (!username.trim()) { setError('Please enter your username.'); return }
    setLoading(true); setError('')
    try { const q = await authApi.getQuestion(username.trim()); setQuestion(q); setStep(2) }
    catch (e: unknown) { const err = e as { response?: { data?: { error?: string } } }; setError(err?.response?.data?.error ?? 'Username not found.') }
    finally { setLoading(false) }
  }

  async function reset() {
    if (!answer || !newPassword) { setError('Both fields required.'); return }
    setLoading(true); setError('')
    try {
      const r = await authApi.resetPassword({ username: question!.username, questionKey: question!.questionKey, answer, newPassword }) as { message: string }
      setSuccess(r.message + ' Redirecting...')
      setTimeout(() => navigate('/login'), 1800)
    } catch (e: unknown) { const err = e as { response?: { data?: { error?: string } } }; setError(err?.response?.data?.error ?? 'Reset failed.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(135deg,#0A5285,#0E6BAD,#1A8FCC)',padding:20 }}>
      <div style={{ background:'#fff',borderRadius:20,padding:36,width:'100%',maxWidth:430,boxShadow:'0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ textAlign:'center',marginBottom:24 }}>
          <h1 style={{ fontFamily:"'Playfair Display',serif",fontSize:24,color:'var(--primary-dark)' }}>Forgot Password</h1>
          <p style={{ color:'var(--text3)',fontSize:12,marginTop:4 }}>Recover your account using a security question</p>
        </div>
        {step === 1 && <>
          <div className="field"><label>Username</label><input value={username} onChange={e => setUsername(e.target.value)} placeholder="Your patient username" /></div>
          <button className="btn btn-primary" style={{ width:'100%',justifyContent:'center' }} onClick={getQuestion} disabled={loading}>{loading ? 'Loading...' : 'Continue'}</button>
        </>}
        {step === 2 && question && <>
          <div className="notif notif-info">Hi <strong>{question.username}</strong> — please answer your security question.</div>
          <div className="field" style={{ marginTop:14 }}><label>{question.question}</label><input value={answer} onChange={e => setAnswer(e.target.value)} placeholder="Your answer" /></div>
          <div className="field"><label>New Password</label><input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Min 8 chars, 1 uppercase, 1 digit" /></div>
          <button className="btn btn-primary" style={{ width:'100%',justifyContent:'center' }} onClick={reset} disabled={loading}>{loading ? 'Resetting...' : 'Reset Password'}</button>
        </>}
        {error && <div className="notif notif-danger" style={{ marginTop:14 }}>{error}</div>}
        {success && <div className="notif notif-success" style={{ marginTop:14 }}>{success}</div>}
        <div style={{ textAlign:'center',marginTop:18,fontSize:13 }}><Link to="/login" style={{ color:'var(--primary)' }}>← Back to login</Link></div>
      </div>
    </div>
  )
}
