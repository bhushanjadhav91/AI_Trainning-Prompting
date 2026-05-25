// ─── Auth ────────────────────────────────────────────────────────────────────
export interface LoginResponse {
  token: string
  role: 'ADMIN' | 'DOCTOR' | 'PATIENT'
  name: string
  userId: number
  redirectTo: string
}

export interface SecurityQuestion {
  username: string
  question: string
  questionKey: string
}

// ─── Core entities ────────────────────────────────────────────────────────────
export interface Doctor {
  id?: number
  name: string
  specialization: string
  email: string
  password?: string
  phone?: string
  schedule?: string
  experience?: string
  qualification?: string
  accountStatus?: string
  availabilityStatus?: string
  availableFrom?: string
  availableUntil?: string
  availabilityNote?: string
  activePatients?: number
}

export interface Patient {
  id?: number
  name: string
  age: number
  gender: string
  contact: string
  bloodGroup?: string
  allergies?: string
  address?: string
  history?: string
  lastVisit?: string
  doctorId?: number
  username?: string
  uhid?: string
  dob?: string
  aadhaarNo?: string
  abhaNo?: string
  email?: string
  paymentCategory?: string
  tpaName?: string
  maritalStatus?: string
  religion?: string
  nationality?: string
  occupation?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  emergencyContactRelation?: string
}

export interface Appointment {
  id?: number
  patientId: number
  doctorId: number
  type: string
  status: string
  date?: string
  time?: string
  complaint?: string
  priority?: number
  uhid?: string
  visitType?: string
  consultationFee?: number
}

export interface Prescription {
  id?: number
  patientId: number
  doctorId: number
  date?: string
  medicines?: string
  dosage?: string
  duration?: string
  tests?: string
  diet?: string
  notes?: string
}

export interface Leave {
  id?: number
  doctorId: number
  fromDate: string
  toDate: string
  reason: string
  status?: string
  appliedDate?: string
}

export interface AuditLog {
  id?: number
  action: string
  performedBy: string
  timestamp: string
}

export interface MedicalReport {
  id?: number
  patientId: number
  doctorId?: number
  fileName: string
  storedName: string
  contentType?: string
  fileSize?: number
  reportType: string
  description?: string
  reportDate?: string
  uploadedAt: string
}

export interface Bill {
  id?: number
  patientId: number
  doctorId?: number
  appointmentId?: number
  invoiceNumber?: string
  billDate?: string
  description: string
  consultationFee: number
  medicineCost: number
  labTestCost: number
  otherCharges: number
  totalAmount?: number
  insuranceCovered: number
  amountPayable?: number
  status?: string
  paymentMethod?: string
  paymentDate?: string
  transactionRef?: string
}

export interface Insurance {
  id?: number
  patientId: number
  providerName: string
  policyNumber: string
  policyHolderName: string
  validFrom: string
  validTo: string
  sumInsured: number
  amountUsed: number
  coverageType?: string
  contactNumber?: string
  tpaName?: string
}

// ─── HIS entities ─────────────────────────────────────────────────────────────
export interface Registration {
  id?: number
  patientId: number
  uhid: string
  doctorId: number
  token?: string
  arrivalType?: string
  paymentCategory?: string
  registrationFee?: number
  paymentMethod?: string
  estimatedTime?: string
  registrationDateTime?: string
  qrData?: string
  status?: string
  notes?: string
}

export interface Admission {
  id?: number
  patientId: number
  uhid: string
  doctorId?: number
  bedType: string
  bedNumber?: string
  wardName?: string
  admissionDate?: string
  tentativeDischargeDate?: string
  actualDischargeDate?: string
  admissionDiagnosis?: string
  finalDiagnosis?: string
  bedChargePerDay?: number
  totalBedCharges?: number
  paymentCategory?: string
  tpaName?: string
  insuranceAuthNumber?: string
  status?: string
  dischargeSummary?: string
  nursingStation?: string
}

export interface LabTest {
  id?: number
  patientId: number
  uhid: string
  doctorId?: number
  admissionId?: number
  testName: string
  testCode: string
  category?: string
  priority?: string
  sampleType?: string
  sampleCollectedAt?: string
  result?: string
  referenceRange?: string
  resultEnteredAt?: string
  status?: string
  charges?: number
  orderedAt?: string
  notes?: string
}

export interface RadiologyOrder {
  id?: number
  patientId: number
  uhid: string
  doctorId?: number
  admissionId?: number
  imagingType: string
  bodyPart: string
  contrast?: string
  clinicalNotes?: string
  priority?: string
  findings?: string
  impression?: string
  reportedAt?: string
  reportedBy?: string
  pacsAccessionNumber?: string
  status?: string
  charges?: number
  orderedAt?: string
}

export interface Medicine {
  id?: number
  name: string
  brandName?: string
  manufacturer?: string
  category: string
  composition?: string
  strength?: string
  stockQuantity?: number
  reorderLevel?: number
  unitPrice?: number
  batchNumber?: string
  expiryDate?: string
  storageLocation?: string
  active?: boolean
}

export interface DispenseRecord {
  id?: number
  patientId: number
  uhid: string
  prescriptionId?: number
  admissionId?: number
  medicineId: number
  medicineName?: string
  quantity: number
  unitPrice?: number
  totalPrice?: number
  dispensedAt?: string
  dispensedBy?: string
  status?: string
}

export interface Triage {
  id?: number
  patientId?: number
  uhid?: string
  patientName: string
  patientAge?: string
  patientGender?: string
  contactNumber?: string
  chiefComplaint: string
  triageCategory?: number
  bloodPressure?: string
  pulse?: string
  temperature?: string
  spO2?: string
  respiratoryRate?: string
  bloodSugar?: string
  gcsScore?: string
  assignedDoctorId?: number
  appointmentId?: number
  modeOfArrival?: string
  status?: string
  triageTime?: string
  notes?: string
}

export interface ClockRecord {
  id?: number
  doctorId: number
  doctorName: string
  clockIn: string
  clockOut?: string
  durationMinutes?: number
  date?: string
}

export interface DoctorProfileChange {
  id?: number
  doctorId: number
  doctorName?: string
  newName?: string
  newPhone?: string
  newQualification?: string
  newExperience?: string
  newSchedule?: string
  newSpecialization?: string
  reason?: string
  status?: string
  appliedAt?: string
  adminNote?: string
}
