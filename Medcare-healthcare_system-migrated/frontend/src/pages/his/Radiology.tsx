import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hisApi, adminApi } from '../../api'
import type { RadiologyOrder, Patient } from '../../types'

interface OrderRow { imagingType:string; bodyPart:string; contrast:string; clinicalNotes:string; charges:number; min:number; max:number }

export default function HisRadiology() {
  const qc = useQueryClient()
  const { data: orders = [] } = useQuery({ queryKey:['all-radiology'], queryFn: hisApi.allRadiology })
  const { data: patients = [] } = useQuery({ queryKey:['all-patients'], queryFn: adminApi.getPatients })
  const { data: catalogue } = useQuery({ queryKey:['imaging-catalogue'], queryFn: hisApi.imagingCatalogue })
  const [statusFilter, setStatusFilter] = useState('')
  const [showOrder, setShowOrder] = useState(false)
  const [searchQ, setSearchQ] = useState(''); const [searchRes, setSearchRes] = useState<Patient[]>([])
  const [selectedPat, setSelectedPat] = useState<Patient|null>(null)
  const [orderPriority, setOrderPriority] = useState('routine')
  const [orderRows, setOrderRows] = useState<OrderRow[]>([])
  const [formErr, setFormErr] = useState('')
  const [reportTarget, setReportTarget] = useState<RadiologyOrder|null>(null)
  const [findingsVal, setFindingsVal] = useState(''); const [impressionVal, setImpressionVal] = useState('')

  const catMap = catalogue as Record<string,[number,number]> ?? {}
  const catList = Object.entries(catMap).map(([key,[min,max]])=>({key,min,max}))
  const patName = (id:number) => (patients as Patient[]).find(p=>p.id===id)?.name ?? `#${id}`
  const filtered = statusFilter ? (orders as RadiologyOrder[]).filter(r=>r.status===statusFilter) : orders as RadiologyOrder[]

  function emptyRow(): OrderRow { const f=catList[0]; return {imagingType:f?.key||'xray',bodyPart:'',contrast:'none',clinicalNotes:'',charges:f?.min||300,min:f?.min||300,max:f?.max||500} }
  async function searchPat() { const r = await hisApi.searchPatient(searchQ); setSearchRes(r.results||[]) }
  function onTypeChange(i:number, t:string) { const r=[...orderRows]; r[i]={...r[i],imagingType:t}; const c=catMap[t]; if(c){r[i].charges=c[0];r[i].min=c[0];r[i].max=c[1]}; setOrderRows(r) }

  const orderMultiple = useMutation({ mutationFn: () => {
    if (!selectedPat) throw new Error('Select a patient')
    if (orderRows.some(r=>!r.bodyPart)) throw new Error('All studies need a body part')
    for (const r of orderRows) { if (r.min>0&&(r.charges<r.min||r.charges>r.max)) throw new Error(`Charge ₹${r.charges} for ${r.imagingType} out of range ₹${r.min}–${r.max}`) }
    return hisApi.orderMultipleImaging({orders:orderRows,patientId:selectedPat.id,uhid:selectedPat.uhid,priority:orderPriority})
  }, onSuccess: (res:unknown) => {
    const r = res as {orders?:unknown[];bill?:{invoiceNumber?:string};totalCharges?:number}
    setShowOrder(false); alert(`✅ ${r.orders?.length} imaging order(s). Bill ${r.bill?.invoiceNumber} — ₹${r.totalCharges?.toFixed(2)}`)
    qc.invalidateQueries({queryKey:['all-radiology']})
  }, onError: (e:Error) => setFormErr(e.message) })

  const markDone = useMutation({ mutationFn: (r:RadiologyOrder) => hisApi.imagingDone(r.id!), onSuccess: () => qc.invalidateQueries({queryKey:['all-radiology']}) })

  const submitReport = useMutation({ mutationFn: () => {
    if (!findingsVal||!impressionVal) throw new Error('Findings and impression required')
    return hisApi.submitRadReport(reportTarget!.id!, findingsVal, impressionVal)
  }, onSuccess: () => { setReportTarget(null); qc.invalidateQueries({queryKey:['all-radiology']}) }, onError: (e:Error) => setFormErr(e.message) })

  return (
    <>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:18}}>
        <div className="card" style={{margin:0}}>
          <div className="card-header"><div className="card-title">📡 Radiology Orders</div><button className="btn btn-primary btn-sm" onClick={()=>{setSelectedPat(null);setSearchQ('');setSearchRes([]);setOrderRows([emptyRow()]);setFormErr('');setShowOrder(true)}}>+ Order Imaging</button></div>
          <div style={{marginBottom:10}}><select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{padding:6,border:'1px solid var(--border)',borderRadius:6,fontSize:12}}><option value="">All</option><option value="ordered">Ordered</option><option value="imaging-done">Imaging Done</option><option value="reported">Reported</option></select></div>
          <table><thead><tr><th>Patient</th><th>Study</th><th>Charges</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{filtered.map(r=><tr key={r.id}>
            <td><div style={{fontWeight:500,fontSize:12}}>{patName(r.patientId)}</div><span className="uhid-badge">{r.uhid}</span></td>
            <td><span className="badge badge-info">{r.imagingType}</span><div style={{fontSize:11,color:'var(--text3)'}}>{r.bodyPart}</div></td>
            <td>₹{r.charges?.toLocaleString()}</td>
            <td><span className={`badge ${r.status==='ordered'?'badge-info':r.status==='imaging-done'?'badge-warning':'badge-success'}`}>{r.status}</span></td>
            <td>
              {r.status==='ordered' && <button className="btn btn-outline btn-sm" onClick={()=>markDone.mutate(r)}>Done</button>}
              {r.status==='imaging-done' && <button className="btn btn-primary btn-sm" onClick={()=>{setReportTarget(r);setFindingsVal('');setImpressionVal('');setFormErr('')}}>Report</button>}
              {r.status==='reported' && <button className="btn btn-outline btn-sm" onClick={()=>setReportTarget(r)}>View</button>}
            </td>
          </tr>)}</tbody></table>
        </div>
        <div className="card" style={{margin:0}}>
          <div className="card-title" style={{marginBottom:12}}>📋 Imaging Charges (₹)</div>
          <table><thead><tr><th>Modality</th><th>Min ₹</th><th>Max ₹</th></tr></thead>
          <tbody>{catList.map(c=><tr key={c.key}><td style={{textTransform:'capitalize'}}>{c.key}</td><td style={{color:'var(--emerald)'}}>{c.min.toLocaleString()}</td><td style={{color:'var(--amber)'}}>{c.max.toLocaleString()}</td></tr>)}</tbody>
        </table></div>
      </div>

      {showOrder && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setShowOrder(false)}}>
        <div className="modal" style={{maxWidth:760}}>
          <div className="modal-header"><div style={{fontWeight:600}}>Order Imaging Studies</div><button className="btn btn-outline btn-sm" onClick={()=>setShowOrder(false)}>✕</button></div>
          <div className="modal-body">
            <div className="field"><label>Search Patient</label><div style={{display:'flex',gap:8}}><input value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchPat()} style={{flex:1}} /><button className="btn btn-outline" onClick={searchPat}>Go</button></div></div>
            {searchRes.map(p=><div key={p.id} style={{padding:8,border:`2px solid ${selectedPat?.id===p.id?'var(--primary)':'var(--border)'}`,borderRadius:'var(--radius)',marginBottom:6,cursor:'pointer',fontSize:13}} onClick={()=>{ setSelectedPat(p); setSearchRes([p]) }}><span className="uhid-badge">{p.uhid}</span> {p.name} · {p.age}y</div>)}
            {selectedPat && <div style={{marginTop:14}}>
              <div className="field"><label>Priority</label><select value={orderPriority} onChange={e=>setOrderPriority(e.target.value)}><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="stat">STAT</option></select></div>
              <div style={{marginTop:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><div style={{fontWeight:600,fontSize:13}}>Imaging Studies</div><button className="btn btn-outline btn-sm" onClick={()=>setOrderRows([...orderRows,emptyRow()])}>+ Add Study</button></div>
                <table><thead><tr><th>Modality</th><th>Body Part</th><th>Contrast</th><th>Charge (₹)</th><th>Range</th><th></th></tr></thead>
                <tbody>{orderRows.map((r,i)=><tr key={i}>
                  <td><select value={r.imagingType} onChange={e=>onTypeChange(i,e.target.value)} style={{padding:4,fontSize:12}}>{catList.map(c=><option key={c.key} value={c.key}>{c.key}</option>)}</select></td>
                  <td><input value={r.bodyPart} onChange={e=>{const rows=[...orderRows];rows[i]={...rows[i],bodyPart:e.target.value};setOrderRows(rows)}} style={{width:100,padding:4}} placeholder="e.g. Chest" /></td>
                  <td><select value={r.contrast} onChange={e=>{const rows=[...orderRows];rows[i]={...rows[i],contrast:e.target.value};setOrderRows(rows)}} style={{padding:4,fontSize:12,width:90}}><option value="none">None</option><option value="with-contrast">With</option><option value="with-without">Both</option></select></td>
                  <td><input type="number" value={r.charges} onChange={e=>{const rows=[...orderRows];rows[i]={...rows[i],charges:+e.target.value};setOrderRows(rows)}} style={{width:80,padding:4,borderColor:r.charges<r.min||r.charges>r.max?'var(--red)':undefined}} /></td>
                  <td style={{fontSize:11,color:'var(--text3)'}}>₹{r.min}–{r.max}</td>
                  <td>{orderRows.length>1 && <button className="btn btn-danger btn-sm" onClick={()=>setOrderRows(orderRows.filter((_,j)=>j!==i))}>✕</button>}</td>
                </tr>)}</tbody></table>
              </div>
              <div className="notif notif-info" style={{marginTop:12}}>Total: <strong>₹{orderRows.reduce((s,r)=>s+(r.charges||0),0).toLocaleString()}</strong> — A bill will be auto-generated.</div>
            </div>}
            {formErr && <div className="notif notif-danger" style={{marginTop:8}}>{formErr}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setShowOrder(false)}>Cancel</button><button className="btn btn-primary" onClick={()=>orderMultiple.mutate()} disabled={orderMultiple.isPending||!selectedPat}>{orderMultiple.isPending?'Ordering...':'Order & Generate Bill'}</button></div>
        </div>
      </div>}

      {reportTarget && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setReportTarget(null)}}>
        <div className="modal" style={{maxWidth:560}}>
          <div className="modal-header"><div style={{fontWeight:600}}>{reportTarget.status==='reported'?'Report':'Submit Report'} — {reportTarget.imagingType} {reportTarget.bodyPart}</div><button className="btn btn-outline btn-sm" onClick={()=>setReportTarget(null)}>✕</button></div>
          <div className="modal-body">
            <div className="info-box" style={{marginBottom:12,fontSize:12}}><b>Patient:</b> {patName(reportTarget.patientId)} · <b>PACS:</b> {reportTarget.pacsAccessionNumber} · <b>Charges:</b> ₹{reportTarget.charges?.toLocaleString()}</div>
            {reportTarget.status!=='reported' ? <>
              <div className="field"><label>Findings *</label><textarea value={findingsVal} onChange={e=>setFindingsVal(e.target.value)} rows={4} placeholder="Describe imaging findings..." /></div>
              <div className="field"><label>Impression *</label><textarea value={impressionVal} onChange={e=>setImpressionVal(e.target.value)} rows={3} placeholder="Final radiologist impression..." /></div>
              {formErr && <div className="notif notif-danger">{formErr}</div>}
            </> : <>
              <div className="info-box" style={{marginBottom:10}}><b>Findings:</b><div style={{whiteSpace:'pre-wrap',marginTop:6}}>{reportTarget.findings}</div></div>
              <div className="info-box"><b>Impression:</b><div style={{whiteSpace:'pre-wrap',marginTop:6}}>{reportTarget.impression}</div></div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:8}}>{reportTarget.reportedBy} · {reportTarget.reportedAt?.slice(0,10)}</div>
            </>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setReportTarget(null)}>Close</button>{reportTarget.status!=='reported'&&<button className="btn btn-success" onClick={()=>submitReport.mutate()} disabled={submitReport.isPending}>Submit</button>}</div>
        </div>
      </div>}
    </>
  )
}
