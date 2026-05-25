// ============================================================
// ADMIN DASHBOARD
// ============================================================
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../../api'
import type { Doctor, Appointment, Leave } from '../../types'

export default function AdminDashboard() {
  const { data: appointments = [] } = useQuery({ queryKey: ['admin-appts'], queryFn: adminApi.getAppointments })
  const { data: doctors = [] } = useQuery({ queryKey: ['admin-docs'], queryFn: adminApi.getDoctors })
  const { data: leaves = [] } = useQuery({ queryKey: ['admin-leaves'], queryFn: adminApi.getLeaves })

  const emergencyCount = appointments.filter((a: Appointment) => a.type === 'emergency' && a.status !== 'done').length
  const pendingLeaves = leaves.filter((l: Leave) => l.status === 'pending').length

  return (
    <>
      <div className="stats-grid">
        {[
          { icon:'📅', val: appointments.length, label:'Total Appointments', bg:'var(--primary-light)', c:'var(--primary)' },
          { icon:'👨‍⚕️', val: doctors.length, label:'Total Doctors', bg:'var(--emerald-light)', c:'var(--emerald)' },
          { icon:'⚡', val: emergencyCount, label:'Active Emergencies', bg:'var(--red-light)', c:'var(--red)' },
          { icon:'🌴', val: pendingLeaves, label:'Pending Leaves', bg:'var(--amber-light)', c:'var(--amber)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.c }}>{s.icon}</div>
            <div className="stat-value">{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>
      {emergencyCount > 0 && <div className="notif notif-danger">⚡ <strong>{emergencyCount} emergency patient(s)</strong> awaiting immediate attention.</div>}
      <div className="card">
        <div className="card-header"><div className="card-title">Doctor Availability</div></div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
          {doctors.map((d: Doctor) => (
            <div key={d.id} style={{ padding:14,background:'var(--bg)',borderRadius:'var(--radius)',border:'1px solid var(--border)' }}>
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:8 }}>
                <div style={{ width:32,height:32,borderRadius:'50%',background:'var(--primary-light)',color:'var(--primary)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600 }}>
                  {d.name.split(' ').filter(Boolean).slice(1).map(s=>s[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div><div style={{ fontWeight:600,fontSize:13 }}>{d.name}</div><div style={{ fontSize:11,color:'var(--text3)' }}>{d.specialization}</div></div>
              </div>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                <span className={`badge ${d.availabilityStatus==='available'?'badge-success':d.availabilityStatus==='in-operation'?'badge-warning':'badge-danger'}`}>{d.availabilityStatus}</span>
                <span style={{ fontSize:11,color:'var(--text3)' }}>{d.activePatients} patients</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="card">
        <div className="card-header"><div className="card-title">Today's Queue (Top 5)</div></div>
        <table>
          <thead><tr><th>Type</th><th>Patient ID</th><th>Doctor ID</th><th>Time</th><th>Status</th></tr></thead>
          <tbody>
            {appointments.slice(0,5).map((a: Appointment) => (
              <tr key={a.id}>
                <td><span className={`badge ${a.type==='emergency'?'badge-danger':a.type==='walkin'?'badge-success':'badge-info'}`}>{a.type}</span></td>
                <td>#{a.patientId}</td><td>#{a.doctorId}</td><td>{a.time}</td>
                <td><span className={`badge ${a.status==='done'?'badge-success':a.status==='in-progress'?'badge-warning':'badge-info'}`}>{a.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
