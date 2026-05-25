using MedCare.Api.Data;
using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Services;

/// <summary>
/// Emergency triage service. Mirrors the Spring Boot <c>TriageService</c>. The active queue is
/// sorted by triage category ascending (1 = most critical first), then by id.
/// </summary>
public class TriageService
{
    private readonly MedCareDbContext _db;
    private readonly AuditService _audit;

    public TriageService(MedCareDbContext db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<Triage> TriageAsync(Triage t, string user)
    {
        t.TriageTime ??= DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
        if (string.IsNullOrWhiteSpace(t.Status))
        {
            t.Status = "triaged";
        }

        _db.Triages.Add(t);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            $"Triage: {t.PatientName} category={t.TriageCategory}", user);
        return t;
    }

    public async Task<Triage> UpdateStatusAsync(
        long id, string status, long? appointmentId, long? patientId, string? uhid, string user)
    {
        var t = await _db.Triages.FirstOrDefaultAsync(x => x.Id == id)
                ?? throw ApiException.NotFound("Triage not found");

        t.Status = status;
        if (appointmentId is not null)
        {
            t.AppointmentId = appointmentId;
        }
        if (patientId is not null)
        {
            t.PatientId = patientId;
        }
        if (uhid is not null)
        {
            t.Uhid = uhid;
        }

        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Triage {id} → {status}", user);
        return t;
    }

    /// <summary>Active triage queue, sorted by category (1=most urgent first) then id.</summary>
    public async Task<List<Triage>> ActiveQueueAsync() =>
        await _db.Triages.AsNoTracking()
            .Where(t => t.Status == "triaged")
            .OrderBy(t => t.TriageCategory)
            .ThenBy(t => t.Id)
            .ToListAsync();

    public async Task<List<Triage>> FindAllAsync() =>
        await _db.Triages.AsNoTracking()
            .OrderBy(t => t.TriageCategory)
            .ThenBy(t => t.Id)
            .ToListAsync();

    public async Task<List<Triage>> FindByPatientAsync(long patientId) =>
        await _db.Triages.AsNoTracking()
            .Where(t => t.PatientId == patientId)
            .OrderByDescending(t => t.Id)
            .ToListAsync();
}
