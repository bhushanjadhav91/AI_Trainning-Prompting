import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { doctorApi } from '../../api'

export default function Shell() {
  const { clearAuth } = useAuthStore()
  const navigate = useNavigate()
  const role = sessionStorage.getItem('role') ?? ''
  const name = sessionStorage.getItem('name') ?? 'User'
  const [avail, setAvail] = useState('available')

  const initials = name.split(' ').filter(Boolean).map((s: string) => s[0]).join('').slice(0, 2).toUpperCase()
  const portalLabel = role === 'ADMIN' ? 'Admin Portal' : role === 'DOCTOR' ? 'Doctor Portal' : 'Patient Portal'

  useEffect(() => {
    if (role === 'DOCTOR') {
      doctorApi.myProfile().then(d => { if (d.availabilityStatus) setAvail(d.availabilityStatus) }).catch(() => {})
    }
  }, [role])

  function logout() { clearAuth(); navigate('/login') }

  function setAvailability(val: string) {
    setAvail(val)
    doctorApi.setAvailability(val).catch(() => {})
  }

  const nl = (_to: string) => ({ isActive }: { isActive: boolean }) => `nav-item${isActive ? ' active' : ''}`

  return (
    <div className="app" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <aside style={{ width: 230, background: 'var(--primary-dark)', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '22px 18px', borderBottom: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ fontFamily: "'Playfair Display',serif", color: '#fff', fontSize: 19, fontWeight: 600 }}>MedCare+</div>
          <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, marginTop: 2 }}>{portalLabel}</div>
        </div>

        <nav style={{ flex: 1, padding: '14px 0', overflowY: 'auto' }}>
          {role === 'ADMIN' && <>
            <NavLink to="/admin/dashboard"        className={nl('/admin/dashboard')}>📊 Dashboard</NavLink>
            <NavLink to="/admin/doctors"           className={nl('/admin/doctors')}>👨‍⚕️ Doctors</NavLink>
            <NavLink to="/admin/patients"          className={nl('/admin/patients')}>👥 Patients</NavLink>
            <NavLink to="/admin/appointments"      className={nl('/admin/appointments')}>📅 Appointments</NavLink>
            <NavLink to="/admin/bills"             className={nl('/admin/bills')}>💰 Billing</NavLink>
            <NavLink to="/admin/leaves"            className={nl('/admin/leaves')}>🌴 Leaves</NavLink>
            <NavLink to="/admin/clock"             className={nl('/admin/clock')}>🕐 Clock & Profile</NavLink>
            <NavLink to="/admin/audit"             className={nl('/admin/audit')}>🔍 Audit</NavLink>
            <div style={{ padding: '8px 18px 4px', fontSize: 10, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>HIS Modules</div>
            <NavLink to="/admin/his/registration"  className={nl('/admin/his/registration')}>🏥 OPD Registration</NavLink>
            <NavLink to="/admin/his/emergency"     className={nl('/admin/his/emergency')}>🚨 Emergency</NavLink>
            <NavLink to="/admin/his/ipd"           className={nl('/admin/his/ipd')}>🛏 IPD / Wards</NavLink>
            <NavLink to="/admin/his/lab"           className={nl('/admin/his/lab')}>🔬 Laboratory</NavLink>
            <NavLink to="/admin/his/radiology"     className={nl('/admin/his/radiology')}>📡 Radiology</NavLink>
            <NavLink to="/admin/his/pharmacy"      className={nl('/admin/his/pharmacy')}>💊 Pharmacy</NavLink>
          </>}
          {role === 'DOCTOR' && <>
            <NavLink to="/doctor/dashboard"        className={nl('/doctor/dashboard')}>📊 Dashboard</NavLink>
            <NavLink to="/doctor/appointments"     className={nl('/doctor/appointments')}>📅 Appointments</NavLink>
            <NavLink to="/doctor/patients"         className={nl('/doctor/patients')}>👤 My Patients</NavLink>
            <NavLink to="/doctor/prescriptions"    className={nl('/doctor/prescriptions')}>💊 Prescriptions</NavLink>
            <NavLink to="/doctor/timetable"        className={nl('/doctor/timetable')}>⏰ Timetable</NavLink>
            <NavLink to="/doctor/profile"          className={nl('/doctor/profile')}>👤 Profile & Leave</NavLink>
            <div style={{ padding: '8px 18px 4px', fontSize: 10, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>Clinical</div>
            <NavLink to="/doctor/his/lab"          className={nl('/doctor/his/lab')}>🔬 Lab Orders</NavLink>
            <NavLink to="/doctor/his/radiology"    className={nl('/doctor/his/radiology')}>📡 Radiology</NavLink>
            <NavLink to="/doctor/his/pharmacy"     className={nl('/doctor/his/pharmacy')}>💊 Pharmacy</NavLink>
            <NavLink to="/doctor/his/ipd"          className={nl('/doctor/his/ipd')}>🛏 IPD</NavLink>
          </>}
          {role === 'PATIENT' && <>
            <NavLink to="/patient/dashboard"       className={nl('/patient/dashboard')}>📊 Dashboard</NavLink>
            <NavLink to="/patient/doctors"         className={nl('/patient/doctors')}>👨‍⚕️ Find a Doctor</NavLink>
            <NavLink to="/patient/appointments"    className={nl('/patient/appointments')}>📅 Appointments</NavLink>
            <NavLink to="/patient/prescriptions"   className={nl('/patient/prescriptions')}>💊 Prescriptions</NavLink>
            <NavLink to="/patient/reports"         className={nl('/patient/reports')}>📋 Reports</NavLink>
            <NavLink to="/patient/payments"        className={nl('/patient/payments')}>💰 Payments</NavLink>
          </>}
        </nav>

        <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 600 }}>{initials}</div>
            <div>
              <div style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>{name}</div>
              <div style={{ color: 'rgba(255,255,255,.5)', fontSize: 11, textTransform: 'capitalize' }}>{role.toLowerCase()}</div>
            </div>
          </div>
        </div>
      </aside>

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 600, flex: 1 }}>{portalLabel}</div>
          {role === 'DOCTOR' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', background: 'var(--surface2)', borderRadius: 8 }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: avail === 'available' ? 'var(--emerald)' : avail === 'in-operation' ? 'var(--amber)' : 'var(--red)', display: 'inline-block' }} />
              <select value={avail} onChange={e => setAvailability(e.target.value)} style={{ padding: '5px 8px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6 }}>
                <option value="available">Available</option>
                <option value="in-operation">In Operation</option>
                <option value="away">Away</option>
              </select>
            </div>
          )}
          <button className="btn btn-outline btn-sm" onClick={logout}>Logout</button>
        </header>
        <main style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
          <Outlet />
        </main>
      </div>

      <style>{`
        .nav-item{display:block;padding:10px 18px;color:rgba(255,255,255,.72);text-decoration:none;font-size:13px;transition:background .15s}
        .nav-item:hover,.nav-item.active{background:rgba(255,255,255,.12);color:#fff}
        .app{display:flex;height:100vh;overflow:hidden}
      `}</style>
    </div>
  )
}
