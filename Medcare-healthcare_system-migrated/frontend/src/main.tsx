import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles.css'

const qc = new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } })

// ── Lazy pages (code-split) ────────────────────────────────────────────────────
const Login    = React.lazy(() => import('./pages/auth/Login'))
const Signup   = React.lazy(() => import('./pages/auth/Signup'))
const Forgot   = React.lazy(() => import('./pages/auth/Forgot'))
const Shell    = React.lazy(() => import('./components/layout/Shell'))

// Admin
const AdminDashboard    = React.lazy(() => import('./pages/admin/Dashboard'))
const AdminDoctors      = React.lazy(() => import('./pages/admin/Doctors'))
const AdminPatients     = React.lazy(() => import('./pages/admin/Patients'))
const AdminAppointments = React.lazy(() => import('./pages/admin/Appointments'))
const AdminBills        = React.lazy(() => import('./pages/admin/Bills'))
const AdminLeaves       = React.lazy(() => import('./pages/admin/Leaves'))
const AdminAudit        = React.lazy(() => import('./pages/admin/Audit'))
const AdminClock        = React.lazy(() => import('./pages/admin/Clock'))

// Doctor
const DoctorDashboard    = React.lazy(() => import('./pages/doctor/Dashboard'))
const DoctorAppointments = React.lazy(() => import('./pages/doctor/Appointments'))
const DoctorPatients     = React.lazy(() => import('./pages/doctor/Patients'))
const DoctorPrescriptions= React.lazy(() => import('./pages/doctor/Prescriptions'))
const DoctorTimetable    = React.lazy(() => import('./pages/doctor/Timetable'))
const DoctorProfile      = React.lazy(() => import('./pages/doctor/Profile'))

// Patient
const PatientDashboard    = React.lazy(() => import('./pages/patient/Dashboard'))
const PatientDoctors      = React.lazy(() => import('./pages/patient/Doctors'))
const PatientAppointments = React.lazy(() => import('./pages/patient/Appointments'))
const PatientPrescriptions= React.lazy(() => import('./pages/patient/Prescriptions'))
const PatientReports      = React.lazy(() => import('./pages/patient/Reports'))
const PatientPayments     = React.lazy(() => import('./pages/patient/Payments'))

// HIS
const HisRegistration = React.lazy(() => import('./pages/his/Registration'))
const HisIpd          = React.lazy(() => import('./pages/his/Ipd'))
const HisLab          = React.lazy(() => import('./pages/his/Lab'))
const HisRadiology    = React.lazy(() => import('./pages/his/Radiology'))
const HisPharmacy     = React.lazy(() => import('./pages/his/Pharmacy'))
const HisEmergency    = React.lazy(() => import('./pages/his/Emergency'))

// ── Guards ────────────────────────────────────────────────────────────────────
function Guard({ role, children }: { role: string; children: React.ReactNode }) {
  const r = sessionStorage.getItem('role')
  const t = sessionStorage.getItem('token')
  if (!t || r !== role) return <Navigate to="/login" replace />
  return <>{children}</>
}

const S = ({ children }: { children: React.ReactNode }) => (
  <React.Suspense fallback={<div className="flex h-screen items-center justify-center text-primary">Loading…</div>}>
    {children}
  </React.Suspense>
)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <BrowserRouter>
        <S>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login"  element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot" element={<Forgot />} />

            {/* ADMIN */}
            <Route path="/admin" element={<Guard role="ADMIN"><Shell /></Guard>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"       element={<AdminDashboard />} />
              <Route path="doctors"         element={<AdminDoctors />} />
              <Route path="patients"        element={<AdminPatients />} />
              <Route path="appointments"    element={<AdminAppointments />} />
              <Route path="bills"           element={<AdminBills />} />
              <Route path="leaves"          element={<AdminLeaves />} />
              <Route path="audit"           element={<AdminAudit />} />
              <Route path="clock"           element={<AdminClock />} />
              <Route path="his/registration"element={<HisRegistration />} />
              <Route path="his/ipd"         element={<HisIpd />} />
              <Route path="his/lab"         element={<HisLab />} />
              <Route path="his/radiology"   element={<HisRadiology />} />
              <Route path="his/pharmacy"    element={<HisPharmacy />} />
              <Route path="his/emergency"   element={<HisEmergency />} />
            </Route>

            {/* DOCTOR */}
            <Route path="/doctor" element={<Guard role="DOCTOR"><Shell /></Guard>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"      element={<DoctorDashboard />} />
              <Route path="appointments"   element={<DoctorAppointments />} />
              <Route path="patients"       element={<DoctorPatients />} />
              <Route path="prescriptions"  element={<DoctorPrescriptions />} />
              <Route path="timetable"      element={<DoctorTimetable />} />
              <Route path="profile"        element={<DoctorProfile />} />
              <Route path="his/lab"        element={<HisLab />} />
              <Route path="his/radiology"  element={<HisRadiology />} />
              <Route path="his/pharmacy"   element={<HisPharmacy />} />
              <Route path="his/ipd"        element={<HisIpd />} />
            </Route>

            {/* PATIENT */}
            <Route path="/patient" element={<Guard role="PATIENT"><Shell /></Guard>}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"     element={<PatientDashboard />} />
              <Route path="doctors"       element={<PatientDoctors />} />
              <Route path="appointments"  element={<PatientAppointments />} />
              <Route path="prescriptions" element={<PatientPrescriptions />} />
              <Route path="reports"       element={<PatientReports />} />
              <Route path="payments"      element={<PatientPayments />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </S>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)
