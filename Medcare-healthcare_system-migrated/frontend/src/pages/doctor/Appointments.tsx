import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { doctorApi } from '../../api'
import { viewFile } from '../../api'
import type { Appointment, Patient, MedicalReport, Prescription } from '../../types'

export default function DoctorAppointments() {
  const qc = useQueryClient()
  const { data: appointments = [] } = useQuery({ queryKey:['doc-appts'], queryFn: doctorApi.myAppointments })
  const { data: patients = [] } = useQuery({ queryKey:['doc-patients'], queryFn: doctorApi.myPatients })
  const [viewing, setViewing] = useState<Appointment|null>(null)
  const [patReports, setPatReports] = useState<MedicalReport[]>([])
  const [patRx, setPatRx] = useState<Prescription[]>([])

  const refresh = () => qc.invalidateQueries({ queryKey:['doc-appts'] })
  const markDone = useMutation({ mutationFn: (id:number) => doctorApi.markDone(id), onSuccess: refresh })
  const revert = useMutation({ mutationFn: (id:number) => doctorApi.revertDone(id), onSuccess: refresh })
  const patName = (id:number) => patients.find((p:Patient) => p.id===id)?.name ?? `Patient #${id}`

  function openView(a: Appointment) {
    setViewing(a); setPatReports([]); setPatRx([])
    doctorApi.patientReports(a.patientId).then(setPatReports)
    doctorApi.patientPrescriptions(a.patientId).then(setPatRx)
  }

  const vp = viewing && patients.find((p:Patient) => p.id===viewing.patientId)

  return (
    <>
      <div className="card">
        <div className="card-header"><div><div className="card-title">My Appointment Queue</div><div className="card-sub">Sorted by priority. View remains available after completion.</div></div></div>
        <table>
          <thead><tr><th>Type</th><th>Patient</th><th>Time</th><th>Complaint</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {appointments.map((a:Appointment) => (
              <tr key={a.id}>
                <td><span className={`badge ${a.type==='emergency'?'badge-danger':a.type==='walkin'?'badge-success':'badge-info'}`}>{a.type}</span></td>
                <td>{patName(a.patientId)}</td><td>{a.time}</td>
                <td style={{fontSize:12,maxWidth:180}}>{a.complaint}</td>
                <td><span className={`badge ${a.status==='done'?'badge-success':a.status==='in-progress'?'badge-warning':'badge-info'}`}>{a.status}</span></td>
                <td>
                  <button className="btn btn-outline btn-sm" onClick={() => openView(a)}>View</button>
                  {a.status!=='done' && <button className="btn btn-success btn-sm" style={{marginLeft:4}} onClick={() => markDone.mutate(a.id!)}>Done</button>}
                  {a.status==='done' && <button className="btn btn-warning btn-sm" style={{marginLeft:4}} onClick={() => { if(confirm('Revert to Waiting?')) revert.mutate(a.id!) }}>↩ Revert</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div className="overlay" onClick={e => { if((e.target as HTMLElement).classList.contains('overlay')) setViewing(null) }}>
          <div className="modal" style={{maxWidth:680}}>
            <div className="modal-header">
              <div><div style={{fontWeight:600,fontSize:16}}>Appointment #{viewing.id}</div><div style={{fontSize:12,color:'var(--text3)'}}>{viewing.date} · {viewing.time}</div></div>
              <button className="btn btn-outline btn-sm" onClick={() => setViewing(null)}>✕</button>
            </div>
            <div className="modal-body">
              {vp && <div className="info-box"><h4>Patient</h4><div className="grid-2">
                <div><span className="lbl">Name:</span> <strong>{vp.name}</strong></div>
                <div><span className="lbl">Age/Gender:</span> {vp.age}y / {vp.gender}</div>
                <div><span className="lbl">Contact:</span> {vp.contact}</div>
                <div><span className="lbl">Blood:</span> {vp.bloodGroup}</div>
                <div style={{gridColumn:'1/-1'}}><span className="lbl">Allergies:</span> <span style={{color:vp.allergies&&vp.allergies!=='None'?'var(--red)':'var(--emerald)'}}>{vp.allergies??'None'}</span></div>
              </div></div>}
              <div className="info-box"><h4>Appointment</h4>
                <div><span className="lbl">Type:</span> <span className={`badge ${viewing.type==='emergency'?'badge-danger':viewing.type==='walkin'?'badge-success':'badge-info'}`}>{viewing.type}</span></div>
                <div style={{marginTop:6}}><span className="lbl">Status:</span> <span className={`badge ${viewing.status==='done'?'badge-success':viewing.status==='in-progress'?'badge-warning':'badge-info'}`}>{viewing.status}</span></div>
                <div style={{marginTop:8}}><span className="lbl">Complaint:</span> {viewing.complaint}</div>
              </div>
              <div className="info-box"><h4>Medical Reports ({patReports.length})</h4>
                {patReports.length===0 ? <div style={{fontSize:12,color:'var(--text3)'}}>No reports.</div> :
                  patReports.map((r:MedicalReport) => <div key={r.id} style={{display:'flex',alignItems:'center',gap:10,padding:10,background:'#fff',borderRadius:8,marginBottom:6,border:'1px solid var(--border)'}}>
                    <div style={{flex:1}}><div style={{fontWeight:500,fontSize:13}}>{r.fileName}</div><div style={{fontSize:11,color:'var(--text3)'}}><span className="badge badge-info" style={{marginRight:6}}>{r.reportType}</span>{r.description}</div></div>
                    <button className="btn btn-outline btn-sm" onClick={() => viewFile(r.id!)}>View File</button>
                  </div>)}
              </div>
              <div className="info-box"><h4>Prescription History ({patRx.length})</h4>
                {patRx.length===0 ? <div style={{fontSize:12,color:'var(--text3)'}}>No prior prescriptions.</div> :
                  patRx.map((r:Prescription) => <div key={r.id} style={{padding:10,background:'#fff',borderRadius:8,marginBottom:6,border:'1px solid var(--border)',fontSize:13}}>
                    <div style={{fontSize:11,color:'var(--text3)'}}>{r.date}</div>
                    <div><strong>Medicines:</strong> {r.medicines}</div>
                    <div style={{fontSize:12}}><strong>Dosage:</strong> {r.dosage} · {r.duration}</div>
                    {r.tests && <div style={{fontSize:12}}><strong>Tests:</strong> {r.tests}</div>}
                  </div>)}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setViewing(null)}>Close</button>
              {viewing.status!=='done' && <button className="btn btn-success" onClick={() => { markDone.mutate(viewing.id!); setViewing(null) }}>Mark as Done</button>}
              {viewing.status==='done' && <button className="btn btn-warning" onClick={() => { revert.mutate(viewing.id!); setViewing(null) }}>↩ Revert to Waiting</button>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
