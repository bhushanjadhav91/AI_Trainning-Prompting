import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api'
import type { DoctorProfileChange } from '../../types'

export default function AdminClock() {
  const qc = useQueryClient()
  const { data: today = [] } = useQuery({ queryKey:['clock-today'], queryFn: adminApi.clockToday })
  const { data: all = [] } = useQuery({ queryKey:['clock-all'], queryFn: adminApi.clockRecords })
  const { data: changes = [] } = useQuery({ queryKey:['profile-changes'], queryFn: adminApi.pendingProfileChanges })
  const [showAll, setShowAll] = useState(false)
  const [notes, setNotes] = useState<Record<number,string>>({})
  const [msgs, setMsgs] = useState<Record<number,string>>({})

  const refresh = () => { qc.invalidateQueries({ queryKey:['profile-changes'] }); qc.invalidateQueries({ queryKey:['clock-today'] }) }

  const approve = useMutation({ mutationFn: (id:number) => adminApi.approveProfileChange(id, notes[id]??''),
    onSuccess: (_,id) => { setMsgs(m => ({...m,[id]:'✅ Approved.'})); refresh() } })
  const reject = useMutation({ mutationFn: (id:number) => adminApi.rejectProfileChange(id, notes[id]??''),
    onSuccess: (_,id) => { setMsgs(m => ({...m,[id]:'✅ Rejected.'})); refresh() } })

  interface ClockRec { id:number; doctorName:string; date?:string; clockIn:string; clockOut?:string; durationMinutes?:number }
  const displayRecords = showAll ? all : today
  const totalHours = (today.reduce((s:number, r:ClockRec) => s+(r.durationMinutes??0), 0)/60).toFixed(1)
  const onDuty = today.filter((r:ClockRec) => !r.clockOut).length

  return (
    <>
      <div className="stats-grid">
        {[{icon:'✅',val:onDuty,label:'Currently On Duty',bg:'#dcfce7',c:'#16a34a'},
          {icon:'📋',val:today.length,label:'Sessions Today',bg:'#e0f2fe',c:'#0284c7'},
          {icon:'⏳',val:changes.filter((c:DoctorProfileChange)=>c.status==='pending').length,label:'Pending Profile Changes',bg:'#fef9c3',c:'#ca8a04'},
          {icon:'⏱',val:`${totalHours}h`,label:'Total Hours Today',bg:'#ede9fe',c:'#7c3aed'}
        ].map(s => <div key={s.label} className="stat-card"><div className="stat-icon" style={{background:s.bg,color:s.c}}>{s.icon}</div><div className="stat-value">{s.val}</div><div className="stat-label">{s.label}</div></div>)}
      </div>

      <div className="card">
        <div className="card-header">
          <div className="card-title">🕐 Clock Records</div>
          <button className="btn btn-outline btn-sm" onClick={() => setShowAll(!showAll)}>{showAll?'Today Only':'All Records'}</button>
        </div>
        <table>
          <thead><tr><th>Doctor</th><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Duration</th><th>Status</th></tr></thead>
          <tbody>
            {displayRecords.map((r:ClockRec) => (
              <tr key={r.id}>
                <td><strong>{r.doctorName}</strong></td>
                <td style={{fontSize:12}}>{r.date}</td>
                <td style={{fontSize:12}}>{r.clockIn?.slice(11,16)}</td>
                <td style={{fontSize:12}}>{r.clockOut ? r.clockOut.slice(11,16) : '—'}</td>
                <td>{r.durationMinutes ? `${Math.floor(r.durationMinutes/60)}h ${r.durationMinutes%60}m` : <span className="badge badge-success">On Duty</span>}</td>
                <td><span className={`badge ${r.clockOut?'badge-success':'badge-warning'}`}>{r.clockOut?'Completed':'Active'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">📝 Profile Change Requests ({changes.filter((c:DoctorProfileChange)=>c.status==='pending').length} pending)</div></div>
        {changes.length === 0 && <div style={{color:'var(--text3)',textAlign:'center',padding:24}}>No pending requests.</div>}
        {changes.map((c:DoctorProfileChange) => (
          <div key={c.id} style={{border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',padding:16,marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'start',marginBottom:10}}>
              <div><div style={{fontWeight:600}}>Dr. {c.doctorName} — Profile Change</div><div style={{fontSize:12,color:'var(--text3)'}}>Submitted {c.appliedAt?.slice(0,10)}</div></div>
              <span className="badge badge-warning">{c.status}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:13,marginBottom:10}}>
              {c.newName && <div><span className="lbl">Name →</span>{c.newName}</div>}
              {c.newPhone && <div><span className="lbl">Phone →</span>{c.newPhone}</div>}
              {c.newSpecialization && <div><span className="lbl">Specialization →</span>{c.newSpecialization}</div>}
              {c.newQualification && <div><span className="lbl">Qualification →</span>{c.newQualification}</div>}
              {c.newExperience && <div><span className="lbl">Experience →</span>{c.newExperience}</div>}
              {c.newSchedule && <div><span className="lbl">Schedule →</span>{c.newSchedule}</div>}
              {c.reason && <div style={{gridColumn:'1/-1'}}><span className="lbl">Reason:</span>{c.reason}</div>}
            </div>
            <div className="field"><label>Admin Note (optional)</label><input value={notes[c.id!]??''} onChange={e => setNotes(n => ({...n,[c.id!]:e.target.value}))} placeholder="Reason for approval/rejection…" /></div>
            <div style={{display:'flex',gap:8,marginTop:10}}>
              <button className="btn btn-success btn-sm" onClick={() => approve.mutate(c.id!)}>✓ Approve</button>
              <button className="btn btn-danger btn-sm" onClick={() => reject.mutate(c.id!)}>✕ Reject</button>
            </div>
            {msgs[c.id!] && <div className="notif notif-success" style={{marginTop:8,fontSize:12}}>{msgs[c.id!]}</div>}
          </div>
        ))}
      </div>
    </>
  )
}
