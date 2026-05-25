// Admin Patients
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api'
import { viewFile } from '../../api'
import type { Patient, Doctor, MedicalReport, Bill, Insurance } from '../../types'

export default function AdminPatients() {
  const { data: patients = [] } = useQuery({ queryKey:['admin-patients'], queryFn: adminApi.getPatients })
  const { data: doctors = [] } = useQuery({ queryKey:['admin-docs'], queryFn: adminApi.getDoctors })
  const [search, setSearch] = useState('')
  const [viewing, setViewing] = useState<Patient|null>(null)
  const [tab, setTab] = useState<'profile'|'reports'|'bills'|'insurance'>('profile')
  const [reports, setReports] = useState<MedicalReport[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [insurance, setInsurance] = useState<Insurance|null>(null)

  const docName = (id?: number) => doctors.find((d: Doctor) => d.id === id)?.name ?? '—'
  const filtered = patients.filter((p: Patient) => {
    const q = search.toLowerCase()
    return !q || p.name.toLowerCase().includes(q) || (p.contact??'').includes(q) || String(p.id).includes(q)
  })

  function openView(p: Patient) {
    setViewing(p); setTab('profile'); setReports([]); setBills([]); setInsurance(null)
    adminApi.patientReports(p.id!).then(setReports)
    adminApi.allBills().then(b => setBills(b.filter((x:Bill) => x.patientId === p.id)))
    adminApi.patientInsurance(p.id!).then((i: unknown) => setInsurance((i as {hasInsurance?: boolean})?.hasInsurance === false ? null : i as Insurance))
  }

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">All Patients ({filtered.length})</div><div className="card-sub">View profiles, reports, billing & insurance.</div></div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, contact…" className="search-input" style={{ width:240 }} />
        </div>
        <table>
          <thead><tr><th>Name</th><th>Age/Gender</th><th>Contact</th><th>Blood</th><th>Primary Doctor</th><th>Last Visit</th><th>Action</th></tr></thead>
          <tbody>
            {filtered.map((p: Patient) => (
              <tr key={p.id}>
                <td><strong>{p.name}</strong></td><td>{p.age}y / {p.gender}</td><td>{p.contact}</td>
                <td>{p.bloodGroup ?? '—'}</td><td style={{ fontSize:12 }}>{docName(p.doctorId)}</td>
                <td style={{ fontSize:12 }}>{p.lastVisit ?? '—'}</td>
                <td><button className="btn btn-outline btn-sm" onClick={() => openView(p)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {viewing && (
        <div className="overlay" onClick={e => { if ((e.target as HTMLElement).classList.contains('overlay')) setViewing(null) }}>
          <div className="modal" style={{ maxWidth:760 }}>
            <div className="modal-header">
              <div><div style={{ fontWeight:600,fontSize:16 }}>{viewing.name}</div><div style={{ fontSize:12,color:'var(--text3)' }}>Patient ID #{viewing.id}</div></div>
              <button className="btn btn-outline btn-sm" onClick={() => setViewing(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="tabs" style={{ marginBottom:14 }}>
                {(['profile','reports','bills','insurance'] as const).map(t => <button key={t} className={`tab${tab===t?' active':''}`} onClick={() => setTab(t)}>{t.charAt(0).toUpperCase()+t.slice(1)}{t==='reports'?` (${reports.length})`:t==='bills'?` (${bills.length})`:''}</button>)}
              </div>
              {tab==='profile' && <div className="info-box"><div className="grid-2">
                <div><span className="lbl">Age/Gender:</span> {viewing.age}y / {viewing.gender}</div>
                <div><span className="lbl">Blood Group:</span> {viewing.bloodGroup ?? '—'}</div>
                <div><span className="lbl">Contact:</span> {viewing.contact}</div>
                <div><span className="lbl">Primary Doctor:</span> {docName(viewing.doctorId)}</div>
                <div style={{ gridColumn:'1/-1' }}><span className="lbl">Address:</span> {viewing.address ?? '—'}</div>
                <div style={{ gridColumn:'1/-1' }}><span className="lbl">Allergies:</span> <span style={{ color: viewing.allergies && viewing.allergies!=='None' ? 'var(--red)':'var(--emerald)' }}>{viewing.allergies ?? 'None'}</span></div>
              </div></div>}
              {tab==='reports' && <div>
                {reports.length === 0 ? <div style={{ color:'var(--text3)',textAlign:'center',padding:24 }}>No reports uploaded.</div> :
                  reports.map((r: MedicalReport) => <div key={r.id} style={{ display:'flex',alignItems:'center',gap:10,padding:10,background:'#fff',borderRadius:8,marginBottom:6,border:'1px solid var(--border)' }}>
                    <div style={{ flex:1 }}><div style={{ fontWeight:500 }}>{r.fileName}</div><div style={{ fontSize:11,color:'var(--text3)' }}><span className="badge badge-info" style={{ marginRight:6 }}>{r.reportType}</span>{r.description ?? 'No description'}</div></div>
                    <button className="btn btn-outline btn-sm" onClick={() => viewFile(r.id!)}>View File</button>
                  </div>)}
              </div>}
              {tab==='bills' && <div>
                {bills.length === 0 ? <div style={{ color:'var(--text3)',textAlign:'center',padding:24 }}>No bills on file.</div> :
                  <table><thead><tr><th>Invoice</th><th>Date</th><th>Total</th><th>Insurance</th><th>Payable</th><th>Status</th></tr></thead>
                  <tbody>{bills.map((b:Bill) => <tr key={b.id}><td><strong>{b.invoiceNumber}</strong></td><td style={{ fontSize:12 }}>{b.billDate}</td><td>₹{b.totalAmount?.toLocaleString()}</td><td style={{ color:'var(--emerald)' }}>₹{b.insuranceCovered.toLocaleString()}</td><td><strong>₹{b.amountPayable?.toLocaleString()}</strong></td><td><span className={`badge ${b.status==='paid'?'badge-success':'badge-warning'}`}>{b.status}</span></td></tr>)}</tbody></table>}
              </div>}
              {tab==='insurance' && <div>
                {!insurance ? <div style={{ color:'var(--text3)',textAlign:'center',padding:24 }}>No insurance on file.</div> :
                  <div className="info-box"><div className="grid-2">
                    <div><span className="lbl">Provider:</span> <strong>{insurance.providerName}</strong></div>
                    <div><span className="lbl">Policy No:</span> {insurance.policyNumber}</div>
                    <div><span className="lbl">Holder:</span> {insurance.policyHolderName}</div>
                    <div><span className="lbl">Coverage:</span> {insurance.coverageType}</div>
                    <div><span className="lbl">Sum Insured:</span> ₹{insurance.sumInsured.toLocaleString()}</div>
                    <div><span className="lbl">Used:</span> ₹{insurance.amountUsed.toLocaleString()}</div>
                    <div><span className="lbl">Valid From:</span> {insurance.validFrom}</div>
                    <div><span className="lbl">Valid To:</span> {insurance.validTo}</div>
                  </div></div>}
              </div>}
            </div>
            <div className="modal-footer"><button className="btn btn-outline" onClick={() => setViewing(null)}>Close</button></div>
          </div>
        </div>
      )}
    </>
  )
}
