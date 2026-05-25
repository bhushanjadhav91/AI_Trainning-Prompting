using MedCare.Api.Data;
using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Services;

/// <summary>Prescription service. Mirrors the Spring Boot <c>PrescriptionService</c>.</summary>
public class PrescriptionService
{
    private readonly MedCareDbContext _db;
    private readonly AuditService _audit;

    public PrescriptionService(MedCareDbContext db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<List<Prescription>> FindByPatientAsync(long patientId) =>
        await _db.Prescriptions.AsNoTracking()
            .Where(p => p.PatientId == patientId)
            .ToListAsync();

    public async Task<List<Prescription>> FindByDoctorAsync(long doctorId) =>
        await _db.Prescriptions.AsNoTracking()
            .Where(p => p.DoctorId == doctorId)
            .ToListAsync();

    public async Task<Prescription> CreateAsync(Prescription p, string user)
    {
        p.Date ??= DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");
        _db.Prescriptions.Add(p);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            $"Prescription #{p.Id} issued for patient #{p.PatientId}", user);
        return p;
    }
}
