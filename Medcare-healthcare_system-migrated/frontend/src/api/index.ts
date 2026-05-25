import { api } from '../lib/axios'
import type {
  Doctor, Patient, Appointment, Prescription, Leave, AuditLog,
  MedicalReport, Bill, Insurance, Registration, Admission,
  LabTest, RadiologyOrder, Medicine, DispenseRecord, Triage,
  DoctorProfileChange,
} from '../types'

const get = <T>(url: string, params?: Record<string, string>) =>
  api.get<T>(url, { params }).then(r => r.data)

const post = <T>(url: string, data?: unknown) =>
  api.post<T>(url, data).then(r => r.data)

const put = <T>(url: string, data?: unknown) =>
  api.put<T>(url, data).then(r => r.data)

const del = <T>(url: string) => api.delete<T>(url).then(r => r.data)

// ── AUTH ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (username: string, password: string) =>
    post<{ token: string; role: string; name: string; userId: number; redirectTo: string }>(
      '/auth/login', { username, password }),
  signup: (payload: unknown) => post('/auth/signup', payload),
  getQuestion: (username: string) => get<{ username: string; question: string; questionKey: string }>(
    '/auth/forgot/question', { username }),
  resetPassword: (payload: unknown) => post('/auth/forgot/reset', payload),
  emergency: (payload: unknown) => post('/emergency/book', payload),
}

// ── PUBLIC ────────────────────────────────────────────────────────────────────
export const publicApi = {
  doctors: () => get<Doctor[]>('/public/doctors'),
  slots: (doctorId: number, date: string) =>
    get<{ slots: string[]; reason?: string; availableFrom?: string }>(`/public/doctors/${doctorId}/slots`, { date }),
}

// ── ADMIN ─────────────────────────────────────────────────────────────────────
export const adminApi = {
  getDoctors: () => get<Doctor[]>('/admin/doctors'),
  addDoctor: (d: Doctor) => post<Doctor>('/admin/doctors', d),
  updateDoctor: (id: number, d: Doctor) => put<Doctor>(`/admin/doctors/${id}`, d),
  resetDoctorPw: (id: number, password: string) => put(`/admin/doctors/${id}/password`, { password }),
  deleteDoctor: (id: number) => del(`/admin/doctors/${id}`),
  getPatients: () => get<Patient[]>('/admin/patients'),
  getAppointments: () => get<Appointment[]>('/admin/appointments'),
  reassign: (id: number, doctorId: number) => put(`/admin/appointments/${id}/assign`, { doctorId }),
  markDone: (id: number) => put(`/admin/appointments/${id}/done`, {}),
  revertDone: (id: number) => put(`/admin/appointments/${id}/revert`, {}),
  getLeaves: () => get<Leave[]>('/admin/leaves'),
  decideLeave: (id: number, approve: boolean) => put(`/admin/leaves/${id}/approve`, { approve }),
  getAuditLogs: () => get<AuditLog[]>('/admin/audit-logs'),
  patientReports: (pid: number) => get<MedicalReport[]>(`/admin/patients/${pid}/reports`),
  patientInsurance: (pid: number) => get(`/admin/patients/${pid}/insurance`),
  allBills: () => get<Bill[]>('/admin/bills'),
  createBill: (b: Bill) => post<Bill>('/admin/bills', b),
  clockRecords: () => get<ClockRecord[]>('/admin/clock-records'),
  clockToday: () => get<ClockRecord[]>('/admin/clock-records/today'),
  pendingProfileChanges: () => get<DoctorProfileChange[]>('/admin/profile-changes'),
  approveProfileChange: (id: number, adminNote: string) =>
    put(`/admin/profile-changes/${id}/approve`, { adminNote }),
  rejectProfileChange: (id: number, adminNote: string) =>
    put(`/admin/profile-changes/${id}/reject`, { adminNote }),
}

type ClockRecord = { id: number; doctorId: number; doctorName: string; clockIn: string; clockOut?: string; durationMinutes?: number; date?: string }

