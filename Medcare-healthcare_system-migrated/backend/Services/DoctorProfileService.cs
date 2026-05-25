using MedCare.Api.Data;
using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Services;

/// <summary>
/// Doctor profile-change request workflow. Mirrors the Spring Boot <c>DoctorProfileService</c>.
/// A doctor submits a change request; an admin approves (which applies the changes to the
/// <see cref="Doctor"/> entity) or rejects it.
/// </summary>
public class DoctorProfileService
{
    private readonly MedCareDbContext _db;
    private readonly AuditService _audit;

    public DoctorProfileService(MedCareDbContext db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    /// <summary>Doctor submits a profile change request.</summary>
    public async Task<DoctorProfileChange> RequestAsync(DoctorProfileChange change, string user)
    {
        var doc = await _db.Doctors.FirstOrDefaultAsync(d => d.Id == change.DoctorId)
                  ?? throw ApiException.NotFound("Doctor not found");

        change.DoctorName = doc.Name;
        change.Status = "pending";
        change.AppliedAt = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");

        _db.DoctorProfileChanges.Add(change);
        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Profile change requested by Dr. {doc.Name}", user);
        return change;
    }

    public async Task<List<DoctorProfileChange>> PendingRequestsAsync() =>
        await _db.DoctorProfileChanges.AsNoTracking()
            .Where(c => c.Status == "pending")
            .OrderByDescending(c => c.Id)
            .ToListAsync();

    public async Task<List<DoctorProfileChange>> MyRequestsAsync(long doctorId) =>
        await _db.DoctorProfileChanges.AsNoTracking()
            .Where(c => c.DoctorId == doctorId)
            .OrderByDescending(c => c.Id)
            .ToListAsync();

    /// <summary>Admin approves — applies every non-blank requested field to the doctor entity.</summary>
    public async Task<DoctorProfileChange> ApproveAsync(long changeId, string adminNote, string adminUser)
    {
        var chg = await _db.DoctorProfileChanges.FirstOrDefaultAsync(c => c.Id == changeId)
                  ?? throw ApiException.NotFound("Change request not found");

        chg.Status = "approved";
        chg.AdminNote = adminNote;

        var doc = await _db.Doctors.FirstOrDefaultAsync(d => d.Id == chg.DoctorId)
                  ?? throw ApiException.NotFound("Doctor not found");

        if (!string.IsNullOrWhiteSpace(chg.NewName))
        {
            doc.Name = chg.NewName;
        }
        if (!string.IsNullOrWhiteSpace(chg.NewPhone))
        {
            doc.Phone = chg.NewPhone;
        }
        if (!string.IsNullOrWhiteSpace(chg.NewQualification))
        {
            doc.Qualification = chg.NewQualification;
        }
        if (!string.IsNullOrWhiteSpace(chg.NewExperience))
        {
            doc.Experience = chg.NewExperience;
        }
        if (!string.IsNullOrWhiteSpace(chg.NewSchedule))
        {
            doc.Schedule = chg.NewSchedule;
        }
        if (!string.IsNullOrWhiteSpace(chg.NewSpecialization))
        {
            doc.Specialization = chg.NewSpecialization;
        }

        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            $"Profile change #{changeId} approved for Dr. {doc.Name}", adminUser);
        return chg;
    }

    /// <summary>Admin rejects the change request.</summary>
    public async Task<DoctorProfileChange> RejectAsync(long changeId, string adminNote, string adminUser)
    {
        var chg = await _db.DoctorProfileChanges.FirstOrDefaultAsync(c => c.Id == changeId)
                  ?? throw ApiException.NotFound("Change request not found");

        chg.Status = "rejected";
        chg.AdminNote = adminNote;
        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Profile change #{changeId} rejected", adminUser);
        return chg;
    }
}
