import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { doctorApi } from '../../api'
import type { Prescription, Patient } from '../../types'
import { useAuthStore } from '../../store/authStore'

interface MedRow { name:string; dosage:string; duration:string }

export default function DoctorPrescriptions() {
  const qc = useQueryClient()
  const { getUserId } = useAuthStore()
  const { data: prescriptions = [] } = useQuery({ queryKey:['doc-rx'], queryFn: doctorApi.myPrescriptions })
  const { data: patients = [] } = useQuery({ queryKey:['doc-patients'], queryFn: doctorApi.myPatients })
  const [showForm, setShowForm] = useState(false)
  const [searchQ, setSearchQ] = useState(''); const [filteredPats, setFilteredPats] = useState<Patient[]>([])
  const [selectedPat, setSelectedPat] = useState<Patient|null>(null)
  const [medRows, setMedRows] = useState<MedRow[]>([{name:'',dosage:'',duration:'7 days'}])
  const [form, setForm] = useState({tests:'',diet:'',notes:''})
  const [formErr, setFormErr] = useState(''); const [formOk, setFormOk] = useState('')

  const patName = (id:number) => patients.find((p:Patient) => p.id===id)?.name ?? `Patient #${id}`

  function filterPats(q:string) {
    setSearchQ(q)
    setFilteredPats(!q.trim() ? [] : patients.filter((p:Patient) => p.name.toLowerCase().includes(q.toLowerCase())||(p.contact??'').includes(q)).slice(0,8))
  }

  const submit = useMutation({ mutationFn: () => {
    if (!selectedPat) throw new Error('Please select a patient')
    if (medRows.some(r => !r.name.trim())) throw new Error('All medicines must have a name')
    if (medRows.some(r => !r.dosage.trim())) throw new Error('All medicines must have a dosage')
    const p: Prescription = {
      patientId: selectedPat.id!, doctorId: getUserId(),
      medicines: medRows.map(r => r.name.trim()).join('\n'),
      dosage: medRows.map(r => r.name.trim()+': '+r.dosage.trim()).join('\n'),
      duration: medRows.map(r => r.name.trim()+': '+(r.duration||'as directed')).join('\n'),
      tests: form.tests, diet: form.diet, notes: form.notes,
    }
    return doctorApi.createPrescription(p)
  }, onSuccess: (rx) => {
    setFormOk(`✅ Prescription Rx #${rx.id} issued for ${selectedPat?.name}!`)
    qc.invalidateQueries({queryKey:['doc-rx']})
    setTimeout(() => setShowForm(false), 1500)
  }, onError: (e:Error) => setFormErr(e.message) })

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Prescriptions ({prescriptions.length})</div><div className="card-sub">Write multi-medicine prescriptions for your patients.</div></div>
          <button className="btn btn-primary" onClick={() => { setSelectedPat(null); setSearchQ(''); setFilteredPats([]); setMedRows([{name:'',dosage:'',duration:'7 days'}]); setForm({tests:'',diet:'',notes:''}); setFormErr(''); setFormOk(''); setShowForm(true) }}>+ Write Prescription</button>
        </div>
        {prescriptions.length===0 && <div style={{color:'var(--text3)',textAlign:'center',padding:30}}>No prescriptions issued yet.</div>}
        {prescriptions.map((r:Prescription) => (
          <div key={r.id} style={{border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:16,marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div><strong>{patName(r.patientId)}</strong><span className="badge badge-info" style={{marginLeft:8}}>Rx #{r.id}</span></div>
              <span style={{fontSize:12,color:'var(--text3)'}}>{r.date}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,fontSize:13}}>
              <div><div style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4}}>MEDICINES</div><div style={{whiteSpace:'pre-wrap'}}>{r.medicines}</div><div style={{color:'var(--text3)',fontSize:12,marginTop:4}}>{r.dosage}</div><div style={{fontSize:12,color:'var(--primary)'}}>{r.duration}</div></div>
              <div><div style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4}}>INVESTIGATIONS</div><div>{r.tests||'—'}</div><div style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginTop:8,marginBottom:4}}>DIET</div><div style={{fontSize:12}}>{r.diet||'—'}</div></div>
            </div>
            {r.notes && <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid var(--border)',fontSize:12,color:'var(--text3)'}}>📋 {r.notes}</div>}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="overlay" onClick={e => { if((e.target as HTMLElement).classList.contains('overlay')) setShowForm(false) }}>
          <div className="modal" style={{maxWidth:680}}>
            <div className="modal-header"><div style={{fontWeight:600}}>Write Prescription</div><button className="btn btn-outline btn-sm" onClick={() => setShowForm(false)}>✕</button></div>
            <div className="modal-body">
              <div className="field">
                <label>Patient *</label>
                <input value={searchQ} onChange={e => filterPats(e.target.value)} placeholder="Type patient name to search…" />
                {filteredPats.length > 0 && <div style={{border:'1px solid var(--border)',borderRadius:'var(--radius)',maxHeight:150,overflowY:'auto',marginTop:4}}>
                  {filteredPats.map((p:Patient) => <div key={p.id} style={{padding:'8px 12px',cursor:'pointer',fontSize:13,background:selectedPat?.id===p.id?'var(--primary-light)':'#fff'}} onClick={() => { setSelectedPat(p); setSearchQ(p.name); setFilteredPats([]) }}>
                    {p.name} — {p.contact}{p.allergies&&p.allergies!=='None'&&<span style={{color:'var(--red)'}}> ⚠ {p.allergies}</span>}
                  </div>)}
                </div>}
                {selectedPat && <div className="notif notif-info" style={{marginTop:8,fontSize:12}}><strong>{selectedPat.name}</strong> · {selectedPat.age}y · {selectedPat.bloodGroup}{selectedPat.allergies&&selectedPat.allergies!=='None'&&<span style={{color:'var(--red)'}}> · ⚠ {selectedPat.allergies}</span>}</div>}
              </div>
              <div style={{marginTop:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><div style={{fontWeight:600,fontSize:13}}>Medicines</div><button className="btn btn-outline btn-sm" onClick={() => setMedRows([...medRows,{name:'',dosage:'',duration:'7 days'}])}>+ Add Medicine</button></div>
                <table><thead><tr><th>Medicine Name *</th><th>Dosage / Frequency *</th><th>Duration</th><th></th></tr></thead>
                <tbody>{medRows.map((m,i) => <tr key={i}>
                  <td><input value={m.name} onChange={e => { const r=[...medRows]; r[i]={...r[i],name:e.target.value}; setMedRows(r) }} placeholder="e.g. Paracetamol 500mg" style={{width:'100%',padding:5,border:'1px solid var(--border)',borderRadius:6}} /></td>
                  <td><input value={m.dosage} onChange={e => { const r=[...medRows]; r[i]={...r[i],dosage:e.target.value}; setMedRows(r) }} placeholder="e.g. TDS after food" style={{width:'100%',padding:5,border:'1px solid var(--border)',borderRadius:6}} /></td>
                  <td><input value={m.duration} onChange={e => { const r=[...medRows]; r[i]={...r[i],duration:e.target.value}; setMedRows(r) }} placeholder="e.g. 7 days" style={{width:'100%',padding:5,border:'1px solid var(--border)',borderRadius:6}} /></td>
                  <td>{medRows.length>1 && <button className="btn btn-danger btn-sm" onClick={() => setMedRows(medRows.filter((_,j)=>j!==i))}>✕</button>}</td>
                </tr>)}</tbody></table>
              </div>
              <div className="form-grid" style={{marginTop:14}}>
                <div className="field form-full"><label>Investigations / Tests</label><input value={form.tests} onChange={e => setForm({...form,tests:e.target.value})} placeholder="e.g. CBC, HbA1c" /></div>
                <div className="field form-full"><label>Diet & Lifestyle Advice</label><input value={form.diet} onChange={e => setForm({...form,diet:e.target.value})} placeholder="e.g. Low salt diet" /></div>
                <div className="field form-full"><label>Notes / Follow-up</label><textarea value={form.notes} onChange={e => setForm({...form,notes:e.target.value})} rows={2} placeholder="e.g. Follow up after 2 weeks" /></div>
              </div>
              {formErr && <div className="notif notif-danger" style={{marginTop:10}}>{formErr}</div>}
              {formOk && <div className="notif notif-success" style={{marginTop:10}}>{formOk}</div>}
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button><button className="btn btn-primary" onClick={() => { setFormErr(''); submit.mutate() }} disabled={submit.isPending}>{submit.isPending?'Saving…':'💊 Issue Prescription'}</button></div>
          </div>
        </div>
      )}
    </>
  )
}
