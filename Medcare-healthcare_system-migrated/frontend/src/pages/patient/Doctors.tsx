import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { publicApi, patientApi } from '../../api'
import type { Doctor } from '../../types'

export default function PatientDoctors() {
  const navigate = useNavigate()
  const { data: doctors = [] } = useQuery({ queryKey:['pub-docs'], queryFn: publicApi.doctors })
  const [filter, setFilter] = useState('')
  const [slotsMap, setSlotsMap] = useState<Record<number,{slots:string[];reason?:string}>>({})
  const [selectedSlots, setSelectedSlots] = useState<Record<number,string>>({})
  const [bookingDoctor, setBookingDoctor] = useState<Doctor|null>(null)
  const [bookForm, setBookForm] = useState({date:new Date().toISOString().slice(0,10),time:'',complaint:''})
  const [modalSlots, setModalSlots] = useState<string[]>([])
  const [modalInfo, setModalInfo] = useState('')
  const [bookErr, setBookErr] = useState(''); const [bookOk, setBookOk] = useState('')
  const [allSlotsDoctor, setAllSlotsDoctor] = useState<Doctor|null>(null)
  const today = new Date().toISOString().slice(0,10)

  useEffect(() => {
    (doctors as Doctor[]).forEach(d => {
      if (!d.id) return
      if (d.availabilityStatus==='away') { setSlotsMap(m=>({...m,[d.id!]:{slots:[],reason:'Doctor is away'}})); return }
      publicApi.slots(d.id, today).then(s => setSlotsMap(m=>({...m,[d.id!]:s}))).catch(()=>setSlotsMap(m=>({...m,[d.id!]:{slots:[]}})))
    })
  }, [doctors, today])

  function loadModalSlots(d:Doctor, date:string) {
    if (!d.id) return
    publicApi.slots(d.id, date).then(s=>{ setModalSlots(s.slots||[]); setModalInfo(s.reason??'') }).catch(()=>setModalSlots([]))
  }

  const book = useMutation({ mutationFn: () => {
    const time = bookForm.time
    if (!bookForm.date||!time) throw new Error('Please select a date and time slot.')
    return patientApi.book({doctorId:bookingDoctor!.id,...bookForm,time})
  }, onSuccess: () => {
    setBookOk('✅ Appointment booked successfully!')
    setTimeout(()=>{ setBookingDoctor(null); navigate('/patient/appointments') }, 1500)
  }, onError: (e:Error) => setBookErr((e as {response?:{data?:{error?:string}}})?.response?.data?.error ?? e.message) })

  const filtered = (doctors as Doctor[]).filter(d => !filter||d.name.toLowerCase().includes(filter.toLowerCase())||d.specialization.toLowerCase().includes(filter.toLowerCase()))

  return (
    <>
      <div className="card">
        <div className="card-header">
          <div><div className="card-title">Find a Doctor</div><div className="card-sub">Real-time availability and appointment slots for today.</div></div>
          <input value={filter} onChange={e=>setFilter(e.target.value)} placeholder="Filter by name or specialty..." className="search-input" style={{width:240}} />
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))',gap:14}}>
          {filtered.map(d=>(
            <div key={d.id} style={{padding:18,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:'var(--radius-lg)',opacity:d.availabilityStatus==='away'?.65:1}}>
              <div style={{display:'flex',alignItems:'start',justifyContent:'space-between',marginBottom:8}}>
                <div>
                  <div style={{fontWeight:600,fontSize:15}}>{d.name}</div>
                  <div style={{fontSize:12,color:'var(--primary)',fontWeight:500,marginTop:2}}>{d.specialization}</div>
                  <div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>{d.experience} · {d.qualification}</div>
                  {d.schedule && <div style={{fontSize:12,color:'var(--text3)'}}>⏰ {d.schedule}</div>}
                </div>
                <span className={`badge ${d.availabilityStatus==='available'?'badge-success':d.availabilityStatus==='in-operation'?'badge-warning':'badge-danger'}`}>{d.availabilityStatus}</span>
              </div>
              {d.availabilityStatus!=='available' && (d.availabilityNote||d.availableUntil) && (
                <div style={{marginTop:8,padding:'8px 10px',background:'var(--surface2)',borderRadius:6,fontSize:12,color:'var(--text3)'}}>
                  {d.availabilityNote && <div>📝 {d.availabilityNote}</div>}
                  {d.availableUntil && <div style={{fontSize:11}}>{d.availabilityStatus==='in-operation'?'⚙ Busy until':'🔴 Away until'} <strong>{d.availableUntil}</strong></div>}
                  {d.availableFrom && <div style={{fontSize:11,color:'var(--emerald)'}}>✓ Available from <strong>{d.availableFrom}</strong></div>}
                </div>
              )}
              {d.availabilityStatus!=='away' && (
                <div style={{marginTop:12}}>
                  <div style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:6,textTransform:'uppercase'}}>Available Slots Today</div>
                  {!slotsMap[d.id!] && <div style={{fontSize:12,color:'var(--text3)'}}>Loading slots...</div>}
                  {slotsMap[d.id!]?.reason && <div className="notif notif-warning" style={{padding:'6px 10px',fontSize:12,marginBottom:0}}>{slotsMap[d.id!].reason}</div>}
                  {slotsMap[d.id!]?.slots?.length===0 && !slotsMap[d.id!]?.reason && <div style={{fontSize:12,color:'var(--text3)'}}>No slots available today.</div>}
                  {(slotsMap[d.id!]?.slots?.length??0)>0 && (
                    <div style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:4}}>
                      {(slotsMap[d.id!]?.slots??[]).slice(0,8).map(s=>(
                        <button key={s} style={{padding:'4px 10px',border:`1px solid ${selectedSlots[d.id!]===s?'var(--primary)':'var(--border)'}`,borderRadius:6,fontSize:12,cursor:'pointer',background:selectedSlots[d.id!]===s?'var(--primary)':'#fff',color:selectedSlots[d.id!]===s?'#fff':'var(--text3)'}}
                          onClick={()=>setSelectedSlots(m=>({...m,[d.id!]:m[d.id!]===s?'':s}))}>{s}</button>
                      ))}
                      {(slotsMap[d.id!]?.slots?.length??0)>8 && <button style={{padding:'4px 10px',border:'1px dashed var(--border)',borderRadius:6,fontSize:12,cursor:'pointer',background:'var(--surface2)'}} onClick={()=>setAllSlotsDoctor(d)}>+{(slotsMap[d.id!]?.slots?.length??0)-8} more</button>}
                    </div>
                  )}
                </div>
              )}
              <div style={{marginTop:14}}>
                <button className={`btn btn-sm ${d.availabilityStatus==='away'?'btn-outline':'btn-primary'}`} disabled={d.availabilityStatus==='away'}
                  onClick={()=>{ setBookingDoctor(d); setBookErr(''); setBookOk(''); setBookForm({date:today,time:selectedSlots[d.id!]||'',complaint:''}); loadModalSlots(d,today) }}>
                  {d.availabilityStatus==='away'?'🔴 Not Available':selectedSlots[d.id!]?`📅 Book ${selectedSlots[d.id!]}`:'Book Appointment'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {bookingDoctor && (
        <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setBookingDoctor(null)}}>
          <div className="modal" style={{maxWidth:500}}>
            <div className="modal-header">
              <div><div style={{fontWeight:600}}>Book with {bookingDoctor.name}</div><div style={{fontSize:12,color:'var(--text3)'}}>{bookingDoctor.specialization}</div></div>
              <button className="btn btn-outline btn-sm" onClick={()=>setBookingDoctor(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grid">
                <div className="field"><label>Date *</label><input type="date" value={bookForm.date} onChange={e=>{setBookForm({...bookForm,date:e.target.value}); loadModalSlots(bookingDoctor,e.target.value)}} /></div>
                <div className="field"><label>Time Slot *</label>
                  <select value={bookForm.time} onChange={e=>setBookForm({...bookForm,time:e.target.value})}>
                    <option value="">-- Pick a slot --</option>
                    {modalSlots.map(s=><option key={s} value={s}>{s}</option>)}
                    <option value="custom">Custom time...</option>
                  </select>
                </div>
                {bookForm.time==='custom' && <div className="field"><label>Custom Time</label><input type="time" onChange={e=>setBookForm({...bookForm,time:e.target.value})} /></div>}
                <div className="field form-full"><label>Reason for visit</label><textarea value={bookForm.complaint} onChange={e=>setBookForm({...bookForm,complaint:e.target.value})} placeholder="Describe your symptoms or reason..." /></div>
              </div>
              {modalInfo && <div className="notif notif-info" style={{marginTop:10,fontSize:12}}>{modalInfo}</div>}
              {bookErr && <div className="notif notif-danger" style={{marginTop:10}}>{bookErr}</div>}
              {bookOk && <div className="notif notif-success" style={{marginTop:10}}>{bookOk}</div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={()=>setBookingDoctor(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={()=>book.mutate()} disabled={book.isPending}>{book.isPending?'Booking...':'Confirm Appointment'}</button>
            </div>
          </div>
        </div>
      )}

      {allSlotsDoctor && (
        <div className="overlay" onClick={e=>{if((e.target as HTMLElement).classList.contains('overlay')) setAllSlotsDoctor(null)}}>
          <div className="modal" style={{maxWidth:400}}>
            <div className="modal-header"><div style={{fontWeight:600}}>All Slots — {allSlotsDoctor.name}</div><button className="btn btn-outline btn-sm" onClick={()=>setAllSlotsDoctor(null)}>✕</button></div>
            <div className="modal-body"><div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {(slotsMap[allSlotsDoctor.id!]?.slots??[]).map(s=>(
                <button key={s} style={{padding:'4px 10px',border:`1px solid ${selectedSlots[allSlotsDoctor.id!]===s?'var(--primary)':'var(--border)'}`,borderRadius:6,fontSize:12,cursor:'pointer',background:selectedSlots[allSlotsDoctor.id!]===s?'var(--primary)':'#fff',color:selectedSlots[allSlotsDoctor.id!]===s?'#fff':'var(--text3)'}}
                  onClick={()=>{ setSelectedSlots(m=>({...m,[allSlotsDoctor.id!]:s})); setAllSlotsDoctor(null) }}>{s}</button>
              ))}
            </div></div>
          </div>
        </div>
      )}
    </>
  )
}
