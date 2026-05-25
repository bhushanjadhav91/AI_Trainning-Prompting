import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api'
import { viewFile } from '../../api'
import type { Appointment, Doctor, Patient, MedicalReport } from '../../types'

export default function AdminAppointments() {
  const qc = useQueryClient()
  const { data: appointments = [] } = useQuery({ queryKey:['admin-appts'], queryFn: adminApi.getAppointments })
  const { data: doctors = [] } = useQuery({ queryKey:['admin-docs'], queryFn: adminApi.getDoctors })
  const { data: patients = [] } = useQuery({ queryKey:['admin-patients'], queryFn: adminApi.getPatients })
  const [viewing, setViewing] = useState<Appointment|null>(null)
  const [patReports, setPatReports] = useState<MedicalReport[]>([])

  const refresh = () => qc.invalidateQueries({ queryKey:['admin-appts'] })
  const markDone = useMutation({ mutationFn: (id:number) => adminApi.markDone(id), onSuccess: refresh })
  const revert = useMutation({ mutationFn: (id:number) => adminApi.revertDone(id), onSuccess: refresh })
  const reassign = useMutation({ mutationFn: ({ id, did }: {id:number,did:number}) => adminApi.reassign(id, did), onSuccess: refresh })

  const patientName = (id:number) => patients.find((p:Patient) => p.id===id)?.name ?? `Patient #${id}`
  const doctorName = (id?:number) => doctors.find((d:Doctor) => d.id===id)?.name ?? '—'
  const activeDoctors = doctors.filter((d:Doctor) => d.accountStatus==='active' && d.availabilityStatus!=='away')

  function openView(a: Appointment) {
    setViewing(a); setPatReports([])
    adminApi.patientReports(a.patientId).then(setPatReports)
  }

  return (
    <>
      <div className="card">
        <div className="card-header"><div><div className="card-title">All Appointments ({appointments.length})</div><div className="card-sub">Reassign doctors, mark done. View always visible.</div></div></div>
        <table>
          <thead><tr><th>Type</th><th>Patient</th><th>Doctor</th><th>Date/Time</th><th>Complaint</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {appointments.map((a:Appointment) => (
              <tr key={a.id}>
                <td><span className={`badge ${a.type==='emergency'?'badge-danger':a.type==='walkin'?'badge-success':'badge-info'}`}>{a.type}</span></td>
                <td>{patientName(a.patientId)}</td>
                <td>
                  <select value={a.doctorId} onChange={e => reassign.mutate({id:a.id!,did:+e.target.value})} style={{ fontSize:12,padding:4,width:140 }} disabled={a.status==='done'}>
                    {activeDoctors.map((d:Doctor) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </td>
                <td style={{ fontSize:12 }}>{a.date}<br/>{a.time}</td>
                <td style={{ fontSize:12,maxWidth:180 }}>{a.complaint}</td>
                <td><span className={`badge ${a.status==='done'?'badge-success':a.status==='in-progress'?'badge-warning':'badge-info'}`}>{a.status}</span></td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => openView(a)}>View</button>
                  {a.status!=='done' && <button className="btn btn-success btn-sm" style={{ marginLeft:4 }} onClick={() => markDone.mutate(a.id!)}>Done</button>}
                  {a.status==='done' && <button className="btn btn-warning btn-sm" style={{ marginLeft:4 }} onClick={() => { if(confirm('Revert to Waiting?')) revert.mutate(a.id!) }}>↩ Revert</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div className="overlay" onClick={e => { if ((e.target as HTMLElement).classList.contains('overlay')) setViewing(null) }}>
          <div className="modal" style={{ maxWidth:680 }}>
            <div className="modal-header">
              <div><div style={{ fontWeight:600,fontSize:16 }}>Appointment #{viewing.id}</div><div style={{ fontSize:12,color:'var(--text3)' }}>{viewing.date} · {viewing.time}</div></div>
              <button className="btn btn-outline btn-sm" onClick={() => setViewing(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="info-box">
                <h4>Patient</h4>
                {(() => { const p = patients.find((x:Patient) => x.id===viewing.patientId); return p ? (
                  <div className="grid-2">
                    <div><span className="lbl">Name:</span> <strong>{p.name}</strong></div>
                    <div><span className="lbl">Age/Gender:</span> {p.age}y / {p.gender}</div>
                    <div><span className="lbl">Contact:</span> {p.contact}</div>
                    <div><span className="lbl">Blood:</span> {p.bloodGroup}</div>
                    <div style={{ gridColumn:'1/-1' }}><span className="lbl">Allergies:</span> <span style={{ color:p.allergies&&p.allergies!=='None'?'var(--red)':'var(--emerald)' }}>{p.allergies??'None'}</span></div>
                  </div>
                ) : null })()}
              </div>
              <div className="info-box">
                <h4>Appointment</h4>
                <div><span className="lbl">Doctor:</span> <strong>{doctorName(viewing.doctorId)}</strong></div>
                <div style={{ marginTop:6 }}><span className="lbl">Type:</span> <span className={`badge ${viewing.type==='emergency'?'badge-danger':viewing.type==='walkin'?'badge-success':'badge-info'}`}>{viewing.type}</span></div>
                <div style={{ marginTop:6 }}><span className="lbl">Status:</span> <span className={`badge ${viewing.status==='done'?'badge-success':viewing.status==='in-progress'?'badge-warning':'badge-info'}`}>{viewing.status}</span></div>
                <div style={{ marginTop:8 }}><span className="lbl">Complaint:</span> {viewing.complaint}</div>
              </div>
              <div className="info-box">
                <h4>Patient Reports ({patReports.length})</h4>
                {patReports.length===0 ? <div style={{ fontSize:12,color:'var(--text3)' }}>No reports.</div> :
                  patReports.map((r:MedicalReport) => <div key={r.id} style={{ display:'flex',alignItems:'center',gap:10,padding:10,background:'#fff',borderRadius:8,marginBottom:6,border:'1px solid var(--border)' }}>
                    <div style={{ flex:1 }}><div style={{ fontWeight:500,fontSize:13 }}>{r.fileName}</div><div style={{ fontSize:11,color:'var(--text3)' }}><span className="badge badge-info" style={{ marginRight:6 }}>{r.reportType}</span>{r.description}</div></div>
                    <button className="btn btn-outline btn-sm" onClick={() => viewFile(r.id!)}>View File</button>
                  </div>)}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setViewing(null)}>Close</button>
              {viewing.status!=='done' && <button className="btn btn-success" onClick={() => { markDone.mutate(viewing.id!); setViewing(null) }}>Mark as Done</button>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
