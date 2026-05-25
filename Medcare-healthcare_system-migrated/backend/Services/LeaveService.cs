using MedCare.Api.Data;
using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Services;

/// <summary>Doctor leave service. Mirrors the Spring Boot <c>LeaveService</c>.</summary>
public class LeaveService
{
    private readonly MedCareDbContext _db;
    private readonly AuditService _audit;

    public LeaveService(MedCareDbContext db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<List<Leave>> FindAllAsync() =>
        await _db.Leaves.AsNoTracking().ToListAsync();

    public async Task<List<Leave>> FindByDoctorAsync(long id) =>
        await _db.Leaves.AsNoTracking().Where(l => l.DoctorId == id).ToListAsync();

    public async Task<Leave> ApplyAsync(Leave l, string user)
    {
        l.AppliedDate ??= DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");
        l.Status = "pending";
        _db.Leaves.Add(l);
        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Leave requested by {user} (Doctor #{l.DoctorId})", user);
        return l;
    }

    /// <summary>
    /// Approves or rejects a leave. Approving also flips the doctor's account status to
    /// 'on-leave', identical to the Spring implementation.
    /// </summary>
    public async Task<Leave> DecideAsync(long id, bool approve, string adminUser)
    {
        var leave = await _db.Leaves.FirstOrDefaultAsync(l => l.Id == id)
                    ?? throw ApiException.NotFound("Leave not found");

        leave.Status = approve ? "approved" : "rejected";

        if (approve)
        {
            var doc = await _db.Doctors.FirstOrDefaultAsync(d => d.Id == leave.DoctorId);
            if (doc is not null)
            {
                doc.AccountStatus = "on-leave";
            }
        }

        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            $"Leave #{id} {(approve ? "approved" : "rejected")}", adminUser);
        return leave;
    }
}
