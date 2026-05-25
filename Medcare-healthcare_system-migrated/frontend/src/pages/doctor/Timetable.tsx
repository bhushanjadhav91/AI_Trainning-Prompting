import { useState, useEffect } from 'react'
import { doctorApi } from '../../api'
import { useAuthStore } from '../../store/authStore'
import type { Doctor } from '../../types'

export default function DoctorTimetable() {
  const { getUserId } = useAuthStore()
  const [doctor, setDoctor] = useState<Doctor|null>(null)
  const [form, setForm] = useState({status:'available',availableUntil:'',availableFrom:'',note:''})
  const [saving, setSaving] = useState(false); const [msg, setMsg] = useState(''); const [isErr, setIsErr] = useState(false)

  useEffect(() => { doctorApi.myProfile().then(d => { setDoctor(d); setForm(f => ({...f,status:d.availabilityStatus??'available',availableUntil:d.availableUntil??'',availableFrom:d.availableFrom??'',note:d.availabilityNote??''})) }) }, [getUserId()])

  async function save() {
    setSaving(true); setMsg(''); setIsErr(false)
    try {
      const d = await doctorApi.setAvailability(form.status, form.availableUntil, form.availableFrom, form.note)
      setDoctor(d); setMsg('✅ Availability updated successfully!')
    } catch { setIsErr(true); setMsg('Failed to update') }
    finally { setSaving(false) }
  }

  function reset() { setForm({status:'available',availableUntil:'',availableFrom:'',note:''}); setTimeout(save, 0) }

  const statusColour = form.status==='available'?'#f0fdf4':form.status==='in-operation'?'#fffbeb':'#fff1f2'
  const statusBorder = form.status==='available'?'#86efac':form.status==='in-operation'?'#fcd34d':'#fca5a5'
  const dotColor = form.status==='available'?'#16a34a':form.status==='in-operation'?'#d97706':'#dc2626'
  const statusLabel = form.status==='available'?'Available — accepting patients':form.status==='in-operation'?'In Operation / Procedure in progress':'Away / Not available'

  return (
    <>
      <div className="card">
        <div className="card-header"><div><div className="card-title">My Availability & Timetable</div><div className="card-sub">Set your real-time status and available time windows.</div></div></div>
        <div style={{padding:16,borderRadius:'var(--radius-lg)',marginBottom:6,background:statusColour,border:`1px solid ${statusBorder}`}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:16,height:16,borderRadius:'50%',background:dotColor,flexShrink:0}} />
            <div><div style={{fontWeight:600,fontSize:16}}>{statusLabel}</div>
              {doctor?.availableUntil && <div style={{fontSize:13,color:'var(--text3)'}}>Until {doctor.availableUntil}{doctor.availableFrom&&` · Available from ${doctor.availableFrom}`}</div>}
              {doctor?.availabilityNote && <div style={{fontSize:13,color:'var(--text3)'}}>📝 {doctor.availabilityNote}</div>}
            </div>
          </div>
        </div>
        <div style={{display:'flex',gap:10,margin:'16px 0'}}>
          {['available','in-operation','away'].map(s => <button key={s} className={`btn btn-sm ${form.status===s?(s==='available'?'btn-success':s==='in-operation'?'btn-warning':'btn-danger'):'btn-outline'}`} onClick={() => setForm({...form,status:s})}>{s==='available'?'✓ Available':s==='in-operation'?'⚙ In Operation':'🔴 Away'}</button>)}
        </div>
        <div className="form-grid">
          {form.status!=='available' && <>
            <div className="field"><label>{form.status==='in-operation'?'In operation until':'Away until'}</label><input type="time" value={form.availableUntil} onChange={e => setForm({...form,availableUntil:e.target.value})} /></div>
            <div className="field"><label>Available again from (optional)</label><input type="time" value={form.availableFrom} onChange={e => setForm({...form,availableFrom:e.target.value})} /></div>
          </>}
          <div className="field form-full"><label>Message for patients (optional)</label><input value={form.note} onChange={e => setForm({...form,note:e.target.value})} placeholder={form.status==='available'?'e.g. Seeing patients as usual':'e.g. In surgery — back by 14:30'} /></div>
        </div>
        {msg && <div className={`notif ${isErr?'notif-danger':'notif-success'}`}>{msg}</div>}
        <div style={{display:'flex',gap:10,marginTop:4}}>
          <button className="btn btn-primary" onClick={save} disabled={saving}>{saving?'Saving…':'Update Availability'}</button>
          <button className="btn btn-outline" onClick={reset}>Reset to Available</button>
        </div>
      </div>
      {doctor && <div className="card">
        <div className="card-header"><div className="card-title">My Schedule</div></div>
        <div style={{display:'grid',gap:0}}>
          {[['Name',doctor.name],['Specialization',doctor.specialization],['Schedule',doctor.schedule||'Not set'],['Experience',doctor.experience||'—'],['Qualification',doctor.qualification||'—']].map(([l,v]) =>
            <div key={l} style={{display:'flex',gap:12,fontSize:13,padding:'8px 0',borderBottom:'1px solid var(--border)'}}><span style={{color:'var(--text3)',minWidth:130,fontWeight:500}}>{l}</span><span>{v}</span></div>
          )}
        </div>
        <div className="notif notif-info" style={{marginTop:14}}>The "Schedule" field (e.g. "Mon-Sat 9AM-1PM") is used to generate appointment time slots for patients. Contact your admin to update your schedule.</div>
      </div>}
    </>
  )
}
