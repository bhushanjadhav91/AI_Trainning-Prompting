import { useQuery } from '@tanstack/react-query'
import { doctorApi } from '../../api'
import type { Appointment, Patient } from '../../types'

export default function DoctorDashboard() {
  const { data: appointments = [] } = useQuery({ queryKey:['doc-appts'], queryFn: doctorApi.myAppointments })
  const { data: patients = [] } = useQuery({ queryKey:['doc-patients'], queryFn: doctorApi.myPatients })
  const emergency = appointments.filter((a:Appointment) => a.type==='emergency' && a.status!=='done').length
  const waiting = appointments.filter((a:Appointment) => a.status==='waiting').length
  const patName = (id:number) => patients.find((p:Patient) => p.id===id)?.name ?? `Patient #${id}`

  return (
    <>
      <div className="stats-grid">
        {[{icon:'📅',val:appointments.length,label:'My Appointments',bg:'var(--primary-light)',c:'var(--primary)'},
          {icon:'👤',val:patients.length,label:'My Patients',bg:'var(--emerald-light)',c:'var(--emerald)'},
          {icon:'⚡',val:emergency,label:'Emergencies',bg:'var(--red-light)',c:'var(--red)'},
          {icon:'⏳',val:waiting,label:'Waiting',bg:'var(--amber-light)',c:'var(--amber)'}
        ].map(s => <div key={s.label} className="stat-card"><div className="stat-icon" style={{background:s.bg,color:s.c}}>{s.icon}</div><div className="stat-value">{s.val}</div><div className="stat-label">{s.label}</div></div>)}
      </div>
      {emergency > 0 && <div className="notif notif-danger">⚡ {emergency} emergency case(s) in your queue. Auto-prioritized.</div>}
      <div className="card">
        <div className="card-header"><div className="card-title">Today's Queue (Priority Order)</div></div>
        <table>
          <thead><tr><th>Type</th><th>Patient</th><th>Time</th><th>Complaint</th><th>Status</th></tr></thead>
          <tbody>
            {appointments.slice(0,8).map((a:Appointment) => (
              <tr key={a.id}>
                <td><span className={`badge ${a.type==='emergency'?'badge-danger':a.type==='walkin'?'badge-success':'badge-info'}`}>{a.type}</span></td>
                <td>{patName(a.patientId)}</td><td>{a.time}</td>
                <td style={{fontSize:12,maxWidth:200}}>{a.complaint}</td>
                <td><span className={`badge ${a.status==='done'?'badge-success':a.status==='in-progress'?'badge-warning':'badge-info'}`}>{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
