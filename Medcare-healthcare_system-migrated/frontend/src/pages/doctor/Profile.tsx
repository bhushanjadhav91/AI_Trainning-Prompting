import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { doctorApi } from '../../api'
import type { Leave, DoctorProfileChange } from '../../types'

export default function DoctorProfile() {
  const qc = useQueryClient()
  const { data: profile } = useQuery({ queryKey:['doc-profile'], queryFn: doctorApi.myProfile })
  const { data: changes = [] } = useQuery({ queryKey:['doc-changes'], queryFn: doctorApi.myProfileChanges })
  const { data: leaves = [] } = useQuery({ queryKey:['doc-leaves-mine'], queryFn: doctorApi.myLeaves })
  const { data: clockHist = [] } = useQuery({ queryKey:['doc-clock-hist'], queryFn: doctorApi.clockHistory })
  const { data: clockStat } = useQuery({ queryKey:['doc-clock-status'], queryFn: doctorApi.clockStatus, refetchInterval: 30000 })

  const [clockLoading, setClockLoading] = useState(false); const [clockMsg, setClockMsg] = useState(''); const [clockErr, setClockErr] = useState(false)
  const [showEdit, setShowEdit] = useState(false); const [editForm, setEditForm] = useState<Partial<DoctorProfileChange>>({}); const [editErr, setEditErr] = useState('')
  const [showLeave, setShowLeave] = useState(false); const [leaveForm, setLeaveForm] = useState({fromDate:'',toDate:'',reason:''}); const [leaveErr, setLeaveErr] = useState('')

  interface ClockRec { id:number; doctorId:number; doctorName:string; clockIn:string; clockOut?:string; durationMinutes?:number; date?:string }

  async function doClock(clockIn: boolean) {
    setClockLoading(true); setClockMsg(''); setClockErr(false)
    try {
      const r = clockIn ? await doctorApi.clockIn() : await doctorApi.clockOut() as ClockRec
      if (clockIn) setClockMsg('✅ Clocked in successfully.')
      else setClockMsg(`✅ Clocked out. Duration: ${Math.floor(((r as ClockRec).durationMinutes??0)/60)}h ${((r as ClockRec).durationMinutes??0)%60}m`)
      qc.invalidateQueries({queryKey:['doc-clock-status']}); qc.invalidateQueries({queryKey:['doc-clock-hist']})
    } catch (e: unknown) { setClockErr(true); const err = e as {response?:{data?:{error?:string}}}; setClockMsg(err?.response?.data?.error??'Failed') }
    finally { setClockLoading(false) }
  }

  const submitEdit = useMutation({ mutationFn: () => {
    const hasChange = Object.values(editForm).some(v => v && String(v).trim())
    if (!hasChange) throw new Error('Please fill in at least one field to change')
    return doctorApi.requestProfileChange(editForm as DoctorProfileChange)
  }, onSuccess: () => { setShowEdit(false); qc.invalidateQueries({queryKey:['doc-changes']}) }, onError: (e:Error) => setEditErr(e.message) })

  const submitLeave = useMutation({ mutationFn: () => {
    if (!leaveForm.fromDate||!leaveForm.toDate||!leaveForm.reason) throw new Error('All fields are required')
    return doctorApi.requestLeave({...leaveForm, doctorId:0} as Leave)
  }, onSuccess: () => { setShowLeave(false); qc.invalidateQueries({queryKey:['doc-leaves-mine']}) }, onError: (e:Error) => setLeaveErr(e.message) })

  const clockedIn = clockStat?.clockedIn ?? false

  return (
    <>
      <div className="card" style={{padding:20,background:clockedIn?'#f0fdf4':'var(--surface)',border:`1px solid ${clockedIn?'#86efac':'var(--border)'}`,borderRadius:'var(--radius-lg)',marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',gap:18}}>
          <div style={{fontSize:28}}>{clockedIn?'🟢':'🔴'}</div>
          <div style={{flex:1}}>
            <div style={{fontSize:18,fontWeight:700}}>{clockedIn?'On Duty':'Off Duty'}</div>
            {clockedIn ? <div style={{fontSize:13,color:'var(--text3)'}}>Clocked in at <strong>{clockStat?.clockInTime}</strong> · {clockStat?.sessionMinutes} min elapsed</div>
            : <div style={{fontSize:13,color:'var(--text3)'}}>Not clocked in today</div>}
          </div>
          {!clockedIn ? <button className="btn btn-success" onClick={() => doClock(true)} disabled={clockLoading}>✅ Clock In</button>
                       : <button className="btn btn-danger" onClick={() => doClock(false)} disabled={clockLoading}>🔴 Clock Out</button>}
        </div>
        {clockMsg && <div className={`notif ${clockErr?'notif-danger':'notif-success'}`} style={{marginTop:10}}>{clockMsg}</div>}
      </div>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
        <div className="card" style={{margin:0}}>
          <div className="card-header"><div className="card-title">👤 My Profile</div><button className="btn btn-outline btn-sm" onClick={() => { setEditForm({}); setEditErr(''); setShowEdit(true) }}>Request Edit</button></div>
          {profile && <div>{[['Name',profile.name],['Email',profile.email],['Specialization',profile.specialization],['Qualification',profile.qualification||'—'],['Experience',profile.experience||'—'],['Phone',profile.phone||'—'],['Schedule',profile.schedule||'—']].map(([l,v]) =>
            <div key={l} style={{display:'flex',gap:12,fontSize:13,padding:'8px 0',borderBottom:'1px solid var(--border)'}}><span style={{color:'var(--text3)',minWidth:130,fontWeight:500}}>{l}</span><span>{v}</span></div>
          )}</div>}
          {changes.length>0 && <div style={{marginTop:14}}>
            <div style={{fontSize:12,fontWeight:600,color:'var(--text3)',marginBottom:8,textTransform:'uppercase'}}>Profile Change Requests</div>
            {changes.map((c:DoctorProfileChange) => <div key={c.id} style={{display:'flex',gap:10,alignItems:'center',padding:8,border:'1px solid var(--border)',borderRadius:'var(--radius)',marginBottom:6,fontSize:12}}>
              <div style={{flex:1}}>{c.newName&&<div>Name → {c.newName}</div>}{c.newPhone&&<div>Phone → {c.newPhone}</div>}{c.adminNote&&<div style={{color:'var(--text3)'}}>Admin: {c.adminNote}</div>}</div>
              <span className={`badge ${c.status==='approved'?'badge-success':c.status==='rejected'?'badge-danger':'badge-warning'}`}>{c.status}</span>
            </div>)}
          </div>}
        </div>
        <div className="card" style={{margin:0}}>
          <div className="card-header"><div className="card-title">🕐 Clock History</div></div>
          {clockHist.length===0 ? <div style={{color:'var(--text3)',textAlign:'center',padding:20}}>No clock records yet.</div> :
            <table><thead><tr><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Duration</th></tr></thead>
            <tbody>{(clockHist as ClockRec[]).slice(0,15).map(r => <tr key={r.id}>
              <td style={{fontSize:12}}>{r.date}</td>
              <td style={{fontSize:12}}>{r.clockIn?.slice(11,16)}</td>
              <td style={{fontSize:12}}>{r.clockOut?r.clockOut.slice(11,16):'—'}</td>
              <td>{r.durationMinutes?`${Math.floor(r.durationMinutes/60)}h ${r.durationMinutes%60}m`:<span className="badge badge-warning">Active</span>}</td>
            </tr>)}</tbody></table>}
        </div>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">🌴 Leave Requests</div><button className="btn btn-primary" onClick={() => { setLeaveForm({fromDate:'',toDate:'',reason:''}); setLeaveErr(''); setShowLeave(true) }}>+ Apply for Leave</button></div>
        {leaves.length===0 ? <div style={{color:'var(--text3)',textAlign:'center',padding:20}}>No leave requests.</div> :
          <table><thead><tr><th>From</th><th>To</th><th>Reason</th><th>Applied</th><th>Status</th></tr></thead>
          <tbody>{(leaves as Leave[]).map(l => <tr key={l.id}><td>{l.fromDate}</td><td>{l.toDate}</td><td style={{fontSize:12,maxWidth:200}}>{l.reason}</td><td style={{fontSize:12}}>{l.appliedDate}</td>
            <td><span className={`badge ${l.status==='approved'?'badge-success':l.status==='rejected'?'badge-danger':'badge-warning'}`}>{l.status}</span></td>
          </tr>)}</tbody></table>}
      </div>

      {showEdit && <div className="overlay" onClick={e => { if((e.target as HTMLElement).classList.contains('overlay')) setShowEdit(false) }}>
        <div className="modal" style={{maxWidth:520}}>
          <div className="modal-header"><div style={{fontWeight:600}}>Request Profile Update</div><button className="btn btn-outline btn-sm" onClick={() => setShowEdit(false)}>✕</button></div>
          <div className="modal-body">
            <div className="notif notif-info">Only fill in fields you want to change. Admin must approve before changes go live.</div>
            <div className="form-grid" style={{marginTop:12}}>
              {[['newName','Name'],['newPhone','Phone'],['newQualification','Qualification'],['newExperience','Experience'],['newSchedule','Schedule'],['newSpecialization','Specialization']].map(([k,l]) =>
                <div key={k} className="field"><label>{l}</label><input value={(editForm as Record<string,string>)[k]??''} onChange={e => setEditForm({...editForm,[k]:e.target.value})} /></div>
              )}
              <div className="field form-full"><label>Reason for change</label><textarea value={editForm.reason??''} onChange={e => setEditForm({...editForm,reason:e.target.value})} placeholder="Why are you requesting this change?" /></div>
            </div>
            {editErr && <div className="notif notif-danger" style={{marginTop:8}}>{editErr}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowEdit(false)}>Cancel</button><button className="btn btn-primary" onClick={() => submitEdit.mutate()} disabled={submitEdit.isPending}>Submit Request</button></div>
        </div>
      </div>}

      {showLeave && <div className="overlay" onClick={e => { if((e.target as HTMLElement).classList.contains('overlay')) setShowLeave(false) }}>
        <div className="modal" style={{maxWidth:480}}>
          <div className="modal-header"><div style={{fontWeight:600}}>Apply for Leave</div><button className="btn btn-outline btn-sm" onClick={() => setShowLeave(false)}>✕</button></div>
          <div className="modal-body">
            <div className="form-grid">
              <div className="field"><label>From Date *</label><input type="date" value={leaveForm.fromDate} onChange={e => setLeaveForm({...leaveForm,fromDate:e.target.value})} /></div>
              <div className="field"><label>To Date *</label><input type="date" value={leaveForm.toDate} onChange={e => setLeaveForm({...leaveForm,toDate:e.target.value})} /></div>
              <div className="field form-full"><label>Reason *</label><textarea value={leaveForm.reason} onChange={e => setLeaveForm({...leaveForm,reason:e.target.value})} placeholder="Reason for leave…" /></div>
            </div>
            {leaveErr && <div className="notif notif-danger">{leaveErr}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowLeave(false)}>Cancel</button><button className="btn btn-primary" onClick={() => submitLeave.mutate()} disabled={submitLeave.isPending}>{submitLeave.isPending?'Submitting…':'Submit Leave Request'}</button></div>
        </div>
      </div>}
    </>
  )
}
