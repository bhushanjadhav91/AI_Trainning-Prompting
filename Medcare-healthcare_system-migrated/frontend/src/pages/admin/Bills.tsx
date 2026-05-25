import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../../api'
import type { Bill, Patient, Doctor } from '../../types'

function empty(): Bill { return { patientId:0, description:'', billDate:new Date().toISOString().slice(0,10), consultationFee:0, medicineCost:0, labTestCost:0, otherCharges:0, insuranceCovered:0 } }

export default function AdminBills() {
  const qc = useQueryClient()
  const { data: bills = [] } = useQuery({ queryKey:['admin-bills'], queryFn: adminApi.allBills })
  const { data: patients = [] } = useQuery({ queryKey:['admin-patients'], queryFn: adminApi.getPatients })
  const { data: doctors = [] } = useQuery({ queryKey:['admin-docs'], queryFn: adminApi.getDoctors })
  const [viewing, setViewing] = useState<Bill|null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<Bill>(empty())
  const [createErr, setCreateErr] = useState('')

  const patName = (id:number) => patients.find((p:Patient) => p.id===id)?.name ?? `Patient #${id}`
  const pending = bills.filter((b:Bill) => b.status==='pending')
  const paid = bills.filter((b:Bill) => b.status==='paid')
  const outstanding = pending.reduce((s:number, b:Bill) => s+(b.amountPayable??0), 0)

  const totalPreview = (form.consultationFee||0)+(form.medicineCost||0)+(form.labTestCost||0)+(form.otherCharges||0)
  const payablePreview = Math.max(0, totalPreview-(form.insuranceCovered||0))

  const create = useMutation({ mutationFn: () => {
    if (!form.patientId || !form.description) throw new Error('Patient and description required')
    return adminApi.createBill(form)
  }, onSuccess: () => { qc.invalidateQueries({ queryKey:['admin-bills'] }); setShowCreate(false); setForm(empty()) },
  onError: (e:Error) => setCreateErr(e.message) })

  const f = (k: keyof Bill) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setForm({...form,[k]: ['patientId','doctorId','consultationFee','medicineCost','labTestCost','otherCharges','insuranceCovered'].includes(k) ? +e.target.value : e.target.value })

  return (
    <>
      <div className="stats-grid">
        {[{icon:'📄',val:bills.length,label:'Total Bills',bg:'var(--primary-light)',c:'var(--primary)'},
          {icon:'⏳',val:pending.length,label:'Pending',bg:'var(--amber-light)',c:'var(--amber)'},
          {icon:'✓',val:paid.length,label:'Paid',bg:'var(--emerald-light)',c:'var(--emerald)'},
          {icon:'💰',val:`₹${outstanding.toLocaleString()}`,label:'Outstanding',bg:'var(--red-light)',c:'var(--red)'}
        ].map(s => <div key={s.label} className="stat-card"><div className="stat-icon" style={{background:s.bg,color:s.c}}>{s.icon}</div><div className="stat-value">{s.val}</div><div className="stat-label">{s.label}</div></div>)}
      </div>
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">All Bills</div><div className="card-sub">Create bills, track payments.</div></div>
          <button className="btn btn-primary" onClick={() => { setForm(empty()); setCreateErr(''); setShowCreate(true) }}>+ Create Bill</button>
        </div>
        <table>
          <thead><tr><th>Invoice</th><th>Patient</th><th>Date</th><th>Total</th><th>Insurance</th><th>Payable</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{bills.map((b:Bill) => (
            <tr key={b.id}>
              <td><strong>{b.invoiceNumber}</strong></td>
              <td>{patName(b.patientId)}</td>
              <td style={{fontSize:12}}>{b.billDate}</td>
              <td>₹{b.totalAmount?.toLocaleString()}</td>
              <td style={{color:'var(--emerald)'}}>₹{b.insuranceCovered.toLocaleString()}</td>
              <td><strong>₹{b.amountPayable?.toLocaleString()}</strong></td>
              <td><span className={`badge ${b.status==='paid'?'badge-success':'badge-warning'}`}>{b.status}</span></td>
              <td><button className="btn btn-outline btn-sm" onClick={() => setViewing(b)}>View</button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      {viewing && (
        <div className="overlay" onClick={e => { if ((e.target as HTMLElement).classList.contains('overlay')) setViewing(null) }}>
          <div className="modal" style={{maxWidth:520}}>
            <div className="modal-header"><div style={{fontWeight:600}}>Invoice {viewing.invoiceNumber}</div><button className="btn btn-outline btn-sm" onClick={()=>setViewing(null)}>✕</button></div>
            <div className="modal-body">
              <div className="grid-2" style={{marginBottom:12,fontSize:13}}>
                <div><span className="lbl">Patient:</span> <strong>{patName(viewing.patientId)}</strong></div>
                <div><span className="lbl">Date:</span> {viewing.billDate}</div>
                <div style={{gridColumn:'1/-1'}}><span className="lbl">Description:</span> {viewing.description}</div>
              </div>
              <table style={{margin:0}}>
                <tbody>
                  <tr><td>Consultation Fee</td><td style={{textAlign:'right'}}>₹{viewing.consultationFee.toLocaleString()}</td></tr>
                  <tr><td>Medicines</td><td style={{textAlign:'right'}}>₹{viewing.medicineCost.toLocaleString()}</td></tr>
                  <tr><td>Lab Tests</td><td style={{textAlign:'right'}}>₹{viewing.labTestCost.toLocaleString()}</td></tr>
                  <tr><td>Other</td><td style={{textAlign:'right'}}>₹{viewing.otherCharges.toLocaleString()}</td></tr>
                  <tr><td><strong>Subtotal</strong></td><td style={{textAlign:'right'}}><strong>₹{viewing.totalAmount?.toLocaleString()}</strong></td></tr>
                  <tr style={{color:'var(--emerald)'}}><td>Insurance</td><td style={{textAlign:'right'}}>−₹{viewing.insuranceCovered.toLocaleString()}</td></tr>
                  <tr style={{fontSize:16}}><td><strong>Payable</strong></td><td style={{textAlign:'right'}}><strong>₹{viewing.amountPayable?.toLocaleString()}</strong></td></tr>
                </tbody>
              </table>
              {viewing.status==='paid' && <div className="notif notif-success" style={{marginTop:14}}>✓ Paid via {viewing.paymentMethod} on {viewing.paymentDate} · Txn: {viewing.transactionRef}</div>}
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setViewing(null)}>Close</button></div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="overlay" onClick={e => { if ((e.target as HTMLElement).classList.contains('overlay')) setShowCreate(false) }}>
          <div className="modal">
            <div className="modal-header"><div style={{fontWeight:600}}>Create New Bill</div><button className="btn btn-outline btn-sm" onClick={()=>setShowCreate(false)}>✕</button></div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field"><label>Patient *</label><select value={form.patientId} onChange={f('patientId')}><option value={0}>-- Select --</option>{patients.map((p:Patient)=><option key={p.id} value={p.id}>{p.name} ({p.id})</option>)}</select></div>
                <div className="field"><label>Doctor</label><select value={form.doctorId??''} onChange={f('doctorId')}><option value="">-- None --</option>{doctors.map((d:Doctor)=><option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                <div className="field form-full"><label>Description *</label><input value={form.description} onChange={f('description')} placeholder="e.g. Consultation + ECG" /></div>
                <div className="field"><label>Bill Date</label><input type="date" value={form.billDate??''} onChange={f('billDate')} /></div>
                <div className="field"><label>Consultation Fee (₹)</label><input type="number" value={form.consultationFee} onChange={f('consultationFee')} /></div>
                <div className="field"><label>Medicines (₹)</label><input type="number" value={form.medicineCost} onChange={f('medicineCost')} /></div>
                <div className="field"><label>Lab Tests (₹)</label><input type="number" value={form.labTestCost} onChange={f('labTestCost')} /></div>
                <div className="field"><label>Other Charges (₹)</label><input type="number" value={form.otherCharges} onChange={f('otherCharges')} /></div>
                <div className="field"><label>Insurance Covered (₹)</label><input type="number" value={form.insuranceCovered} onChange={f('insuranceCovered')} /></div>
              </div>
              {createErr && <div className="notif notif-danger" style={{marginTop:10}}>{createErr}</div>}
              <div className="notif notif-info" style={{marginTop:10}}>Total: <strong>₹{totalPreview.toLocaleString()}</strong> · Payable: <strong>₹{payablePreview.toLocaleString()}</strong></div>
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setShowCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={()=>create.mutate()} disabled={create.isPending}>Create Bill</button></div>
          </div>
        </div>
      )}
    </>
  )
}
