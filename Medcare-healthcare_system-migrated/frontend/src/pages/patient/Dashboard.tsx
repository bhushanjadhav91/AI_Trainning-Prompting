import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { patientApi } from '../../api'
import type { Appointment } from '../../types'

export default function PatientDashboard() {
  const { data: me } = useQuery({ queryKey:['pat-me'], queryFn: patientApi.me })
  const { data: appointments = [] } = useQuery({ queryKey:['pat-appts'], queryFn: patientApi.appointments })
  const { data: prescriptions = [] } = useQuery({ queryKey:['pat-rx'], queryFn: patientApi.prescriptions })
  const upcoming = (appointments as Appointment[]).filter(a => a.status==='waiting').length

  return (
    <>
      {me && <div className="card" style={{background:'linear-gradient(135deg,var(--primary-light),#fff)',borderColor:'var(--primary)'}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,color:'var(--primary-dark)'}}>Welcome back, {me.name} 👋</h2>
        <p style={{color:'var(--text3)',fontSize:13,marginTop:4}}>{me.age}y · {me.gender} · Blood {me.bloodGroup||'unknown'} · {me.contact}</p>
        {me.uhid && <div className="uhid-badge" style={{marginTop:8}}>{me.uhid}</div>}
      </div>}
      <div className="stats-grid" style={{gridTemplateColumns:'repeat(3,1fr)'}}>
        {[{icon:'📅',val:(appointments as Appointment[]).length,label:'My Appointments',bg:'var(--primary-light)',c:'var(--primary)'},
          {icon:'💊',val:prescriptions.length,label:'Prescriptions',bg:'var(--emerald-light)',c:'var(--emerald)'},
          {icon:'⏳',val:upcoming,label:'Upcoming',bg:'var(--amber-light)',c:'var(--amber)'}
        ].map(s=><div key={s.label} className="stat-card"><div className="stat-icon" style={{background:s.bg,color:s.c}}>{s.icon}</div><div className="stat-value">{s.val}</div><div className="stat-label">{s.label}</div></div>)}
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Quick Actions</div></div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
          <Link to="/patient/doctors" className="btn btn-primary">📋 Book Appointment</Link>
          <Link to="/patient/appointments" className="btn btn-outline">View My Appointments</Link>
          <Link to="/patient/prescriptions" className="btn btn-outline">View Prescriptions</Link>
        </div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Recent Appointments</div></div>
        {(appointments as Appointment[]).length===0 ? <div style={{color:'var(--text3)',fontSize:13,padding:'14px 0'}}>No appointments yet. Click "Book Appointment" above.</div> :
          <table><thead><tr><th>Date</th><th>Time</th><th>Type</th><th>Complaint</th><th>Status</th></tr></thead>
          <tbody>{(appointments as Appointment[]).slice(0,5).map(a=><tr key={a.id}>
            <td>{a.date}</td><td>{a.time}</td>
            <td><span className={`badge ${a.type==='emergency'?'badge-danger':a.type==='walkin'?'badge-success':'badge-info'}`}>{a.type}</span></td>
            <td style={{fontSize:12}}>{a.complaint}</td>
            <td><span className={`badge ${a.status==='done'?'badge-success':a.status==='in-progress'?'badge-warning':'badge-info'}`}>{a.status}</span></td>
          </tr>)}</tbody></table>}
      </div>
    </>
  )
}
