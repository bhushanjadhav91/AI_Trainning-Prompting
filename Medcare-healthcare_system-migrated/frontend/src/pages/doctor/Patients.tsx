import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { doctorApi } from '../../api'
import { viewFile } from '../../api'
import type { Patient, MedicalReport, Prescription, Bill } from '../../types'

function empty(): Patient { return {name:'',age:0,gender:'Male',contact:'',bloodGroup:'O+',allergies:'',address:'',history:''} }

export default function DoctorPatients() {
  const qc = useQueryClient()
  const { data: patients = [] } = useQuery({ queryKey:['doc-patients'], queryFn: doctorApi.myPatients })
  const [viewing, setViewing] = useState<Patient|null>(null)
  const [tab, setTab] = useState<'profile'|'reports'|'history'|'bills'>('profile')
  const [reports, setReports] = useState<MedicalReport[]>([])
  const [history, setHistory] = useState<Prescription[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [showReg, setShowReg] = useState(false)
  const [reg, setReg] = useState<Patient>(empty())
  const [regErr, setRegErr] = useState('')

  function openView(p:Patient) {
    setViewing(p); setTab('profile'); setReports([]); setHistory([]); setBills([])
    doctorApi.patientReports(p.id!).then(setReports)
    doctorApi.patientPrescriptions(p.id!).then(setHistory)
    doctorApi.patientBills(p.id!).then(setBills)
  }

  const register = useMutation({ mutationFn: () => {
    if (!reg.name||!reg.contact||!reg.age) throw new Error('Name, age and contact required')
    return doctorApi.registerPatient(reg)
  }, onSuccess: () => { setShowReg(false); qc.invalidateQueries({queryKey:['doc-patients']}) }, onError: (e:Error) => setRegErr(e.message) })

  const f = (k:keyof Patient) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setReg({...reg,[k]: k==='age'?+e.target.value:e.target.value})

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">My Patients ({patients.length})</div><div className="card-sub">View profile, reports, prescriptions and billing.</div></div>
          <button className="btn btn-primary" onClick={() => { setReg(empty()); setRegErr(''); setShowReg(true) }}>+ Register Walk-in Patient</button>
        </div>
        <table>
          <thead><tr><th>Patient</th><th>Age/Gender</th><th>Blood</th><th>Contact</th><th>Allergies</th><th>Last Visit</th><th>Action</th></tr></thead>
          <tbody>
            {patients.map((p:Patient) => (
              <tr key={p.id}>
                <td><strong>{p.name}</strong></td><td>{p.age}y / {p.gender}</td>
                <td><span className="badge badge-danger">{p.bloodGroup}</span></td>
                <td>{p.contact}</td>
                <td style={{fontSize:12,color:p.allergies&&p.allergies!=='None'?'var(--red)':'var(--emerald)'}}>{p.allergies??'None'}</td>
                <td style={{fontSize:12}}>{p.lastVisit}</td>
                <td><button className="btn btn-outline btn-sm" onClick={() => openView(p)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div className="overlay" onClick={e => { if((e.target as HTMLElement).classList.contains('overlay')) setViewing(null) }}>
          <div className="modal" style={{maxWidth:720}}>
            <div className="modal-header">
              <div><div style={{fontWeight:600,fontSize:16}}>{viewing.name}</div><div style={{fontSize:12,color:'var(--text3)'}}>{viewing.age}y · {viewing.gender} · {viewing.contact}</div></div>
              <button className="btn btn-outline btn-sm" onClick={() => setViewing(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="tabs" style={{marginBottom:14}}>
                {(['profile','reports','history','bills'] as const).map(t => <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}{t==='reports'?` (${reports.length})`:t==='history'?` (${history.length})`:t==='bills'?` (${bills.length})`:''}
                </button>)}
              </div>
              {tab==='profile' && <div className="info-box"><div className="grid-2">
                <div><span className="lbl">Blood Group:</span> {viewing.bloodGroup??'—'}</div>
                <div><span className="lbl">Last Visit:</span> {viewing.lastVisit??'—'}</div>
                <div style={{gridColumn:'1/-1'}}><span className="lbl">Allergies:</span> <span style={{color:viewing.allergies&&viewing.allergies!=='None'?'var(--red)':'var(--emerald)'}}>{viewing.allergies??'None'}</span></div>
                <div style={{gridColumn:'1/-1'}}><span className="lbl">Address:</span> {viewing.address??'—'}</div>
                <div style={{gridColumn:'1/-1'}}><span className="lbl">Medical History:</span> {viewing.history??'—'}</div>
              </div></div>}
              {tab==='reports' && <div>
                {reports.length===0?<div style={{color:'var(--text3)',textAlign:'center',padding:24}}>No reports.</div>:
                  reports.map((r:MedicalReport) => <div key={r.id} style={{display:'flex',alignItems:'center',gap:10,padding:10,background:'#fff',borderRadius:8,marginBottom:6,border:'1px solid var(--border)'}}>
                    <div style={{flex:1}}><div style={{fontWeight:500}}>{r.fileName}</div><div style={{fontSize:11,color:'var(--text3)'}}><span className="badge badge-info" style={{marginRight:6}}>{r.reportType}</span>{r.description??'No description'}</div></div>
                    <button className="btn btn-outline btn-sm" onClick={() => viewFile(r.id!)}>View File</button>
                  </div>)}
              </div>}
              {tab==='history' && <div>
                {history.length===0?<div style={{color:'var(--text3)',textAlign:'center',padding:24}}>No prescriptions.</div>:
                  history.map((r:Prescription) => <div key={r.id} style={{padding:10,background:'#fff',borderRadius:8,marginBottom:6,border:'1px solid var(--border)',fontSize:13}}>
                    <div style={{fontSize:11,color:'var(--text3)'}}>{r.date}</div>
                    <div><strong>Medicines:</strong> {r.medicines}</div>
                    <div style={{fontSize:12}}><strong>Dosage:</strong> {r.dosage} · {r.duration}</div>
                    {r.tests && <div style={{fontSize:12}}><strong>Tests:</strong> {r.tests}</div>}
                  </div>)}
              </div>}
              {tab==='bills' && <div>
                {bills.length===0?<div style={{color:'var(--text3)',textAlign:'center',padding:24}}>No bills.</div>:
                  <table><thead><tr><th>Invoice</th><th>Date</th><th>Total</th><th>Status</th></tr></thead>
                  <tbody>{bills.map((b:Bill) => <tr key={b.id}><td><strong>{b.invoiceNumber}</strong></td><td style={{fontSize:12}}>{b.billDate}</td><td>₹{b.totalAmount?.toLocaleString()}</td><td><span className={`badge ${b.status==='paid'?'badge-success':'badge-warning'}`}>{b.status}</span></td></tr>)}</tbody></table>}
              </div>}
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setViewing(null)}>Close</button></div>
          </div>
        </div>
      )}

      {showReg && (
        <div className="overlay" onClick={e => { if((e.target as HTMLElement).classList.contains('overlay')) setShowReg(false) }}>
          <div className="modal">
            <div className="modal-header"><div style={{fontWeight:600}}>Register Walk-in Patient</div><button className="btn btn-outline btn-sm" onClick={() => setShowReg(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field"><label>Name *</label><input value={reg.name} onChange={f('name')} /></div>
                <div className="field"><label>Age *</label><input type="number" value={reg.age} onChange={f('age')} /></div>
                <div className="field"><label>Gender</label><select value={reg.gender} onChange={f('gender')}><option>Male</option><option>Female</option><option>Other</option></select></div>
                <div className="field"><label>Contact *</label><input value={reg.contact} onChange={f('contact')} /></div>
                <div className="field"><label>Blood Group</label><select value={reg.bloodGroup??'O+'} onChange={f('bloodGroup')}>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b=><option key={b}>{b}</option>)}</select></div>
                <div className="field"><label>Allergies</label><input value={reg.allergies??''} onChange={f('allergies')} /></div>
                <div className="field form-full"><label>Address</label><input value={reg.address??''} onChange={f('address')} /></div>
                <div className="field form-full"><label>Medical History</label><textarea value={reg.history??''} onChange={f('history')} /></div>
              </div>
              {regErr && <div className="notif notif-danger">{regErr}</div>}
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowReg(false)}>Cancel</button><button className="btn btn-primary" onClick={() => register.mutate()} disabled={register.isPending}>Register</button></div>
          </div>
        </div>
      )}
    </>
  )
}
