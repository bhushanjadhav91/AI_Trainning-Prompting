using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Data;

/// <summary>
/// EF Core DbContext for MedCare+. Mirrors the Spring Data JPA repository layer — one
/// <see cref="DbSet{TEntity}"/> per JPA <c>@Entity</c>. Unique indexes that were previously
/// expressed via JPA <c>@Column(unique = true)</c> are configured in
/// <see cref="OnModelCreating"/>.
/// </summary>
public class MedCareDbContext : DbContext
{
    public MedCareDbContext(DbContextOptions<MedCareDbContext> options) : base(options) { }

    public DbSet<Admin> Admins => Set<Admin>();
    public DbSet<Doctor> Doctors => Set<Doctor>();
    public DbSet<Patient> Patients => Set<Patient>();
    public DbSet<Appointment> Appointments => Set<Appointment>();
    public DbSet<Prescription> Prescriptions => Set<Prescription>();
    public DbSet<Leave> Leaves => Set<Leave>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<MedicalReport> MedicalReports => Set<MedicalReport>();
    public DbSet<Bill> Bills => Set<Bill>();
    public DbSet<Insurance> Insurances => Set<Insurance>();
    public DbSet<ClockRecord> ClockRecords => Set<ClockRecord>();
    public DbSet<DoctorProfileChange> DoctorProfileChanges => Set<DoctorProfileChange>();
    public DbSet<Registration> Registrations => Set<Registration>();
    public DbSet<Admission> Admissions => Set<Admission>();
    public DbSet<LabTest> LabTests => Set<LabTest>();
    public DbSet<RadiologyOrder> RadiologyOrders => Set<RadiologyOrder>();
    public DbSet<Medicine> Medicines => Set<Medicine>();
    public DbSet<DispenseRecord> DispenseRecords => Set<DispenseRecord>();
    public DbSet<Triage> Triages => Set<Triage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Unique indexes — required by the migration brief.
        modelBuilder.Entity<Admin>()
            .HasIndex(a => a.Username)
            .IsUnique();

        modelBuilder.Entity<Doctor>()
            .HasIndex(d => d.Email)
            .IsUnique();

        // Username is unique but nullable (walk-in patients have no portal account).
        modelBuilder.Entity<Patient>()
            .HasIndex(p => p.Username)
            .IsUnique();

        modelBuilder.Entity<Patient>()
            .HasIndex(p => p.Uhid)
            .IsUnique();

        modelBuilder.Entity<Insurance>()
            .HasIndex(i => i.PatientId)
            .IsUnique();

        modelBuilder.Entity<Registration>()
            .HasIndex(r => r.Token)
            .IsUnique();

        // Non-unique helper indexes mirroring the original schema.sql.
        modelBuilder.Entity<Appointment>().HasIndex(a => a.DoctorId);
        modelBuilder.Entity<Appointment>().HasIndex(a => a.PatientId);
        modelBuilder.Entity<Prescription>().HasIndex(p => p.PatientId);
        modelBuilder.Entity<MedicalReport>().HasIndex(r => r.PatientId);
        modelBuilder.Entity<Bill>().HasIndex(b => b.PatientId);
        modelBuilder.Entity<Bill>().HasIndex(b => b.Status);
        modelBuilder.Entity<Registration>().HasIndex(r => r.PatientId);
        modelBuilder.Entity<Admission>().HasIndex(a => a.PatientId);
        modelBuilder.Entity<Admission>().HasIndex(a => a.Status);
        modelBuilder.Entity<LabTest>().HasIndex(t => t.PatientId);
        modelBuilder.Entity<LabTest>().HasIndex(t => t.Status);
        modelBuilder.Entity<RadiologyOrder>().HasIndex(r => r.PatientId);
        modelBuilder.Entity<RadiologyOrder>().HasIndex(r => r.Status);
        modelBuilder.Entity<Medicine>().HasIndex(m => m.Active);
        modelBuilder.Entity<DispenseRecord>().HasIndex(d => d.PatientId);
        modelBuilder.Entity<ClockRecord>().HasIndex(c => c.DoctorId);
    }
}