// ── DOCTOR ────────────────────────────────────────────────────────────────────
export const doctorApi = {
  myAppointments: () => get<Appointment[]>('/doctor/me/appointments'),
  markDone: (id: number) => put(`/doctor/appointments/${id}/done`, {}),
  revertDone: (id: number) => put(`/doctor/appointments/${id}/revert`, {}),
  myPatients: () => get<Patient[]>('/doctor/me/patients'),
  registerPatient: (p: unknown) => post<Patient>('/doctor/patients/register', p),
  patientPrescriptions: (id: number) => get<Prescription[]>(`/doctor/patients/${id}/prescriptions`),
  patientReports: (id: number) => get<MedicalReport[]>(`/doctor/patients/${id}/reports`),
  patientBills: (id: number) => get<Bill[]>(`/doctor/patients/${id}/bills`),
  myPrescriptions: () => get<Prescription[]>('/doctor/me/prescriptions'),
  createPrescription: (p: Prescription) => post<Prescription>('/doctor/prescriptions', p),
  setAvailability: (status: string, availableUntil?: string, availableFrom?: string, note?: string) =>
    put<Doctor>('/doctor/me/availability', { status, availableUntil, availableFrom, note }),
  clockIn: () => post('/doctor/me/clock-in', {}),
  clockOut: () => post('/doctor/me/clock-out', {}),
  clockStatus: () => get<{ clockedIn: boolean; clockInTime?: string; sessionMinutes?: number }>('/doctor/me/clock-status'),
  clockHistory: () => get<ClockRecord[]>('/doctor/me/clock-history'),
  myProfile: () => get<Doctor>('/doctor/me/profile'),
  requestProfileChange: (c: DoctorProfileChange) => post('/doctor/me/profile-change', c),
  myProfileChanges: () => get<DoctorProfileChange[]>('/doctor/me/profile-changes'),
  myLeaves: () => get<Leave[]>('/doctor/me/leaves'),
  requestLeave: (l: Leave) => post<Leave>('/doctor/leaves', l),
  createBill: (b: Bill) => post<Bill>('/doctor/bills', b),
  patientCharges: (id: number) => get(`/doctor/patients/${id}/charges`),
}

// ── PATIENT ───────────────────────────────────────────────────────────────────
export const patientApi = {
  me: () => get<Patient>('/patient/me'),
  appointments: () => get<Appointment[]>('/patient/me/appointments'),
  prescriptions: () => get<Prescription[]>('/patient/me/prescriptions'),
  book: (payload: unknown) => post<Appointment>('/patient/me/appointments', payload),
  reports: () => get<MedicalReport[]>('/patient/me/reports'),
  uploadReport: (fd: FormData) => api.post<MedicalReport>('/patient/me/reports', fd).then(r => r.data),
  deleteReport: (id: number) => del(`/patient/me/reports/${id}`),
  bills: () => get<Bill[]>('/patient/me/bills'),
  charges: () => get('/patient/me/charges'),
  insurance: () => get('/patient/me/insurance'),
  saveInsurance: (ins: Insurance) => post<Insurance>('/patient/me/insurance', ins),
  payBill: (id: number, paymentMethod: string, transactionRef: string) =>
    put<Bill>(`/patient/me/bills/${id}/pay`, { paymentMethod, transactionRef }),
}

