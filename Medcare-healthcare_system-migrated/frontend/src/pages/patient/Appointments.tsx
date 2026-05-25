import { useQuery } from '@tanstack/react-query'
import { patientApi, publicApi } from '../../api'
import type { Appointment, Doctor } from '../../types'

export default function PatientAppointments() {
  const { data: appts = [] } = useQuery({ queryKey:['pat-appts'], queryFn: patientApi.appointments })
  const { data: doctors = [] } = useQuery({ queryKey:['pub-docs'], queryFn: publicApi.doctors })
  const docName = (id:number) => (doctors as Doctor[]).find(d=>d.id===id)?.name ?? `Doctor #${id}`

  return (
    <div className="card">
      <div className="card-header"><div className="card-title">My Appointments ({(appts as Appointment[]).length})</div></div>
      {(appts as Appointment[]).length===0 ? <div style={{color:'var(--text3)',padding:'20px 0'}}>You haven't booked any appointments yet.</div> :
        <table><thead><tr><th>Date</th><th>Time</th><th>Doctor</th><th>Type</th><th>Complaint</th><th>Status</th></tr></thead>
        <tbody>{(appts as Appointment[]).map(a=><tr key={a.id}>
          <td>{a.date}</td><td>{a.time}</td><td>{docName(a.doctorId)}</td>
          <td><span className={`badge ${a.type==='emergency'?'badge-danger':a.type==='walkin'?'badge-success':'badge-info'}`}>{a.type}</span></td>
          <td style={{fontSize:12,maxWidth:240}}>{a.complaint}</td>
          <td><span className={`badge ${a.status==='done'?'badge-success':a.status==='in-progress'?'badge-warning':'badge-info'}`}>{a.status}</span></td>
        </tr>)}</tbody></table>}
    </div>
  )
}
