import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hisApi, adminApi } from '../../api'
import type { Admission, Patient, Doctor } from '../../types'

const BED_TYPES = [{key:'general',label:'General Ward'},{key:'semi-private',label:'Semi-Private'},{key:'private',label:'Private'},{key:'deluxe',label:'Deluxe/Suite'},{key:'icu',label:'ICU'},{key:'nicu',label:'NICU'},{key:'picu',label:'PICU'}]

export default function HisIpd() {
  const qc = useQueryClient()
  const { data: admitted = [] } = useQuery({ queryKey:['admitted'], queryFn: hisApi.admitted })
  const { data: allAdmissions = [] } = useQuery({ queryKey:['all-admissions'], queryFn: hisApi.allAdmissions })
  const { data: patients = [] } = useQuery({ queryKey:['all-patients'], queryFn: adminApi.getPatients })
  const { data: doctors = [] } = useQuery({ queryKey:['admin-docs'], queryFn: adminApi.getDoctors })
  const { data: bedStats } = useQuery({ queryKey:['bed-stats'], queryFn: hisApi.bedStats })
  const { data: rates } = useQuery({ queryKey:['bed-rates'], queryFn: hisApi.bedRates })

  const [showAdmit, setShowAdmit] = useState(false)
  const [admSearch, setAdmSearch] = useState(''); const [admSearchRes, setAdmSearchRes] = useState<Patient[]>([])
  const [admForm, setAdmForm] = useState<Partial<Admission>>({})
  const [admErr, setAdmErr] = useState('')
  const [dischargeTarget, setDischargeTarget] = useState<Admission|null>(null)
  const [dischargeSummary, setDischargeSummary] = useState('')
  const [transferTarget, setTransferTarget] = useState<Admission|null>(null)
  const [transferForm, setTransferForm] = useState({bedType:'general',bedNumber:'',wardName:''})

  const refresh = () => { qc.invalidateQueries({queryKey:['admitted','all-admissions','bed-stats']}) }
  const patName = (id?:number) => (patients as Patient[]).find(p=>p.id===id)?.name ?? `#${id}`
  const docName = (id?:number) => (doctors as Doctor[]).find(d=>d.id===id)?.name ?? '—'
  const days = (from?:string) => !from?1:Math.max(1,Math.floor((Date.now()-new Date(from).getTime())/86400000))

  async function searchForAdmit() {
    const r = await hisApi.searchPatient(admSearch)
    setAdmSearchRes(r.results||[])
  }

  const admit = useMutation({ mutationFn: () => {
    if (!admForm.patientId||!admForm.bedType||!admForm.admissionDiagnosis) throw new Error('Patient, bed type and diagnosis are required')
    return hisApi.admit(admForm as Admission)
  }, onSuccess: () => { setShowAdmit(false); refresh() }, onError: (e:Error) => setAdmErr(e.message) })

  const discharge = useMutation({ mutationFn: () => {
    if (!dischargeSummary.trim()) throw new Error('Discharge summary is required')
    return hisApi.discharge(dischargeTarget!.id!, dischargeSummary)
  }, onSuccess: () => { setDischargeTarget(null); refresh() }, onError: (e:Error) => setAdmErr(e.message) })

  const transfer = useMutation({ mutationFn: () => hisApi.transfer(transferTarget!.id!, transferForm),
    onSuccess: () => { setTransferTarget(null); refresh() }, onError: (e:Error) => setAdmErr(e.message) })

  const bs = bedStats as {byType?:Record<string,number>}
  const ratesMap = rates as Record<string,number> ?? {}

  return (
    <>
      {bs && <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:10,marginBottom:18}}>
        {BED_TYPES.map(b=><div key={b.key} style={{background:'#fff',border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:12,textAlign:'center'}}>
          <div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',fontWeight:600,marginBottom:4}}>{b.label}</div>
          <div style={{fontSize:24,fontWeight:700,color:'var(--primary-dark)'}}>{bs.byType?.[b.key]??0}</div>
          <div style={{fontSize:10,color:'var(--text3)'}}>₹{ratesMap[b.key]?.toLocaleString()}/day</div>
        </div>)}
      </div>}

      <div className="card">
        <div className="card-header">
          <div><div className="card-title">IPD — Active Admissions ({(admitted as Admission[]).length})</div><div className="card-sub">Bed management: Admit · Transfer · Discharge</div></div>
          <button className="btn btn-primary" onClick={()=>{setAdmForm({});setAdmSearch('');setAdmSearchRes([]);setAdmErr('');setShowAdmit(true)}}>+ Admit Patient</button>
        </div>
        {(admitted as Admission[]).length===0 && <div style={{color:'var(--text3)',textAlign:'center',padding:30}}>No patients currently admitted.</div>}
        {(admitted as Admission[]).length>0 && <table>
          <thead><tr><th>UHID</th><th>Patient</th><th>Doctor</th><th>Bed/Ward</th><th>Since</th><th>Days</th><th>Est. Charges</th><th>Actions</th></tr></thead>
          <tbody>{(admitted as Admission[]).map(a=><tr key={a.id}>
            <td><span className="uhid-badge">{a.uhid}</span></td>
            <td><strong>{patName(a.patientId)}</strong></td>
            <td style={{fontSize:12}}>{docName(a.doctorId)}</td>
            <td><span className={`badge ${a.bedType==='general'?'badge-info':a.bedType==='icu'||a.bedType==='nicu'?'badge-danger':'badge-warning'}`}>{a.bedType}</span><div style={{fontSize:11,color:'var(--text3)'}}>{a.bedNumber} · {a.wardName}</div></td>
            <td style={{fontSize:12}}>{a.admissionDate}</td>
            <td><strong>{days(a.admissionDate)}</strong></td>
            <td>₹{(days(a.admissionDate)*(a.bedChargePerDay??0)).toLocaleString()}</td>
            <td>
              <button className="btn btn-outline btn-sm" onClick={()=>{setTransferTarget(a);setTransferForm({bedType:a.bedType,bedNumber:'',wardName:''});setAdmErr('')}}>Transfer</button>
              <button className="btn btn-danger btn-sm" style={{marginLeft:4}} onClick={()=>{setDischargeTarget(a);setDischargeSummary('');setAdmErr('')}}>Discharge</button>
            </td>
          </tr>)}</tbody>
        </table>}
      </div>

      <div className="card">
        <div className="card-header"><div className="card-title">Admission History ({(allAdmissions as Admission[]).length})</div></div>
        <table><thead><tr><th>UHID</th><th>Patient</th><th>Bed Type</th><th>Admitted</th><th>Discharged</th><th>Bed Charges</th><th>Status</th></tr></thead>
        <tbody>{(allAdmissions as Admission[]).map(a=><tr key={a.id}>
          <td><span className="uhid-badge">{a.uhid}</span></td>
          <td>{patName(a.patientId)}</td><td>{a.bedType}</td>
          <td style={{fontSize:12}}>{a.admissionDate}</td>
          <td style={{fontSize:12}}>{a.actualDischargeDate??'—'}</td>
          <td>{a.totalBedCharges?`₹${a.totalBedCharges.toLocaleString()}`:'—'}</td>
          <td><span className={`badge ${a.status==='admitted'?'badge-warning':a.status==='discharged'?'badge-success':'badge-info'}`}>{a.status}</span></td>
        </tr>)}</tbody></table>
      </div>

      {showAdmit && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setShowAdmit(false)}}>
        <div className="modal">
          <div className="modal-header"><div style={{fontWeight:600}}>Admit Patient to IPD</div><button className="btn btn-outline btn-sm" onClick={()=>setShowAdmit(false)}>✕</button></div>
          <div className="modal-body">
            <div className="field"><label>Search Patient (UHID / Name / Mobile)</label>
              <div style={{display:'flex',gap:8}}><input value={admSearch} onChange={e=>setAdmSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchForAdmit()} style={{flex:1}} /><button className="btn btn-outline" onClick={searchForAdmit}>Search</button></div>
            </div>
            {admSearchRes.map(p=><div key={p.id} style={{padding:10,border:`2px solid ${admForm.patientId===p.id?'var(--primary)':'var(--border)'}`,borderRadius:'var(--radius)',marginBottom:6,cursor:'pointer'}} onClick={()=>setAdmForm({...admForm,patientId:p.id!,uhid:p.uhid!,bedType:'general',paymentCategory:p.paymentCategory||'general'})}>
              <div className="uhid-badge">{p.uhid}</div><div>{p.name} · {p.age}y / {p.gender}</div>
            </div>)}
            {admForm.patientId && <div className="form-grid" style={{marginTop:14}}>
              <div className="field"><label>Admitting Doctor *</label><select value={admForm.doctorId??''} onChange={e=>setAdmForm({...admForm,doctorId:+e.target.value})}><option value="">-- Select --</option>{(doctors as Doctor[]).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
              <div className="field"><label>Bed Type *</label><select value={admForm.bedType??'general'} onChange={e=>setAdmForm({...admForm,bedType:e.target.value})}>{BED_TYPES.map(b=><option key={b.key} value={b.key}>{b.label} (₹{ratesMap[b.key]?.toLocaleString()}/day)</option>)}</select></div>
              <div className="field"><label>Bed Number</label><input value={admForm.bedNumber??''} onChange={e=>setAdmForm({...admForm,bedNumber:e.target.value})} placeholder="e.g. G-12" /></div>
              <div className="field"><label>Ward / Nursing Station</label><input value={admForm.wardName??''} onChange={e=>setAdmForm({...admForm,wardName:e.target.value})} placeholder="e.g. Floor-2-North" /></div>
              <div className="field form-full"><label>Admission Diagnosis *</label><textarea value={admForm.admissionDiagnosis??''} onChange={e=>setAdmForm({...admForm,admissionDiagnosis:e.target.value})} /></div>
              <div className="field"><label>Payment Category</label><select value={admForm.paymentCategory??'general'} onChange={e=>setAdmForm({...admForm,paymentCategory:e.target.value})}>{['general','cghs','esic','ayushman','insurance'].map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div className="field"><label>TPA / Insurance Auth No.</label><input value={admForm.insuranceAuthNumber??''} onChange={e=>setAdmForm({...admForm,insuranceAuthNumber:e.target.value})} /></div>
            </div>}
            {admErr && <div className="notif notif-danger" style={{marginTop:10}}>{admErr}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setShowAdmit(false)}>Cancel</button><button className="btn btn-primary" onClick={()=>admit.mutate()} disabled={admit.isPending}>Admit</button></div>
        </div>
      </div>}

      {dischargeTarget && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setDischargeTarget(null)}}>
        <div className="modal" style={{maxWidth:520}}>
          <div className="modal-header"><div style={{fontWeight:600}}>Discharge — {patName(dischargeTarget.patientId)}</div><button className="btn btn-outline btn-sm" onClick={()=>setDischargeTarget(null)}>✕</button></div>
          <div className="modal-body">
            <div className="notif notif-info">Days: <strong>{days(dischargeTarget.admissionDate)}</strong> · Estimated bed charges: <strong>₹{(days(dischargeTarget.admissionDate)*(dischargeTarget.bedChargePerDay??0)).toLocaleString()}</strong></div>
            <div className="field" style={{marginTop:14}}><label>Discharge Summary / Final Diagnosis *</label><textarea value={dischargeSummary} onChange={e=>setDischargeSummary(e.target.value)} rows={5} placeholder="Diagnosis, treatment given, follow-up instructions..." /></div>
            {admErr && <div className="notif notif-danger">{admErr}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setDischargeTarget(null)}>Cancel</button><button className="btn btn-danger" onClick={()=>discharge.mutate()} disabled={discharge.isPending}>Confirm Discharge</button></div>
        </div>
      </div>}

      {transferTarget && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setTransferTarget(null)}}>
        <div className="modal" style={{maxWidth:480}}>
          <div className="modal-header"><div style={{fontWeight:600}}>Transfer — {patName(transferTarget.patientId)}</div><button className="btn btn-outline btn-sm" onClick={()=>setTransferTarget(null)}>✕</button></div>
          <div className="modal-body">
            <div className="form-grid">
              <div className="field"><label>New Bed Type *</label><select value={transferForm.bedType} onChange={e=>setTransferForm({...transferForm,bedType:e.target.value})}>{BED_TYPES.map(b=><option key={b.key} value={b.key}>{b.label} (₹{ratesMap[b.key]?.toLocaleString()}/day)</option>)}</select></div>
              <div className="field"><label>New Bed Number</label><input value={transferForm.bedNumber} onChange={e=>setTransferForm({...transferForm,bedNumber:e.target.value})} /></div>
              <div className="field form-full"><label>New Ward</label><input value={transferForm.wardName} onChange={e=>setTransferForm({...transferForm,wardName:e.target.value})} /></div>
            </div>
            {admErr && <div className="notif notif-danger">{admErr}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setTransferTarget(null)}>Cancel</button><button className="btn btn-primary" onClick={()=>transfer.mutate()} disabled={transfer.isPending}>Confirm Transfer</button></div>
        </div>
      </div>}
    </>
  )
}
