import { useQuery } from '@tanstack/react-query'
import { patientApi, publicApi } from '../../api'
import type { Prescription, Doctor } from '../../types'

export default function PatientPrescriptions() {
  const { data: prescriptions = [] } = useQuery({ queryKey:['pat-rx'], queryFn: patientApi.prescriptions })
  const { data: doctors = [] } = useQuery({ queryKey:['pub-docs'], queryFn: publicApi.doctors })
  const docName = (id:number) => (doctors as Doctor[]).find(d=>d.id===id)?.name ?? `Doctor #${id}`

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">My Prescriptions ({(prescriptions as Prescription[]).length})</div></div>
      {(prescriptions as Prescription[]).length===0 ? <div style={{color:'var(--text3)',padding:'20px 0'}}>No prescriptions yet.</div> :
        (prescriptions as Prescription[]).map(r=>(
          <div key={r.id} style={{border:'1px solid var(--border)',borderRadius:'var(--radius)',padding:16,marginBottom:12}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
              <div><strong>Issued by {docName(r.doctorId)}</strong><span className="badge badge-info" style={{marginLeft:8}}>Rx #{r.id}</span></div>
              <span style={{fontSize:12,color:'var(--text3)'}}>{r.date}</span>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,fontSize:13}}>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4}}>MEDICINES</div>
                <div>{r.medicines}</div>
                <div style={{color:'var(--text3)',fontSize:12,marginTop:2}}>Dosage: {r.dosage} · {r.duration}</div>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginBottom:4}}>TESTS / SCANS</div>
                <div>{r.tests||'—'}</div>
                <div style={{fontSize:11,fontWeight:600,color:'var(--text3)',marginTop:8,marginBottom:4}}>DIET PLAN</div>
                <div style={{fontSize:12}}>{r.diet||'—'}</div>
              </div>
            </div>
            {r.notes && <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid var(--border)',fontSize:12,color:'var(--text3)'}}>📋 {r.notes}</div>}
          </div>
        ))}
    </div>
  )
}
