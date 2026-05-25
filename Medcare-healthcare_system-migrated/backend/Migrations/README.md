# EF Core Migrations

In development (SQLite), the app uses `db.Database.EnsureCreatedAsync()` in `DataSeeder.cs`
which creates the schema automatically. No manual migration is needed for local development.

## To run EF migrations manually (when internet access is available):

```bash
# From the backend/ directory:
dotnet tool install --global dotnet-ef
dotnet ef migrations add InitialCreate
dotnet ef database update
```

## Production (PostgreSQL)
The `DATABASE_URL` connection string from the environment is used automatically.
The production schema is identical to the development SQLite schema.

## Table summary (19 entities):
- admins, doctors, patients
- appointments, prescriptions, leaves
- audit_logs, medical_reports
- bills, insurance
- clock_records, doctor_profile_changes
- registrations, admissions
- lab_tests, radiology_orders
- medicines, dispense_records, triage
