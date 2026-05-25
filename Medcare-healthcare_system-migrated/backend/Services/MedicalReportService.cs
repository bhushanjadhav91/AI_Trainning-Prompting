using MedCare.Api.Data;
using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Services;

/// <summary>
/// Medical report service. Mirrors the Spring Boot <c>MedicalReportService</c>: persists report
/// metadata while delegating the actual file bytes to <see cref="FileStorageService"/>.
/// </summary>
public class MedicalReportService
{
    private readonly MedCareDbContext _db;
    private readonly FileStorageService _storage;
    private readonly AuditService _audit;

    public MedicalReportService(
        MedCareDbContext db, FileStorageService storage, AuditService audit)
    {
        _db = db;
        _storage = storage;
        _audit = audit;
    }

    /// <summary>Stores the uploaded file and persists the matching <see cref="MedicalReport"/> row.</summary>
    public async Task<MedicalReport> UploadAsync(
        long patientId, long? doctorId, IFormFile? file,
        string? reportType, string? description, string? reportDate, string performedBy)
    {
        var stored = await _storage.StoreAsync(file);

        var report = new MedicalReport
        {
            PatientId = patientId,
            DoctorId = doctorId,
            FileName = stored.OriginalName,
            StoredName = stored.StoredName,
            ContentType = stored.ContentType,
            FileSize = stored.Size,
            ReportType = string.IsNullOrWhiteSpace(reportType) ? "other" : reportType,
            Description = description,
            ReportDate = reportDate,
            UploadedAt = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss"),
        };

        _db.MedicalReports.Add(report);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            $"Medical report uploaded: {stored.OriginalName} (patient #{patientId})", performedBy);
        return report;
    }

    public async Task<List<MedicalReport>> FindByPatientAsync(long patientId) =>
        await _db.MedicalReports.AsNoTracking()
            .Where(r => r.PatientId == patientId)
            .OrderByDescending(r => r.Id)
            .ToListAsync();

    public async Task<MedicalReport> FindByIdAsync(long id) =>
        await _db.MedicalReports.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id)
        ?? throw ApiException.NotFound("Report not found");

    public async Task DeleteAsync(long id, string user)
    {
        var r = await _db.MedicalReports.FirstOrDefaultAsync(x => x.Id == id)
                ?? throw ApiException.NotFound("Report not found");

        _storage.Delete(r.StoredName);
        _db.MedicalReports.Remove(r);
        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Medical report deleted: {r.FileName}", user);
    }
}