// ── HIS ───────────────────────────────────────────────────────────────────────
export const hisApi = {
  // Registration
  searchPatient: (query: string) => get<{ results: Patient[]; count: number }>('/registration/search', { query }),
  byUhid: (uhid: string) => get<Patient>(`/registration/uhid/${uhid}`),
  createRegistration: (r: Registration) => post<Registration>('/registration', r),
  registrations: () => get<Registration[]>('/registration'),
  patientRegistrations: (pid: number) => get<Registration[]>(`/registration/patient/${pid}`),
  doctorQueue: (did: number) => get<Registration[]>(`/registration/queue/doctor/${did}`),
  updateRegStatus: (id: number, status: string) => put<Registration>(`/registration/${id}/status`, { status }),
  todayStats: () => get('/registration/stats/today'),
  feeCatalogue: () => get('/registration/fee-catalogue'),
  // IPD
  admit: (a: Admission) => post<Admission>('/ipd/admit', a),
  discharge: (id: number, dischargeSummary: string) => put<Admission>(`/ipd/${id}/discharge`, { dischargeSummary }),
  transfer: (id: number, body: unknown) => put<Admission>(`/ipd/${id}/transfer`, body),
  admitted: () => get<Admission[]>('/ipd/admitted'),
  allAdmissions: () => get<Admission[]>('/ipd'),
  patientAdmissions: (pid: number) => get<Admission[]>(`/ipd/patient/${pid}`),
  bedStats: () => get('/ipd/beds/stats'),
  bedRates: () => get('/ipd/beds/rates'),
  // Lab
  orderLab: (t: LabTest) => post<LabTest>('/lab/order', t),
  collectSample: (id: number, collectedBy: string) => put<LabTest>(`/lab/${id}/collect`, { collectedBy }),
  enterResult: (id: number, result: string, referenceRange: string) =>
    put<LabTest>(`/lab/${id}/result`, { result, referenceRange }),
  allLab: () => get<LabTest[]>('/lab'),
  pendingLab: () => get<LabTest[]>('/lab/pending'),
  patientLab: (pid: number) => get<LabTest[]>(`/lab/patient/${pid}`),
  labCatalogue: () => get('/lab/catalogue'),
  orderMultipleLab: (body: unknown) => post('/lab/order-multiple', body),
  // Radiology
  orderImaging: (r: RadiologyOrder) => post<RadiologyOrder>('/radiology/order', r),
  imagingDone: (id: number) => put<RadiologyOrder>(`/radiology/${id}/imaging-done`, {}),
  submitRadReport: (id: number, findings: string, impression: string) =>
    put<RadiologyOrder>(`/radiology/${id}/report`, { findings, impression }),
  allRadiology: () => get<RadiologyOrder[]>('/radiology'),
  pendingImaging: () => get<RadiologyOrder[]>('/radiology/pending'),
  patientRadiology: (pid: number) => get<RadiologyOrder[]>(`/radiology/patient/${pid}`),
  imagingCatalogue: () => get('/radiology/catalogue'),
  orderMultipleImaging: (body: unknown) => post('/radiology/order-multiple', body),
  // Pharmacy
  medicines: () => get<Medicine[]>('/pharmacy/medicines'),
  searchMedicines: (q: string) => get<Medicine[]>('/pharmacy/medicines/search', { q }),
  lowStock: () => get<Medicine[]>('/pharmacy/medicines/low-stock'),
  addMedicine: (m: Medicine) => post<Medicine>('/pharmacy/medicines', m),
  updateStock: (id: number, qty: number) => put<Medicine>(`/pharmacy/medicines/${id}/stock`, { qty }),
  dispense: (r: DispenseRecord) => post<DispenseRecord>('/pharmacy/dispense', r),
  allDispenses: () => get<DispenseRecord[]>('/pharmacy/dispense'),
  patientDispenses: (pid: number) => get<DispenseRecord[]>(`/pharmacy/patient/${pid}`),
  dispenseMultiple: (body: unknown) => post('/pharmacy/dispense-multiple', body),
  // Emergency
  createTriage: (t: Triage) => post<Triage>('/emergency/triage', t),
  triageQueue: () => get<Triage[]>('/emergency/triage/queue'),
  allTriage: () => get<Triage[]>('/emergency/triage'),
  updateTriageStatus: (id: number, status: string) =>
    put<Triage>(`/emergency/triage/${id}/status`, { status }),
  triageCategories: () => get<unknown[]>('/emergency/triage/categories'),
}

// File viewer helper — fetches with auth header → object URL (never <img src>).
export async function viewFile(id: number): Promise<void> {
  const token = sessionStorage.getItem('token')
  const res = await fetch(`/api/reports/${id}/file`, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
  })
  if (!res.ok) throw new Error('Could not load file')
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
