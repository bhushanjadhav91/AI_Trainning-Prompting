# MedCare+ v6 Migration

**Spring Boot 3.2.5 / Angular 17 → ASP.NET Core 8 / React 18**

## Stack

| Layer | Before | After |
|-------|--------|-------|
| Backend | Spring Boot 3.2.5, Java 21 | ASP.NET Core 8, C# 12 |
| ORM | Spring Data JPA / Hibernate | EF Core 8 (SQLite dev / PostgreSQL prod) |
| Auth | Spring Security + jjwt | JWT Bearer (HMAC-SHA256, identical claims) |
| Password | BCryptPasswordEncoder(12) | BCrypt.Net-Next (work factor 12) |
| Frontend | Angular 17 | React 18 + TypeScript strict |
| Bundler | Angular CLI | Vite 5 (port 4200) |
| State | Angular Services | Zustand (sessionStorage only) |
| Data fetching | HttpClient | TanStack Query + Axios |
| Forms | Reactive Forms | React Hook Form + Zod |
| Styles | Angular styles.css | Tailwind CSS + global CSS vars |

## Quick Start (Development)

**Linux/macOS:**
```bash
./run.sh
```

**Windows:**
```bat
run.bat
```

**Manual:**
```bash
# Backend (terminal 1)
cd backend && dotnet run

# Frontend (terminal 2)
cd frontend && npm install && npm run dev
```

- App: http://localhost:4200
- Swagger: http://localhost:8080/swagger
- Health: http://localhost:8080/actuator/health

## Demo Credentials

| Role | Username/Email | Password |
|------|---------------|----------|
| Admin | `admin` | `Admin@123` |
| Doctor | `priya@medcare.in` | `Doctor@123` |
| Patient | `aakash` | `Patient@123` |

## Docker (Production)

```bash
cp .env.example .env   # Edit DB_PASSWORD and JWT_SECRET
docker compose up -d
```

## Architecture

```
backend/
├── Controllers/   13 controllers (Auth, Admin, Doctor, Patient, Public,
│                  MedicalReport, Billing, Registration, Admission/IPD,
│                  Lab, Radiology+Pharmacy+Emergency)
├── Services/      19 services (mirrors Spring @Service beans)
├── Models/        19 EF Core entities (mirrors JPA @Entity)
├── Data/          MedCareDbContext with all unique indexes
├── Dtos/          Request/response DTOs (camelCase serialized)
├── Filters/       GlobalExceptionFilter → { "error": "..." }
└── Middleware/    SecurityHeadersMiddleware (X-Frame, CSP, HSTS)

frontend/src/
├── pages/
│   ├── auth/      Login · Signup · Forgot
│   ├── admin/     Dashboard · Doctors · Patients · Appointments ·
│   │              Bills · Leaves · Clock & Profile Changes · Audit
│   ├── doctor/    Dashboard · Appointments · Patients · Prescriptions ·
│   │              Timetable · Profile & Clock & Leave
│   ├── patient/   Dashboard · Find Doctor · Appointments · Prescriptions ·
│   │              Reports · Payments & Insurance
│   └── his/       OPD Registration · IPD/Wards · Laboratory ·
│                  Radiology · Pharmacy · Emergency Triage
├── api/           All API calls (authApi, publicApi, adminApi, doctorApi,
│                  patientApi, hisApi, viewFile)
├── store/         Zustand auth store (sessionStorage only)
├── types/         TypeScript interfaces for all 20+ entities
└── lib/           Axios instance with Bearer + 401 auto-logout
```

## Key Implementation Notes

- **JWT claims**: `sub` (username), `role`, `userId`, `name` — identical to Spring jjwt output
- **UHID**: `MED{YYYY}{NNNNNN}` e.g. `MED2024001234` (dark navy pill badge)
- **Token storage**: sessionStorage ONLY — cleared on logout and on any 401 response
- **File downloads**: `fetch()` + Authorization header + `createObjectURL()` — never `<img src>`
- **Slot conflict validation**: PatientController.Book() reproduces the Spring slot-validation rules exactly
- **Appointment view**: Always visible even when status = done (per original Angular behaviour)
- **"My Patients" bug-fix**: Derived from appointments table (all patients a doctor has seen), not just primary doctor FK
- **Charge range validation**: Lab and Radiology orders show red border if charge is outside catalogue min-max
- **Bed rates**: general=₹1500, semi-private=₹3500, private=₹7500, deluxe/ICU=₹20000, NICU/PICU=₹18000
- **DataSeeder**: Only runs in Development; seeds admin, 6 doctors, 5 patients, 7 medicines
- **No demo credentials on login screen** (emergency booking is anonymous, no leaked creds)
