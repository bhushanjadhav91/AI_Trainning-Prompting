import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hisApi } from '../../api'
import type { LabTest, Patient } from '../../types'
import { adminApi } from '../../api'

interface TestRow { testName:string; testCode:string; category:string; sampleType:string; charges:number; min:number; max:number }

export default function HisLab() {
  const qc = useQueryClient()
  const { data: tests = [] } = useQuery({ queryKey:['all-lab'], queryFn: hisApi.allLab })
  const { data: patients = [] } = useQuery({ queryKey:['all-patients'], queryFn: adminApi.getPatients })
  const { data: catalogue } = useQuery({ queryKey:['lab-catalogue'], queryFn: hisApi.labCatalogue })
  const [statusFilter, setStatusFilter] = useState('')
  const [showOrder, setShowOrder] = useState(false)
  const [searchQ, setSearchQ] = useState(''); const [searchRes, setSearchRes] = useState<Patient[]>([])
  const [selectedPat, setSelectedPat] = useState<Patient|null>(null)
  const [orderPriority, setOrderPriority] = useState('routine')
  const [testRows, setTestRows] = useState<TestRow[]>([])
  const [formErr, setFormErr] = useState('')
  const [resultTarget, setResultTarget] = useState<LabTest|null>(null)
  const [resultVal, setResultVal] = useState(''); const [refRange, setRefRange] = useState('')

  const catMap = catalogue as Record<string,[number,number]> ?? {}
  const catList = Object.entries(catMap).map(([code,[min,max]])=>({code,name:code.replace(/_/g,' '),min,max}))
  const patName = (id:number) => (patients as Patient[]).find(p=>p.id===id)?.name ?? `#${id}`
  const filtered = statusFilter ? (tests as LabTest[]).filter(t=>t.status===statusFilter) : tests as LabTest[]

  function emptyRow(): TestRow { return {testName:'',testCode:'',category:'haematology',sampleType:'blood',charges:0,min:0,max:99999} }

  async function searchPat() { const r = await hisApi.searchPatient(searchQ); setSearchRes(r.results||[]) }
  function selectPat(p:Patient) { setSelectedPat(p); setSearchRes([p]); if (testRows.length===0) setTestRows([emptyRow()]) }

  function onCodeChange(i:number, code:string) {
    const r=[...testRows]; r[i]={...r[i],testCode:code}
    const range = catMap[code]
    if (range) { r[i].testName=code.replace(/_/g,' '); r[i].charges=range[0]; r[i].min=range[0]; r[i].max=range[1] }
    setTestRows(r)
  }

  const orderMultiple = useMutation({ mutationFn: () => {
    if (!selectedPat) throw new Error('Select a patient')
    if (testRows.some(r=>!r.testName)) throw new Error('All tests need a name')
    for (const r of testRows) {
      if (r.min>0 && (r.charges<r.min||r.charges>r.max)) throw new Error(`Charge ₹${r.charges} for ${r.testName} is out of range ₹${r.min}–${r.max}`)
    }
    return hisApi.orderMultipleLab({tests:testRows,patientId:selectedPat.id,uhid:selectedPat.uhid,priority:orderPriority})
  }, onSuccess: (res:unknown) => {
    const r = res as {tests?:unknown[];bill?:{invoiceNumber?:string};totalCharges?:number}
    setShowOrder(false); alert(`✅ ${r.tests?.length} test(s) ordered. Bill ${r.bill?.invoiceNumber} — ₹${r.totalCharges}`)
    qc.invalidateQueries({queryKey:['all-lab']})
  }, onError: (e:Error) => setFormErr(e.message) })

  const collectSample = useMutation({ mutationFn: (t:LabTest) => hisApi.collectSample(t.id!, 'Lab Technician'),
    onSuccess: () => qc.invalidateQueries({queryKey:['all-lab']}) })

  const enterResult = useMutation({ mutationFn: () => {
    if (!resultVal) throw new Error('Result required')
    return hisApi.enterResult(resultTarget!.id!, resultVal, refRange)
  }, onSuccess: () => { setResultTarget(null); qc.invalidateQueries({queryKey:['all-lab']}) }, onError: (e:Error) => setFormErr(e.message) })

  return (
    <>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:18,marginBottom:18}}>
        <div className="card" style={{margin:0}}>
          <div className="card-header"><div className="card-title">🔬 Lab Test Orders</div><button className="btn btn-primary btn-sm" onClick={()=>{setSelectedPat(null);setSearchQ('');setSearchRes([]);setTestRows([emptyRow()]);setFormErr('');setShowOrder(true)}}>+ Order Tests</button></div>
          <div style={{marginBottom:10}}>
            <select value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{padding:6,border:'1px solid var(--border)',borderRadius:6,fontSize:12}}>
              <option value="">All</option><option value="ordered">Ordered</option><option value="sample-collected">Sample Collected</option><option value="completed">Completed</option>
            </select>
          </div>
          <table><thead><tr><th>Patient</th><th>Test</th><th>Charges</th><th>Priority</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>{filtered.map(t=><tr key={t.id}>
            <td><div style={{fontWeight:500,fontSize:12}}>{patName(t.patientId)}</div><span className="uhid-badge">{t.uhid}</span></td>
            <td><div style={{fontWeight:500,fontSize:13}}>{t.testName}</div><div style={{fontSize:11,color:'var(--text3)'}}>{t.category}</div></td>
            <td>₹{t.charges}</td>
            <td><span className={`badge ${t.priority==='stat'?'badge-danger':t.priority==='urgent'?'badge-warning':'badge-info'}`}>{t.priority}</span></td>
            <td><span className={`badge ${t.status==='ordered'?'badge-info':t.status==='sample-collected'?'badge-warning':'badge-success'}`}>{t.status}</span></td>
            <td>
              {t.status==='ordered' && <button className="btn btn-outline btn-sm" onClick={()=>collectSample.mutate(t)}>Collect</button>}
              {t.status==='sample-collected' && <button className="btn btn-primary btn-sm" onClick={()=>{setResultTarget(t);setResultVal('');setRefRange('');setFormErr('')}}>Result</button>}
              {t.status==='completed' && <button className="btn btn-outline btn-sm" onClick={()=>setResultTarget(t)}>View</button>}
            </td>
          </tr>)}</tbody></table>
        </div>
        <div className="card" style={{margin:0}}>
          <div className="card-title" style={{marginBottom:12}}>📋 Test Catalogue & Charges</div>
          <table><thead><tr><th>Test</th><th>Code</th><th>Min ₹</th><th>Max ₹</th></tr></thead>
          <tbody>{catList.map(c=><tr key={c.code}><td>{c.name}</td><td><code style={{fontSize:10}}>{c.code}</code></td><td style={{color:'var(--emerald)'}}>{c.min}</td><td style={{color:'var(--amber)'}}>{c.max}</td></tr>)}</tbody>
        </table></div>
      </div>

      {showOrder && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setShowOrder(false)}}>
        <div className="modal" style={{maxWidth:700}}>
          <div className="modal-header"><div style={{fontWeight:600}}>Order Lab Tests</div><button className="btn btn-outline btn-sm" onClick={()=>setShowOrder(false)}>✕</button></div>
          <div className="modal-body">
            <div className="field"><label>Search Patient</label><div style={{display:'flex',gap:8}}><input value={searchQ} onChange={e=>setSearchQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchPat()} style={{flex:1}} /><button className="btn btn-outline" onClick={searchPat}>Go</button></div></div>
            {searchRes.map(p=><div key={p.id} style={{padding:8,border:`2px solid ${selectedPat?.id===p.id?'var(--primary)':'var(--border)'}`,borderRadius:'var(--radius)',marginBottom:6,cursor:'pointer',fontSize:13}} onClick={()=>selectPat(p)}><span className="uhid-badge">{p.uhid}</span> {p.name} · {p.age}y</div>)}
            {selectedPat && <div style={{marginTop:12}}>
              <div className="field"><label>Priority</label><select value={orderPriority} onChange={e=>setOrderPriority(e.target.value)}><option value="routine">Routine</option><option value="urgent">Urgent</option><option value="stat">STAT</option></select></div>
              <div style={{marginTop:12}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}><div style={{fontWeight:600,fontSize:13}}>Tests to Order</div></div>
                <table><thead><tr><th>Test Name</th><th>Code</th><th>Category</th><th>Sample</th><th>Charge (₹)</th><th>Range</th><th></th></tr></thead>
                <tbody>{testRows.map((t,i)=><tr key={i}>
                  <td><input value={t.testName} onChange={e=>{const r=[...testRows];r[i]={...r[i],testName:e.target.value};setTestRows(r)}} style={{width:130,padding:4,border:'1px solid var(--border)',borderRadius:4}} /></td>
                  <td><select value={t.testCode} onChange={e=>onCodeChange(i,e.target.value)} style={{padding:4,fontSize:12,width:120}}><option value="">-- code --</option>{catList.map(c=><option key={c.code} value={c.code}>{c.code}</option>)}</select></td>
                  <td><select value={t.category} onChange={e=>{const r=[...testRows];r[i]={...r[i],category:e.target.value};setTestRows(r)}} style={{padding:4,fontSize:12,width:110}}><option value="haematology">Haematology</option><option value="biochemistry">Biochemistry</option><option value="microbiology">Microbiology</option><option value="serology">Serology</option><option value="other">Other</option></select></td>
                  <td><select value={t.sampleType} onChange={e=>{const r=[...testRows];r[i]={...r[i],sampleType:e.target.value};setTestRows(r)}} style={{padding:4,fontSize:12,width:80}}><option value="blood">Blood</option><option value="urine">Urine</option><option value="stool">Stool</option><option value="swab">Swab</option></select></td>
                  <td><input type="number" value={t.charges} onChange={e=>{const r=[...testRows];r[i]={...r[i],charges:+e.target.value};setTestRows(r)}} style={{width:70,padding:4,borderColor:t.charges<t.min||t.charges>t.max?'var(--red)':undefined}} /></td>
                  <td style={{fontSize:11,color:'var(--text3)'}}>₹{t.min}–{t.max}</td>
                  <td>{testRows.length>1 && <button className="btn btn-danger btn-sm" onClick={()=>setTestRows(testRows.filter((_,j)=>j!==i))}>✕</button>}</td>
                </tr>)}</tbody></table>
                <button className="btn btn-outline btn-sm" style={{marginTop:8}} onClick={()=>setTestRows([...testRows,emptyRow()])}>+ Add Test</button>
              </div>
              <div className="notif notif-info" style={{marginTop:12}}>Total Charges: <strong>₹{testRows.reduce((s,r)=>s+(r.charges||0),0).toLocaleString()}</strong> — A bill will be auto-generated.</div>
            </div>}
            {formErr && <div className="notif notif-danger" style={{marginTop:8}}>{formErr}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setShowOrder(false)}>Cancel</button><button className="btn btn-primary" onClick={()=>orderMultiple.mutate()} disabled={orderMultiple.isPending||!selectedPat}>{orderMultiple.isPending?'Ordering...':'Order & Generate Bill'}</button></div>
        </div>
      </div>}

      {resultTarget && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setResultTarget(null)}}>
        <div className="modal" style={{maxWidth:500}}>
          <div className="modal-header"><div style={{fontWeight:600}}>{resultTarget.status==='completed'?'Result':'Enter Result'} — {resultTarget.testName}</div><button className="btn btn-outline btn-sm" onClick={()=>setResultTarget(null)}>✕</button></div>
          <div className="modal-body">
            <div className="info-box" style={{marginBottom:12,fontSize:12}}><b>Patient:</b> {patName(resultTarget.patientId)} · <b>Sample:</b> {resultTarget.sampleType} · <b>Charges:</b> ₹{resultTarget.charges}</div>
            {resultTarget.status!=='completed' ? <>
              <div className="field"><label>Result *</label><textarea value={resultVal} onChange={e=>setResultVal(e.target.value)} rows={4} placeholder="Enter result values..." /></div>
              <div className="field"><label>Reference Range</label><input value={refRange} onChange={e=>setRefRange(e.target.value)} placeholder="e.g. Hb: 13–17 g/dL" /></div>
              {formErr && <div className="notif notif-danger">{formErr}</div>}
            </> : <div className="info-box"><div><b>Result:</b></div><div style={{whiteSpace:'pre-wrap',fontSize:13,margin:'8px 0'}}>{resultTarget.result}</div>{resultTarget.referenceRange&&<div style={{fontSize:12,color:'var(--text3)'}}>Ref: {resultTarget.referenceRange}</div>}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setResultTarget(null)}>Close</button>{resultTarget.status!=='completed'&&<button className="btn btn-success" onClick={()=>enterResult.mutate()} disabled={enterResult.isPending}>Save</button>}</div>
        </div>
      </div>}
    </>
  )
}
