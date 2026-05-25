import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { hisApi, adminApi } from '../../api'
import type { Medicine, DispenseRecord, Patient } from '../../types'

interface CartRow { medicineId:number; medicineName:string; unitPrice:number; stock:number; quantity:number; total:number }

export default function HisPharmacy() {
  const qc = useQueryClient()
  const { data: medicines = [] } = useQuery({ queryKey:['medicines'], queryFn: hisApi.medicines })
  const { data: lowStock = [] } = useQuery({ queryKey:['low-stock'], queryFn: hisApi.lowStock })
  const { data: dispenses = [] } = useQuery({ queryKey:['dispenses'], queryFn: hisApi.allDispenses })
  const { data: patients = [] } = useQuery({ queryKey:['all-patients'], queryFn: adminApi.getPatients })
  const [searchMed, setSearchMed] = useState('')
  const [showCart, setShowCart] = useState(false)
  const [patSearch, setPatSearch] = useState(''); const [patResults, setPatResults] = useState<Patient[]>([]); const [cartPat, setCartPat] = useState<Patient|null>(null)
  const [medSearch, setMedSearch] = useState(''); const [medCartRes, setMedCartRes] = useState<Medicine[]>([])
  const [cartRows, setCartRows] = useState<CartRow[]>([])
  const [cartErr, setCartErr] = useState('')
  const [showAdd, setShowAdd] = useState(false); const [medForm, setMedForm] = useState<Partial<Medicine>>({category:'tablet',reorderLevel:10,stockQuantity:0,unitPrice:0}); const [medErr, setMedErr] = useState('')
  const [stockTarget, setStockTarget] = useState<Medicine|null>(null); const [stockQty, setStockQty] = useState(0)

  const refresh = () => qc.invalidateQueries({queryKey:['medicines','low-stock','dispenses']})
  const patName = (id:number) => (patients as Patient[]).find(p=>p.id===id)?.name ?? `#${id}`
  const filteredMed = searchMed ? (medicines as Medicine[]).filter(m=>m.name.toLowerCase().includes(searchMed.toLowerCase())||(m.brandName??'').toLowerCase().includes(searchMed.toLowerCase())) : medicines as Medicine[]

  async function searchPat() { const r = await hisApi.searchPatient(patSearch); setPatResults(r.results||[]) }
  function filterMedCart(q:string) { setMedSearch(q); setMedCartRes(!q.trim()?[]:(medicines as Medicine[]).filter(m=>m.name.toLowerCase().includes(q.toLowerCase())||(m.brandName??'').toLowerCase().includes(q.toLowerCase())).slice(0,8)) }

  function addCartRow(m:Medicine) {
    const ex = cartRows.find(r=>r.medicineId===m.id)
    if (ex) { setCartRows(cartRows.map(r=>r.medicineId===m.id?{...r,quantity:r.quantity+1,total:(r.quantity+1)*r.unitPrice}:r)) }
    else setCartRows([...cartRows,{medicineId:m.id!,medicineName:m.name,unitPrice:m.unitPrice??0,stock:m.stockQuantity??0,quantity:1,total:m.unitPrice??0}])
    setMedSearch(''); setMedCartRes([])
  }

  const dispenseMultiple = useMutation({ mutationFn: () => {
    if (!cartPat) throw new Error('Select a patient')
    const invalid = cartRows.find(r=>r.quantity<1||r.quantity>r.stock)
    if (invalid) throw new Error(`Invalid quantity for ${invalid.medicineName}. Max: ${invalid.stock}`)
    return hisApi.dispenseMultiple({items:cartRows.map(r=>({medicineId:r.medicineId,quantity:r.quantity})),patientId:cartPat.id,uhid:cartPat.uhid})
  }, onSuccess: (res:unknown) => {
    const r = res as {records?:unknown[];bill?:{invoiceNumber?:string};totalCost?:number}
    setShowCart(false); alert(`✅ ${r.records?.length} medicine(s) dispensed. Bill ${r.bill?.invoiceNumber} — ₹${r.totalCost?.toFixed(2)}`)
    refresh()
  }, onError: (e:Error) => setCartErr(e.message) })

  const addMed = useMutation({ mutationFn: () => {
    if (!medForm.name||!medForm.unitPrice) throw new Error('Name and price required')
    return hisApi.addMedicine(medForm as Medicine)
  }, onSuccess: () => { setShowAdd(false); refresh() }, onError: (e:Error) => setMedErr(e.message) })

  const updateStock = useMutation({ mutationFn: () => hisApi.updateStock(stockTarget!.id!, stockQty),
    onSuccess: () => { setStockTarget(null); refresh() }, onError: (e:Error) => setMedErr(e.message) })

  const cartTotal = cartRows.reduce((s,r)=>s+r.total,0)

  return (
    <>
      {(lowStock as Medicine[]).length>0 && <div className="notif notif-danger" style={{marginBottom:14}}>⚠ <strong>{(lowStock as Medicine[]).length} medicines</strong> below reorder level: {(lowStock as Medicine[]).map(m=>m.name).join(', ')}</div>}
      <div style={{display:'grid',gridTemplateColumns:'3fr 2fr',gap:18}}>
        <div className="card" style={{margin:0}}>
          <div className="card-header">
            <div className="card-title">💊 Inventory ({filteredMed.length})</div>
            <div style={{display:'flex',gap:8}}>
              <input value={searchMed} onChange={e=>setSearchMed(e.target.value)} placeholder="Search..." className="search-input" style={{width:160}} />
              <button className="btn btn-outline btn-sm" onClick={()=>{setShowCart(true);setCartPat(null);setPatSearch('');setPatResults([]);setMedSearch('');setMedCartRes([]);setCartRows([]);setCartErr('')}}>🛒 Dispense</button>
              <button className="btn btn-primary btn-sm" onClick={()=>{setMedForm({category:'tablet',reorderLevel:10,stockQuantity:0,unitPrice:0});setMedErr('');setShowAdd(true)}}>+ Add</button>
            </div>
          </div>
          <table><thead><tr><th>Medicine</th><th>Category</th><th>Stock</th><th>Price</th><th>Expiry</th><th>Action</th></tr></thead>
          <tbody>{filteredMed.map(m=><tr key={m.id} style={{background:(m.stockQuantity??0)<=(m.reorderLevel??10)?'#fff1f2':''}}>
            <td><div style={{fontWeight:500}}>{m.name}</div><div style={{fontSize:11,color:'var(--text3)'}}>{m.brandName} · {m.composition}</div></td>
            <td>{m.category}</td>
            <td style={{color:(m.stockQuantity??0)<=(m.reorderLevel??10)?'var(--red)':'var(--emerald)'}}><strong>{m.stockQuantity}</strong><div style={{fontSize:10,color:'var(--text3)'}}>min {m.reorderLevel}</div></td>
            <td>₹{m.unitPrice}</td>
            <td style={{fontSize:11}}>{m.expiryDate}</td>
            <td>
              <button className="btn btn-outline btn-sm" onClick={()=>{setStockTarget(m);setStockQty(0);setMedErr('')}}>Stock</button>
              <button className="btn btn-primary btn-sm" style={{marginLeft:4}} onClick={()=>{setShowCart(true);setCartPat(null);setPatSearch('');setPatResults([]);setMedSearch('');setMedCartRes([]);setCartRows([]);setCartErr('');setTimeout(()=>addCartRow(m),100)}}>+ Cart</button>
            </td>
          </tr>)}</tbody></table>
        </div>
        <div className="card" style={{margin:0}}>
          <div className="card-header"><div className="card-title">📦 Recent Dispenses</div></div>
          {(dispenses as DispenseRecord[]).length===0 ? <div style={{color:'var(--text3)',textAlign:'center',padding:20}}>No dispenses yet.</div> :
            (dispenses as DispenseRecord[]).slice(0,20).map(d=><div key={d.id} style={{display:'flex',alignItems:'center',gap:10,padding:8,border:'1px solid var(--border)',borderRadius:'var(--radius)',marginBottom:6}}>
              <div style={{flex:1}}><div style={{fontWeight:500,fontSize:13}}>{d.medicineName}</div><div style={{fontSize:11,color:'var(--text3)'}}>{patName(d.patientId)} · <span className="uhid-badge">{d.uhid}</span></div><div style={{fontSize:11,color:'var(--text3)'}}>qty: {d.quantity} · ₹{d.totalPrice}</div></div>
              <div style={{fontSize:10,color:'var(--text3)'}}>{d.dispensedAt?.split('T')[0]}</div>
            </div>)}
        </div>
      </div>

      {showCart && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setShowCart(false)}}>
        <div className="modal" style={{maxWidth:720}}>
          <div className="modal-header"><div style={{fontWeight:600}}>🛒 Dispense Medicines</div><button className="btn btn-outline btn-sm" onClick={()=>setShowCart(false)}>✕</button></div>
          <div className="modal-body">
            <div className="field"><label>Search Patient *</label><div style={{display:'flex',gap:8}}><input value={patSearch} onChange={e=>setPatSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&searchPat()} style={{flex:1}} placeholder="UHID / Name / Mobile" /><button className="btn btn-outline" onClick={searchPat}>Go</button></div></div>
            {patResults.map(p=><div key={p.id} style={{padding:8,border:`2px solid ${cartPat?.id===p.id?'var(--primary)':'var(--border)'}`,borderRadius:'var(--radius)',marginBottom:6,cursor:'pointer',fontSize:13}} onClick={()=>{setCartPat(p);setPatResults([p])}}><span className="uhid-badge">{p.uhid}</span> {p.name} · {p.age}y</div>)}
            <div style={{marginTop:14}}>
              <div className="field"><label>Add Medicine to Cart</label>
                <input value={medSearch} onChange={e=>filterMedCart(e.target.value)} style={{width:'100%'}} placeholder="Type medicine name..." />
                {medCartRes.length>0 && <div style={{border:'1px solid var(--border)',borderRadius:'var(--radius)',maxHeight:150,overflowY:'auto',marginTop:4}}>
                  {medCartRes.map(m=><div key={m.id} style={{padding:'8px 12px',cursor:'pointer',fontSize:12}} onClick={()=>addCartRow(m)}>{m.name} ({m.brandName}) — ₹{m.unitPrice} — Stock: {m.stockQuantity}</div>)}
                </div>}
              </div>
              {cartRows.length>0 && <table><thead><tr><th>Medicine</th><th>Unit Price</th><th>Qty</th><th>Total</th><th></th></tr></thead>
                <tbody>
                  {cartRows.map((r,i)=><tr key={i}>
                    <td>{r.medicineName}</td><td>₹{r.unitPrice}</td>
                    <td><input type="number" value={r.quantity} min={1} max={r.stock} onChange={e=>{const rows=[...cartRows];rows[i]={...rows[i],quantity:+e.target.value,total:+e.target.value*rows[i].unitPrice};setCartRows(rows)}} style={{width:60,padding:4,borderColor:r.quantity>r.stock?'var(--red)':undefined}} /><div style={{fontSize:10,color:'var(--text3)'}}>max {r.stock}</div></td>
                    <td><strong>₹{r.total.toLocaleString()}</strong></td>
                    <td><button className="btn btn-danger btn-sm" onClick={()=>setCartRows(cartRows.filter((_,j)=>j!==i))}>✕</button></td>
                  </tr>)}
                  <tr style={{background:'var(--surface2)'}}><td colSpan={3}><strong>Total</strong></td><td><strong>₹{cartTotal.toLocaleString()}</strong></td><td></td></tr>
                </tbody></table>}
              {cartRows.length===0 && <div style={{color:'var(--text3)',fontSize:12,marginTop:8}}>Use "+ Cart" on medicines or search above to add items.</div>}
            </div>
            {cartRows.length>0 && <div className="notif notif-info" style={{marginTop:12}}>A bill of <strong>₹{cartTotal.toLocaleString()}</strong> will be auto-generated.</div>}
            {cartErr && <div className="notif notif-danger" style={{marginTop:8}}>{cartErr}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setShowCart(false)}>Cancel</button><button className="btn btn-success" onClick={()=>dispenseMultiple.mutate()} disabled={dispenseMultiple.isPending||!cartPat||cartRows.length===0}>{dispenseMultiple.isPending?'Processing...':'✅ Dispense & Generate Bill'}</button></div>
        </div>
      </div>}

      {showAdd && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setShowAdd(false)}}>
        <div className="modal">
          <div className="modal-header"><div style={{fontWeight:600}}>Add Medicine</div><button className="btn btn-outline btn-sm" onClick={()=>setShowAdd(false)}>✕</button></div>
          <div className="modal-body">
            <div className="form-grid">
              <div className="field"><label>Generic Name *</label><input value={medForm.name??''} onChange={e=>setMedForm({...medForm,name:e.target.value})} /></div>
              <div className="field"><label>Brand Name</label><input value={medForm.brandName??''} onChange={e=>setMedForm({...medForm,brandName:e.target.value})} /></div>
              <div className="field"><label>Category *</label><select value={medForm.category??'tablet'} onChange={e=>setMedForm({...medForm,category:e.target.value})}>{['tablet','capsule','syrup','injection','cream','drops','inhaler','other'].map(c=><option key={c} value={c}>{c}</option>)}</select></div>
              <div className="field"><label>Composition</label><input value={medForm.composition??''} onChange={e=>setMedForm({...medForm,composition:e.target.value})} /></div>
              <div className="field"><label>Unit Price (₹) *</label><input type="number" value={medForm.unitPrice??0} onChange={e=>setMedForm({...medForm,unitPrice:+e.target.value})} /></div>
              <div className="field"><label>Opening Stock *</label><input type="number" value={medForm.stockQuantity??0} onChange={e=>setMedForm({...medForm,stockQuantity:+e.target.value})} /></div>
              <div className="field"><label>Reorder Level</label><input type="number" value={medForm.reorderLevel??10} onChange={e=>setMedForm({...medForm,reorderLevel:+e.target.value})} /></div>
              <div className="field"><label>Batch No.</label><input value={medForm.batchNumber??''} onChange={e=>setMedForm({...medForm,batchNumber:e.target.value})} /></div>
              <div className="field"><label>Expiry Date</label><input type="date" value={medForm.expiryDate??''} onChange={e=>setMedForm({...medForm,expiryDate:e.target.value})} /></div>
              <div className="field"><label>Storage Location</label><input value={medForm.storageLocation??''} onChange={e=>setMedForm({...medForm,storageLocation:e.target.value})} /></div>
            </div>
            {medErr && <div className="notif notif-danger">{medErr}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setShowAdd(false)}>Cancel</button><button className="btn btn-primary" onClick={()=>addMed.mutate()} disabled={addMed.isPending}>Add</button></div>
        </div>
      </div>}

      {stockTarget && <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setStockTarget(null)}}>
        <div className="modal" style={{maxWidth:380}}>
          <div className="modal-header"><div style={{fontWeight:600}}>Stock — {stockTarget.name}</div><button className="btn btn-outline btn-sm" onClick={()=>setStockTarget(null)}>✕</button></div>
          <div className="modal-body">
            <div className="notif notif-info">Current: <strong>{stockTarget.stockQuantity}</strong></div>
            <div className="field" style={{marginTop:12}}><label>Quantity to add (negative to deduct)</label><input type="number" value={stockQty} onChange={e=>setStockQty(+e.target.value)} /></div>
            {medErr && <div className="notif notif-danger">{medErr}</div>}
          </div>
          <div className="modal-footer"><button className="btn btn-outline" onClick={()=>setStockTarget(null)}>Cancel</button><button className="btn btn-primary" onClick={()=>updateStock.mutate()} disabled={updateStock.isPending}>Update</button></div>
        </div>
      </div>}
    </>
  )
}
