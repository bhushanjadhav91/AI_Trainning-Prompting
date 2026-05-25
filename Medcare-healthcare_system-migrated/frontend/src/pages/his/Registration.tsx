import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { hisApi, adminApi } from '../../api'
import type { Patient, Doctor, Registration } from '../../types'

export default function HisRegistration() {
  const qc = useQueryClient()
  const { data: patients = [] } = useQuery({ queryKey:['all-patients'], queryFn: adminApi.getPatients })
  const { data: doctors = [] } = useQuery({ queryKey:['admin-docs'], queryFn: adminApi.getDoctors })
  const { data: stats } = useQuery({ queryKey:['today-stats'], queryFn: hisApi.todayStats })
  const { data: queue = [] } = useQuery({ queryKey:['reg-queue'], queryFn: hisApi.registrations })

  const [searchQ, setSearchQ] = useState(''); const [searchRes, setSearchRes] = useState<Patient[]>([]); const [searching, setSearching] = useState(false); const [searched, setSearched] = useState(false)
  const [selectedPat, setSelectedPat] = useState<Patient|null>(null)
  const [showReg, setShowReg] = useState(false)
  const [regForm, setRegForm] = useState<Partial<Registration>>({})
  const [regErr, setRegErr] = useState(''); const [saving, setSaving] = useState(false)
  const [showNewPat, setShowNewPat] = useState(false)
  const [np, setNp] = useState<Partial<Patient>>({name:'',contact:'',age:0,gender:'Male',bloodGroup:'O+',allergies:'None',paymentCategory:'general',nationality:'Indian'})
  const [npErr, setNpErr] = useState(''); const [savingNew, setSavingNew] = useState(false)
  const [slipReg, setSlipReg] = useState<Registration|null>(null)

  const activeDoctors = (doctors as Doctor[]).filter(d => d.accountStatus==='active')
  const patName = (id:number) => (patients as Patient[]).find(p=>p.id===id)?.name ?? `Patient #${id}`
  const docName = (id:number) => (doctors as Doctor[]).find(d=>d.id===id)?.name ?? `Doctor #${id}`

  async function search() {
    if (!searchQ.trim()) return
    setSearching(true); setSearched(false)
    try { const r = await hisApi.searchPatient(searchQ.trim()); setSearchRes(r.results||[]); setSearched(true) }
    catch { setSearched(true) } finally { setSearching(false) }
  }

  function openReg() {
    if (!selectedPat) return
    setRegForm({patientId:selectedPat.id!,uhid:selectedPat.uhid!,doctorId:0,arrivalType:'walkin',paymentCategory:selectedPat.paymentCategory||'general',registrationFee:100,paymentMethod:'cash'})
    setRegErr(''); setShowReg(true)
  }

  async function submitReg() {
    if (!regForm.doctorId) { setRegErr('Please select a doctor'); return }
    setSaving(true)
    try { const r = await hisApi.createRegistration(regForm as Registration); setShowReg(false); setSlipReg(r); qc.invalidateQueries({queryKey:['reg-queue','today-stats']}) }
    catch (e:unknown) { setRegErr((e as {response?:{data?:{error?:string}}})?.response?.data?.error??'Failed') }
    finally { setSaving(false) }
  }

  async function registerNewPatient() {
    if (!np.name||!np.contact||!np.age) { setNpErr('Name, mobile and age are required'); return }
    setSavingNew(true)
    try {
      // use doctor register endpoint via api
      const res = await fetch('/api/doctor/patients/register',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${sessionStorage.getItem('token')}`},body:JSON.stringify(np)})
      const saved = await res.json() as Patient
      setSelectedPat(saved); setSearchRes([saved]); setShowNewPat(false)
      qc.invalidateQueries({queryKey:['all-patients']})
    } catch (e:unknown) { setNpErr((e as {response?:{data?:{error?:string}}})?.response?.data?.error??'Registration failed') }
    finally { setSavingNew(false) }
  }

  async function updateStatus(r:Registration, status:string) {
    await hisApi.updateRegStatus(r.id!, status)
    qc.invalidateQueries({queryKey:['reg-queue','today-stats']})
  }

  const s = stats as {total?:number;waiting?:number;done?:number;revenue?:number}

  return (
    <>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:18}}>
        {[{icon:'📋',val:s?.total??0,label:"Today's Registrations",bg:'#e0f2fe',c:'#0284c7'},
          {icon:'⏳',val:s?.waiting??0,label:'Waiting',bg:'#fef9c3',c:'#ca8a04'},
          {icon:'✓',val:s?.done??0,label:'Completed',bg:'#dcfce7',c:'#16a34a'},
          {icon:'₹',val:`₹${(s?.revenue??0).toLocaleString()}`,label:"Today's Revenue",bg:'#ede9fe',c:'#7c3aed'}
        ].map(x=><div key={x.label} className="stat-card"><div className="stat-icon" style={{background:x.bg,color:x.c}}>{x.icon}</div><div className="stat-value">{x.val}</div><div className="stat-label">{x.label}</div></div>)}
      </div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18}}>
        <div className="card" style={{margin:0}}>
          <div className="card-header"><div className="card-title">🔍 Patient Lookup</div><button className="btn btn-primary btn-sm" onClick={()=>{setNp({name:'',contact:'',age:0,gender:'Male',bloodGroup:'O+',allergies:'None',paymentCategory:'general',nationality:'Indian'});setNpErr('');setShowNewPat(true)}}>+ New Patient</button></div>
          <div className="field"><label>Search by UHID / Mobile / Name / Aadhaar / ABHA</label>
            <div style={{display:'flex',gap:8}}>
              <input value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&search()} placeholder="e.g. MED2024001234" style={{flex:1}} />
              <button className="btn btn-outline" onClick={search} disabled={searching}>{searching?'...':'Search'}</button>
            </div>
          </div>
          {searched && searchRes.length===0 && <div className="notif notif-warning">No patient found. Register as new patient.</div>}
          {searchRes.map(p=>(
            <div key={p.id} style={{padding:12,border:`2px solid ${selectedPat?.id===p.id?'var(--primary)':'var(--border)'}`,borderRadius:'var(--radius)',marginBottom:8,cursor:'pointer',background:selectedPat?.id===p.id?'var(--primary-light)':'#fff'}} onClick={()=>setSelectedPat(p)}>
              <div className="uhid-badge">{p.uhid}</div>
              <div style={{fontWeight:600,marginTop:4}}>{p.name}</div>
              <div style={{fontSize:12,color:'var(--text3)'}}>{p.age}y · {p.gender} · {p.contact}{p.bloodGroup&&<span className="badge badge-danger" style={{marginLeft:4}}>{p.bloodGroup}</span>}</div>
              {p.allergies&&p.allergies!=='None'&&<div style={{fontSize:11,color:'var(--red)'}}>⚠ {p.allergies}</div>}
            </div>
          ))}
          {selectedPat && <div style={{marginTop:12,padding:14,background:'var(--surface2)',borderRadius:'var(--radius)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div style={{fontWeight:600}}>Selected: {selectedPat.name}</div>
              <div className="uhid-badge">{selectedPat.uhid}</div>
            </div>
            <button className="btn btn-primary" style={{width:'100%',justifyContent:'center',marginTop:8}} onClick={openReg}>📝 Register for OPD Visit</button>
          </div>}
        </div>
        <div className="card" style={{margin:0}}>
          <div className="card-header"><div className="card-title">🗓 Today's OPD Queue</div><button className="btn btn-outline btn-sm" onClick={()=>qc.invalidateQueries({queryKey:['reg-queue']})}>Refresh</button></div>
          {(queue as Registration[]).length===0 && <div style={{color:'var(--text3)',textAlign:'center',padding:20}}>No registrations today.</div>}
          {(queue as Registration[]).map(r=>(
            <div key={r.id} style={{display:'flex',alignItems:'center',gap:10,padding:10,border:'1px solid var(--border)',borderRadius:'var(--radius)',marginBottom:6,background:r.status==='done'?'var(--surface2)':r.status==='called'?'#fef9c3':'#fff'}}>
              <div style={{minWidth:80,padding:'4px 8px',background:r.status==='done'?'var(--emerald)':'var(--primary)',color:'#fff',borderRadius:8,textAlign:'center',fontWeight:700,fontSize:13}}>{r.token}</div>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontWeight:600,fontSize:13}}>{patName(r.patientId)}</div>
                <div style={{fontSize:11,color:'var(--text3)'}}>Est. {r.estimatedTime} · {r.arrivalType} · {docName(r.doctorId)}</div>
              </div>
              <div style={{display:'flex',flexDirection:'column',gap:4,alignItems:'flex-end'}}>
                <span className={`badge ${r.status==='waiting'?'badge-warning':r.status==='called'?'badge-info':'badge-success'}`}>{r.status}</span>
                <div style={{display:'flex',gap:4}}>
                  {r.status==='waiting' && <button className="btn btn-outline btn-sm" onClick={()=>updateStatus(r,'called')}>Call</button>}
                  {r.status!=='done' && <button className="btn btn-success btn-sm" onClick={()=>updateStatus(r,'done')}>Done</button>}
                  <button className="btn btn-outline btn-sm" onClick={()=>setSlipReg(r)}>Slip</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showReg && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setShowReg(false)}}>
        <div className="modal" style={{maxWidth:540}}>
          <div className="modal-header"><div style={{fontWeight:600}}>OPD Registration<div style={{fontSize:12,color:'var(--text3)'}}>{selectedPat?.name} · {selectedPat?.uhid}</div></div><button className="btn btn-outline btn-sm" onClick={()=>setShowReg(false)}>✕</button></div>
          <div className="modal-body">
            <div className="form-grid">
              <div className="field"><label>Doctor *</label><select value={regForm.doctorId??0} onChange={e=>setRegForm({...regForm,doctorId:+e.target.value})}><option value={0}>-- Select Doctor --</option>{activeDoctors.map(d=><option key={d.id} value={d.id}>{d.name} — {d.specialization}</option>)}</select></div>
              <div className="field"><label>Arrival Type</label><select value={regForm.arrivalType??'walkin'} onChange={e=>setRegForm({...regForm,arrivalType:e.target.value})}><option value="walkin">Walk-in</option><option value="appointment">Appointment</option><option value="emergency">Emergency</option><option value="reference">Reference</option></select></div>
              <div className="field"><label>Payment Category</label><select value={regForm.paymentCategory??'general'} onChange={e=>setRegForm({...regForm,paymentCategory:e.target.value})}>{['general','cghs','esic','ayushman','insurance'].map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div className="field"><label>Registration Fee (₹)</label><input type="number" value={regForm.registrationFee??100} onChange={e=>setRegForm({...regForm,registrationFee:+e.target.value})} /></div>
              <div className="field"><label>Payment Method</label><select value={regForm.paymentMethod??'cash'} onChange={e=>setRegForm({...regForm,paymentMethod:e.target.value})}><option value="cash">Cash</option><option value="card">Card</option><option value="upi">UPI</option><option value="waived">Waived</option></select></div>
              <div className="field form-full"><label>Notes</label><input value={regForm.notes??''} onChange={e=>setRegForm({...regForm,notes:e.target.value})} placeholder="Referral details, special instructions..." /></div>
            </div>
            {regErr && <div className="notif notif-danger" style={{marginTop:10}}>{regErr}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setShowReg(false)}>Cancel</button><button className="btn btn-primary" onClick={submitReg} disabled={saving}>{saving?'Registering...':'Generate Token & Slip'}</button></div>
        </div>
      </div>}

      {showNewPat && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setShowNewPat(false)}}>
        <div className="modal" style={{maxWidth:680}}>
          <div className="modal-header"><div style={{fontWeight:600}}>New Patient Registration</div><button className="btn btn-outline btn-sm" onClick={()=>setShowNewPat(false)}>✕</button></div>
          <div className="modal-body">
            <div className="notif notif-info" style={{marginBottom:14}}>A UHID will be auto-generated for this patient.</div>
            <div className="form-grid">
              {([['name','Full Name *'],['contact','Mobile *'],['age','Age *'],['gender','Gender *'],['bloodGroup','Blood Group'],['aadhaarNo','Aadhaar No.'],['abhaNo','ABHA No.'],['allergies','Allergies'],['emergencyContactName','Emergency Contact Name'],['emergencyContactPhone','Emergency Contact Phone'],['occupation','Occupation']] as [keyof Patient,string][]).map(([k,l])=>(
                <div key={k} className="field"><label>{l}</label>
                  {k==='gender'?<select value={(np as Record<string,unknown>)[k] as string??'Male'} onChange={e=>setNp({...np,[k]:e.target.value})}><option>Male</option><option>Female</option><option>Other</option></select>
                  :k==='bloodGroup'?<select value={(np as Record<string,unknown>)[k] as string??'O+'} onChange={e=>setNp({...np,[k]:e.target.value})}>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(b=><option key={b}>{b}</option>)}</select>
                  :<input type={k==='age'?'number':'text'} value={(np as Record<string,unknown>)[k] as string??''} onChange={e=>setNp({...np,[k]:k==='age'?+e.target.value:e.target.value})} />}
                </div>
              ))}
              <div className="field form-full"><label>Address</label><input value={np.address??''} onChange={e=>setNp({...np,address:e.target.value})} /></div>
            </div>
            {npErr && <div className="notif notif-danger" style={{marginTop:10}}>{npErr}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setShowNewPat(false)}>Cancel</button><button className="btn btn-primary" onClick={registerNewPatient} disabled={savingNew}>{savingNew?'Registering...':'Register & Assign UHID'}</button></div>
        </div>
      </div>}

      {slipReg && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setSlipReg(null)}}>
        <div className="modal" style={{maxWidth:420}}>
          <div className="modal-header"><div style={{fontWeight:600}}>Registration Slip</div><button className="btn btn-outline btn-sm" onClick={()=>setSlipReg(null)}>✕</button></div>
          <div style={{padding:'0 24px 16px'}}>
            <div style={{textAlign:'center',padding:'8px 0 12px',borderBottom:'2px dashed var(--border)'}}>
              <div style={{fontSize:22,fontWeight:700,color:'var(--primary-dark)'}}>MedCare+</div>
              <div style={{fontSize:11,color:'var(--text3)'}}>OPD Registration Slip</div>
            </div>
            {[['UHID',slipReg.uhid],['Token',slipReg.token],['Patient',patName(slipReg.patientId)],['Doctor',docName(slipReg.doctorId)],['Est. Time',slipReg.estimatedTime],['Date',slipReg.registrationDateTime?.split('T')[0]],['Category',(slipReg.paymentCategory??'').toUpperCase()],['Fee Paid',`₹${slipReg.registrationFee} (${slipReg.paymentMethod})`]].map(([l,v])=>(
              <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid var(--border)',fontSize:13}}><span style={{color:'var(--text3)'}}>{l}</span><strong>{v}</strong></div>
            ))}
            <div style={{textAlign:'center',margin:'14px 0 0',padding:10,background:'var(--surface2)',borderRadius:8,fontFamily:'monospace',fontSize:10,wordBreak:'break-all'}}>{slipReg.qrData}</div>
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setSlipReg(null)}>Close</button><button className="btn btn-primary" onClick={()=>window.print()}>🖨 Print</button></div>
        </div>
      </div>}
    </>
  )
}
