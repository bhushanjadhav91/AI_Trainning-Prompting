import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hisApi } from '../../api'
import type { Triage } from '../../types'

export default function HisEmergency() {
  const qc = useQueryClient()
  const { data: queue = [] } = useQuery({ queryKey:['triage-queue'], queryFn: hisApi.triageQueue })
  const { data: allTriage = [] } = useQuery({ queryKey:['all-triage'], queryFn: hisApi.allTriage })
  const { data: categories = [] } = useQuery({ queryKey:['triage-cats'], queryFn: hisApi.triageCategories })
  const [showTriage, setShowTriage] = useState(false)
  const [tf, setTf] = useState<Partial<Triage>>({patientGender:'Male',modeOfArrival:'walk-in',triageCategory:3})
  const [trErr, setTrErr] = useState('')

  const refresh = () => { qc.invalidateQueries({queryKey:['triage-queue','all-triage']}) }

  const catColor = (n?:number) => n===1?'#dc2626':n===2?'#ea580c':n===3?'#ca8a04':n===4?'#16a34a':'#2563eb'

  const submitTriage = useMutation({ mutationFn: () => {
    if (!tf.patientName||!tf.chiefComplaint) throw new Error('Patient name and chief complaint are required')
    return hisApi.createTriage(tf as Triage)
  }, onSuccess: () => { setShowTriage(false); refresh() }, onError: (e:Error) => setTrErr(e.message) })

  const updateStatus = useMutation({ mutationFn: ({id,status}:{id:number;status:string}) => hisApi.updateTriageStatus(id, status),
    onSuccess: refresh })

  interface TriageCat { category:number; label:string; targetTime:string }

  return (
    <>
      <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap'}}>
        {(categories as TriageCat[]).map(c=><div key={c.category} style={{padding:'5px 12px',borderRadius:20,background:catColor(c.category),color:c.category===4||c.category===3?'#333':'#fff',fontSize:12}}><strong>{c.category}</strong> {c.label} ({c.targetTime})</div>)}
      </div>

      <div className="card">
        <div className="card-header">
          <div><div className="card-title">🚨 Emergency Triage Queue ({(queue as Triage[]).length} active)</div><div className="card-sub">Sorted by severity — most critical first</div></div>
          <button className="btn btn-danger" onClick={()=>{setTf({patientGender:'Male',modeOfArrival:'walk-in',triageCategory:3});setTrErr('');setShowTriage(true)}}>+ Triage Patient</button>
        </div>
        {(queue as Triage[]).length===0 && <div style={{color:'var(--text3)',textAlign:'center',padding:30}}>No patients currently in emergency triage.</div>}
        {(queue as Triage[]).map(t=>(
          <div key={t.id} style={{display:'flex',alignItems:'flex-start',gap:14,padding:14,border:'1px solid var(--border)',borderRadius:'var(--radius)',marginBottom:8,borderLeft:`5px solid ${catColor(t.triageCategory)}`}}>
            <div style={{width:36,height:36,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:16,flexShrink:0,background:catColor(t.triageCategory),color:t.triageCategory===4||t.triageCategory===3?'#333':'#fff'}}>{t.triageCategory}</div>
            <div style={{flex:1}}>
              <div style={{fontWeight:600,fontSize:15}}>{t.patientName}</div>
              <div style={{fontSize:12,color:'var(--text3)'}}>{t.patientAge} · {t.patientGender} · {t.contactNumber}{t.uhid&&<span className="uhid-badge" style={{marginLeft:6}}>{t.uhid}</span>}</div>
              <div style={{fontSize:13,marginTop:4}}><strong>Chief complaint:</strong> {t.chiefComplaint}</div>
              {(t.bloodPressure||t.pulse||t.spO2) && <div style={{display:'flex',gap:12,marginTop:6,fontSize:12,flexWrap:'wrap'}}>
                {t.bloodPressure && <span style={{color:'var(--text3)'}}>BP: <strong>{t.bloodPressure}</strong></span>}
                {t.pulse && <span style={{color:'var(--text3)'}}>PR: <strong>{t.pulse}</strong></span>}
                {t.temperature && <span style={{color:'var(--text3)'}}>T: <strong>{t.temperature}</strong></span>}
                {t.spO2 && <span style={{color:'var(--text3)'}}>SpO₂: <strong>{t.spO2}</strong></span>}
                {t.gcsScore && <span style={{color:'var(--text3)'}}>GCS: <strong>{t.gcsScore}</strong></span>}
              </div>}
              <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>Arrived: {t.triageTime?.replace('T',' ').slice(0,16)} · Mode: {t.modeOfArrival}</div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              <button className="btn btn-primary btn-sm" onClick={()=>updateStatus.mutate({id:t.id!,status:'registered'})}>Register</button>
              <button className="btn btn-warning btn-sm" onClick={()=>updateStatus.mutate({id:t.id!,status:'under-treatment'})}>Treatment</button>
              <button className="btn btn-outline btn-sm" onClick={()=>updateStatus.mutate({id:t.id!,status:'discharged'})}>Discharge</button>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">All Emergency Records ({(allTriage as Triage[]).length})</div></div>
        <table><thead><tr><th>Category</th><th>Patient</th><th>Complaint</th><th>Vitals</th><th>Time</th><th>Status</th></tr></thead>
        <tbody>{(allTriage as Triage[]).map(t=><tr key={t.id}>
          <td><div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:12,background:catColor(t.triageCategory),color:t.triageCategory===4||t.triageCategory===3?'#333':'#fff'}}>{t.triageCategory}</div></td>
          <td><div style={{fontWeight:500}}>{t.patientName}</div><div style={{fontSize:11,color:'var(--text3)'}}>{t.patientAge} / {t.patientGender}</div></td>
          <td style={{fontSize:12,maxWidth:200}}>{t.chiefComplaint}</td>
          <td style={{fontSize:11,color:'var(--text3)'}}>{t.bloodPressure&&<div>BP: {t.bloodPressure}</div>}{t.pulse&&<div>PR: {t.pulse}</div>}{t.spO2&&<div>SpO₂: {t.spO2}</div>}</td>
          <td style={{fontSize:11}}>{t.triageTime?.replace('T',' ').slice(0,16)}</td>
          <td><span className={`badge ${t.status==='triaged'?'badge-danger':t.status==='discharged'?'badge-success':'badge-warning'}`}>{t.status}</span></td>
        </tr>)}</tbody></table>
      </div>

      {showTriage && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setShowTriage(false)}}>
        <div className="modal" style={{maxWidth:680}}>
          <div className="modal-header"><div style={{fontWeight:600,color:'var(--red)'}}>🚨 Emergency Triage</div><button className="btn btn-outline btn-sm" onClick={()=>setShowTriage(false)}>✕</button></div>
          <div className="modal-body">
            <div className="notif notif-danger" style={{marginBottom:14}}>No login required for emergency registration. Patient immediately joins the queue.</div>
            <div className="form-grid">
              <div className="field"><label>Patient Name *</label><input value={tf.patientName??''} onChange={e=>setTf({...tf,patientName:e.target.value})} /></div>
              <div className="field"><label>Age</label><input value={tf.patientAge??''} onChange={e=>setTf({...tf,patientAge:e.target.value})} placeholder="e.g. 45y or 6m" /></div>
              <div className="field"><label>Gender</label><select value={tf.patientGender??'Male'} onChange={e=>setTf({...tf,patientGender:e.target.value})}><option>Male</option><option>Female</option><option>Unknown</option></select></div>
              <div className="field"><label>Contact Number</label><input value={tf.contactNumber??''} onChange={e=>setTf({...tf,contactNumber:e.target.value})} /></div>
              <div className="field"><label>Mode of Arrival</label><select value={tf.modeOfArrival??'walk-in'} onChange={e=>setTf({...tf,modeOfArrival:e.target.value})}><option value="ambulance">Ambulance</option><option value="walk-in">Walk-in</option><option value="police">Police</option><option value="referred">Referred</option></select></div>
              <div className="field"><label>UHID (if known)</label><input value={tf.uhid??''} onChange={e=>setTf({...tf,uhid:e.target.value})} placeholder="MED2024..." /></div>
              <div className="field form-full"><label>Chief Complaint *</label><textarea value={tf.chiefComplaint??''} onChange={e=>setTf({...tf,chiefComplaint:e.target.value})} placeholder="Describe the emergency..." /></div>
              <div className="field form-full">
                <label>Triage Category *</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {(categories as TriageCat[]).map(c=>(
                    <div key={c.category} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',border:`2px solid ${tf.triageCategory===c.category?catColor(c.category):'var(--border)'}`,borderRadius:'var(--radius)',cursor:'pointer',minWidth:140,background:tf.triageCategory===c.category?'var(--primary-light)':'#fff'}} onClick={()=>setTf({...tf,triageCategory:c.category})}>
                      <div style={{width:28,height:28,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700,fontSize:12,background:catColor(c.category),color:c.category===4||c.category===3?'#333':'#fff',flexShrink:0}}>{c.category}</div>
                      <div><div style={{fontWeight:600,fontSize:12}}>{c.label}</div><div style={{fontSize:10,color:'var(--text3)'}}>{c.targetTime}</div></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="field"><label>Blood Pressure</label><input value={tf.bloodPressure??''} onChange={e=>setTf({...tf,bloodPressure:e.target.value})} placeholder="120/80" /></div>
              <div className="field"><label>Pulse (bpm)</label><input value={tf.pulse??''} onChange={e=>setTf({...tf,pulse:e.target.value})} placeholder="72" /></div>
              <div className="field"><label>Temperature (°F)</label><input value={tf.temperature??''} onChange={e=>setTf({...tf,temperature:e.target.value})} placeholder="98.6" /></div>
              <div className="field"><label>SpO₂ (%)</label><input value={tf.spO2??''} onChange={e=>setTf({...tf,spO2:e.target.value})} placeholder="98" /></div>
              <div className="field"><label>Respiratory Rate</label><input value={tf.respiratoryRate??''} onChange={e=>setTf({...tf,respiratoryRate:e.target.value})} placeholder="16/min" /></div>
              <div className="field"><label>Blood Sugar (mg/dL)</label><input value={tf.bloodSugar??''} onChange={e=>setTf({...tf,bloodSugar:e.target.value})} placeholder="100" /></div>
              <div className="field"><label>GCS Score (/15)</label><input value={tf.gcsScore??''} onChange={e=>setTf({...tf,gcsScore:e.target.value})} placeholder="15" /></div>
              <div className="field form-full"><label>Notes</label><input value={tf.notes??''} onChange={e=>setTf({...tf,notes:e.target.value})} /></div>
            </div>
            {trErr && <div className="notif notif-danger">{trErr}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setShowTriage(false)}>Cancel</button><button className="btn btn-danger" onClick={()=>submitTriage.mutate()} disabled={submitTriage.isPending}>🚨 Register Emergency</button></div>
        </div>
      </div>}
    </>
  )
}
