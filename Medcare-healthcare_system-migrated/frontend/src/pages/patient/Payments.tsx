import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { patientApi } from '../../api'
import type { Bill, Insurance } from '../../types'

export default function PatientPayments() {
  const qc = useQueryClient()
  const { data: charges } = useQuery({ queryKey:['pat-charges'], queryFn: patientApi.charges })
  const { data: insData } = useQuery({ queryKey:['pat-insurance'], queryFn: patientApi.insurance })
  const [activeTab, setActiveTab] = useState('bills')
  const [viewing, setViewing] = useState<Bill|null>(null)
  const [payTarget, setPayTarget] = useState<Bill|null>(null)
  const [payMethod, setPayMethod] = useState('upi'); const [txnRef, setTxnRef] = useState(''); const [payErr, setPayErr] = useState('')
  const [showIns, setShowIns] = useState(false)
  const [insForm, setInsForm] = useState<Insurance>({patientId:0,providerName:'',policyNumber:'',policyHolderName:'',validFrom:'',validTo:'',sumInsured:0,amountUsed:0,coverageType:'individual',contactNumber:'',tpaName:''})
  const [insErr, setInsErr] = useState('')

  const insurance = (insData as {hasInsurance?:boolean}&Insurance)?.hasInsurance===false ? null : insData as Insurance|null
  const bills = (charges as {bills?:Bill[]})?.bills ?? []
  const labCharges = (charges as {labCharges?:unknown[]})?.labCharges ?? []
  const radCharges = (charges as {radiologyCharges?:unknown[]})?.radiologyCharges ?? []
  const pharmaCharges = (charges as {pharmacyCharges?:unknown[]})?.pharmacyCharges ?? []
  const ipdCharges = (charges as {ipdCharges?:unknown[]})?.ipdCharges ?? []
  const summary = (charges as {summary?:{grandTotal?:number;outstanding?:number;paid?:number}})?.summary

  const doPay = useMutation({ mutationFn: () => patientApi.payBill(payTarget!.id!, payMethod, txnRef||`TXN-${Date.now()}`),
    onSuccess: () => { setPayTarget(null); qc.invalidateQueries({queryKey:['pat-charges']}) },
    onError: (e:Error) => setPayErr((e as {response?:{data?:{error?:string}}})?.response?.data?.error ?? e.message) })

  const saveIns = useMutation({ mutationFn: () => {
    if (!insForm.providerName||!insForm.policyNumber||!insForm.policyHolderName||!insForm.validFrom||!insForm.validTo) throw new Error('All starred fields required')
    return patientApi.saveInsurance(insForm)
  }, onSuccess: () => { setShowIns(false); qc.invalidateQueries({queryKey:['pat-insurance']}) }, onError: (e:Error) => setInsErr(e.message) })

  const f = (k:keyof Insurance) => (e:React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
    setInsForm({...insForm,[k]:['sumInsured','amountUsed'].includes(k)?+e.target.value:e.target.value})

  interface ChargeRow { id?:number; description:string; date:string; amount:number; status?:string; discharged?:string }

  const BillsTable = () => <>
    {bills.length===0 ? <div style={{color:'var(--text3)',textAlign:'center',padding:30}}>No consultation bills.</div> :
      <table><thead><tr><th>Invoice</th><th>Date</th><th>Description</th><th>Total</th><th>Insurance</th><th>Payable</th><th>Status</th><th>Action</th></tr></thead>
      <tbody>{bills.map((b:Bill)=><tr key={b.id}>
        <td><strong>{b.invoiceNumber}</strong></td><td style={{fontSize:12}}>{b.billDate}</td>
        <td style={{fontSize:12,maxWidth:180}}>{b.description}</td>
        <td>₹{b.totalAmount?.toLocaleString()}</td>
        <td style={{color:'var(--emerald)'}}>₹{b.insuranceCovered.toLocaleString()}</td>
        <td><strong>₹{b.amountPayable?.toLocaleString()}</strong></td>
        <td><span className={`badge ${b.status==='paid'?'badge-success':'badge-warning'}`}>{b.status}</span></td>
        <td>
          <button className="btn btn-outline btn-sm" onClick={()=>setViewing(b)}>View</button>
          {b.status==='pending' && <button className="btn btn-primary btn-sm" style={{marginLeft:4}} onClick={()=>{setPayTarget(b);setPayMethod('upi');setTxnRef('');setPayErr('')}}>Pay</button>}
        </td>
      </tr>)}</tbody></table>}
  </>

  const ChargesTable = ({rows,label,total,statusFn}:{rows:unknown[];label:string;total?:number;statusFn:(r:ChargeRow)=>string}) => <>
    {rows.length===0 ? <div style={{color:'var(--text3)',textAlign:'center',padding:30}}>No {label} charges.</div> :
      <table><thead><tr><th>Item</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
      <tbody>
        {(rows as ChargeRow[]).map((c,i)=><tr key={i}><td><strong>{c.description}</strong></td><td style={{fontSize:12}}>{c.date}</td><td>₹{c.amount?.toLocaleString()}</td><td><span className={`badge ${statusFn(c)}`}>{c.status}</span></td></tr>)}
        {total!==undefined && <tr style={{background:'var(--surface2)'}}><td colSpan={2}><strong>Total</strong></td><td><strong>₹{total?.toLocaleString()}</strong></td><td></td></tr>}
      </tbody></table>}
  </>

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Insurance Coverage</div>
            {insurance ? <div className="card-sub">{insurance.providerName} — Policy {insurance.policyNumber}</div>
            : <div className="card-sub">No insurance on file</div>}
          </div>
          <button className="btn btn-outline" onClick={()=>{setInsForm(insurance?{...insurance}:{patientId:0,providerName:'',policyNumber:'',policyHolderName:'',validFrom:'',validTo:'',sumInsured:0,amountUsed:0,coverageType:'individual',contactNumber:'',tpaName:''}); setInsErr(''); setShowIns(true)}}>{insurance?'Update':'+ Add Insurance'}</button>
        </div>
        {insurance && <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          {[{l:'Sum Insured',v:`₹${insurance.sumInsured.toLocaleString()}`,c:''},
            {l:'Used',v:`₹${insurance.amountUsed.toLocaleString()}`,c:'var(--amber)'},
            {l:'Available',v:`₹${(insurance.sumInsured-insurance.amountUsed).toLocaleString()}`,c:'var(--emerald)'},
            {l:'Valid Till',v:insurance.validTo,c:''}
          ].map(i=><div key={i.l} style={{padding:12,background:'var(--surface2)',borderRadius:'var(--radius)'}}><div style={{fontSize:11,color:'var(--text3)',textTransform:'uppercase',fontWeight:600,marginBottom:4}}>{i.l}</div><div style={{fontSize:18,fontWeight:600,color:i.c||'inherit'}}>{i.v}</div></div>)}
        </div>}
      </div>

      {summary && <div className="stats-grid">
        {[{icon:'💰',val:`₹${summary.grandTotal?.toLocaleString()}`,label:'Grand Total',bg:'#e0f2fe',c:'#0284c7'},
          {icon:'⏳',val:`₹${summary.outstanding?.toLocaleString()}`,label:'Outstanding',bg:'#fef9c3',c:'#ca8a04'},
          {icon:'✓',val:`₹${summary.paid?.toLocaleString()}`,label:'Paid',bg:'#dcfce7',c:'#16a34a'},
          {icon:'🏥',val:(bills.length+labCharges.length+radCharges.length+pharmaCharges.length+ipdCharges.length),label:'Total Transactions',bg:'#ede9fe',c:'#7c3aed'}
        ].map(s=><div key={s.label} className="stat-card"><div className="stat-icon" style={{background:s.bg,color:s.c}}>{s.icon}</div><div className="stat-value">{s.val}</div><div className="stat-label">{s.label}</div></div>)}
      </div>}

      <div className="tabs">
        {[['bills',`Consultation Bills (${bills.length})`],['lab',`Lab Tests (${labCharges.length})`],['radiology',`Scans (${radCharges.length})`],['pharmacy',`Medicines (${pharmaCharges.length})`],['ipd',`IPD / Ward (${ipdCharges.length})`]].map(([t,l])=>
          <button key={t} className={`tab${activeTab===t?' active':''}`} onClick={()=>setActiveTab(t)}>{l}</button>)}
      </div>
      <div className="card">
        {activeTab==='bills' && <BillsTable />}
        {activeTab==='lab' && <ChargesTable rows={labCharges} label="lab" total={(charges as {summary?:{labTotal?:number}})?.summary?.labTotal} statusFn={r=>r.status==='completed'?'badge-success':r.status==='ordered'?'badge-info':'badge-warning'} />}
        {activeTab==='radiology' && <ChargesTable rows={radCharges} label="radiology" total={(charges as {summary?:{radiologyTotal?:number}})?.summary?.radiologyTotal} statusFn={r=>r.status==='reported'?'badge-success':r.status==='imaging-done'?'badge-warning':'badge-info'} />}
        {activeTab==='pharmacy' && <ChargesTable rows={pharmaCharges} label="pharmacy" total={(charges as {summary?:{pharmacyTotal?:number}})?.summary?.pharmacyTotal} statusFn={_r=>'badge-success'} />}
        {activeTab==='ipd' && <ChargesTable rows={ipdCharges} label="IPD" total={(charges as {summary?:{ipdTotal?:number}})?.summary?.ipdTotal} statusFn={r=>r.status==='admitted'?'badge-warning':'badge-success'} />}
      </div>

      {viewing && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setViewing(null)}}>
        <div className="modal" style={{maxWidth:520}}>
          <div className="modal-header"><div style={{fontWeight:600}}>Invoice {viewing.invoiceNumber}</div><button className="btn btn-outline btn-sm" onClick={()=>setViewing(null)}>✕</button></div>
          <div className="modal-body">
            <table style={{margin:0}}><tbody>
              <tr><td>Consultation Fee</td><td style={{textAlign:'right'}}>₹{viewing.consultationFee.toLocaleString()}</td></tr>
              <tr><td>Medicines</td><td style={{textAlign:'right'}}>₹{viewing.medicineCost.toLocaleString()}</td></tr>
              <tr><td>Lab Tests</td><td style={{textAlign:'right'}}>₹{viewing.labTestCost.toLocaleString()}</td></tr>
              <tr><td>Other Charges</td><td style={{textAlign:'right'}}>₹{viewing.otherCharges.toLocaleString()}</td></tr>
              <tr><td><strong>Subtotal</strong></td><td style={{textAlign:'right'}}><strong>₹{viewing.totalAmount?.toLocaleString()}</strong></td></tr>
              <tr style={{color:'var(--emerald)'}}><td>Insurance Covered</td><td style={{textAlign:'right'}}>−₹{viewing.insuranceCovered.toLocaleString()}</td></tr>
              <tr style={{fontSize:16}}><td><strong>Amount Payable</strong></td><td style={{textAlign:'right'}}><strong>₹{viewing.amountPayable?.toLocaleString()}</strong></td></tr>
            </tbody></table>
            {viewing.status==='paid' && <div className="notif notif-success" style={{marginTop:14}}>✓ Paid via {viewing.paymentMethod} on {viewing.paymentDate} · Txn: {viewing.transactionRef}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setViewing(null)}>Close</button>
            {viewing.status==='pending' && <button className="btn btn-primary" onClick={()=>{setPayTarget(viewing);setViewing(null);setPayMethod('upi');setTxnRef('');setPayErr('')}}>Pay Now</button>}
          </div>
        </div>
      </div>}

      {payTarget && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setPayTarget(null)}}>
        <div className="modal" style={{maxWidth:440}}>
          <div className="modal-header"><div style={{fontWeight:600}}>Pay Bill — {payTarget.invoiceNumber}</div></div>
          <div className="modal-body">
            <div className="notif notif-info">Amount payable: <strong>₹{payTarget.amountPayable?.toLocaleString()}</strong></div>
            <div className="field" style={{marginTop:14}}><label>Payment Method</label>
              <select value={payMethod} onChange={e=>setPayMethod(e.target.value)}><option value="upi">UPI</option><option value="card">Credit/Debit Card</option><option value="net-banking">Net Banking</option><option value="cash">Cash</option></select>
            </div>
            <div className="field"><label>Transaction Reference (optional)</label><input value={txnRef} onChange={e=>setTxnRef(e.target.value)} placeholder="Leave blank for auto-generated" /></div>
            {payErr && <div className="notif notif-danger">{payErr}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setPayTarget(null)}>Cancel</button><button className="btn btn-success" onClick={()=>doPay.mutate()} disabled={doPay.isPending}>{doPay.isPending?'Processing...':'Confirm Payment'}</button></div>
        </div>
      </div>}

      {showIns && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setShowIns(false)}}>
        <div className="modal">
          <div className="modal-header"><div style={{fontWeight:600}}>{insurance?'Update':'Add'} Insurance</div><button className="btn btn-outline btn-sm" onClick={()=>setShowIns(false)}>✕</button></div>
          <div className="modal-body">
            <div className="form-grid">
              <div className="field"><label>Provider Name *</label><input value={insForm.providerName} onChange={f('providerName')} /></div>
              <div className="field"><label>Policy Number *</label><input value={insForm.policyNumber} onChange={f('policyNumber')} /></div>
              <div className="field form-full"><label>Policy Holder Name *</label><input value={insForm.policyHolderName} onChange={f('policyHolderName')} /></div>
              <div className="field"><label>Valid From *</label><input type="date" value={insForm.validFrom} onChange={f('validFrom')} /></div>
              <div className="field"><label>Valid To *</label><input type="date" value={insForm.validTo} onChange={f('validTo')} /></div>
              <div className="field"><label>Sum Insured (₹) *</label><input type="number" value={insForm.sumInsured} onChange={f('sumInsured')} /></div>
              <div className="field"><label>Coverage Type</label><select value={insForm.coverageType??'individual'} onChange={f('coverageType')}><option value="individual">Individual</option><option value="family">Family Floater</option><option value="corporate">Corporate</option></select></div>
              <div className="field"><label>TPA Name</label><input value={insForm.tpaName??''} onChange={f('tpaName')} /></div>
              <div className="field"><label>Contact Number</label><input value={insForm.contactNumber??''} onChange={f('contactNumber')} /></div>
            </div>
            {insErr && <div className="notif notif-danger" style={{marginTop:10}}>{insErr}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setShowIns(false)}>Cancel</button><button className="btn btn-primary" onClick={()=>saveIns.mutate()} disabled={saveIns.isPending}>Save</button></div>
        </div>
      </div>}
    </>
  )
}
