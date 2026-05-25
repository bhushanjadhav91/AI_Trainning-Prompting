using MedCare.Api.Data;
using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Services;

/// <summary>
/// Doctor clock-in / clock-out service. Mirrors the Spring Boot <c>ClockService</c>.
/// </summary>
public class ClockService
{
    private readonly MedCareDbContext _db;
    private readonly AuditService _audit;

    public ClockService(MedCareDbContext db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    /// <summary>Clock in — fails if the doctor already has an open session.</summary>
    public async Task<ClockRecord> ClockInAsync(long doctorId, string user)
    {
        var active = await _db.ClockRecords
            .FirstOrDefaultAsync(c => c.DoctorId == doctorId && c.ClockOut == null);
        if (active is not null)
        {
            // Same substring(11,16) slice as Spring -> "HH:mm" of the ISO datetime.
            var since = active.ClockIn.Length >= 16
                ? active.ClockIn.Substring(11, 5)
                : active.ClockIn;
            throw new ApiException($"Already clocked in since {since}");
        }

        var doc = await _db.Doctors.FirstOrDefaultAsync(d => d.Id == doctorId)
                  ?? throw ApiException.NotFound("Doctor not found");

        // Clocking in flips availability to 'available', matching Spring.
        doc.AvailabilityStatus = "available";

        var now = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
        var rec = new ClockRecord
        {
            DoctorId = doctorId,
            DoctorName = doc.Name,
            ClockIn = now,
            Date = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd"),
        };
        _db.ClockRecords.Add(rec);
        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Doctor clocked in: {doc.Name}", user);
        return rec;
    }

    /// <summary>Clock out — fails if there is no open session.</summary>
    public async Task<ClockRecord> ClockOutAsync(long doctorId, string user)
    {
        var rec = await _db.ClockRecords
            .FirstOrDefaultAsync(c => c.DoctorId == doctorId && c.ClockOut == null)
            ?? throw new ApiException("Not clocked in");

        var nowDt = DateTime.Now;
        rec.ClockOut = nowDt.ToString("yyyy-MM-ddTHH:mm:ss");

        var inDt = DateTime.Parse(rec.ClockIn);
        rec.DurationMinutes = (long)Math.Floor((nowDt - inDt).TotalMinutes);

        // Clocking out flips availability to 'away', matching Spring.
        var doc = await _db.Doctors.FirstOrDefaultAsync(d => d.Id == doctorId);
        if (doc is not null)
        {
            doc.AvailabilityStatus = "away";
        }

        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            $"Doctor clocked out: {rec.DoctorName} ({rec.DurationMinutes} min)", user);
        return rec;
    }

    /// <summary>Current session status for a doctor.</summary>
    public async Task<object> StatusAsync(long doctorId)
    {
        var active = await _db.ClockRecords.AsNoTracking()
            .FirstOrDefaultAsync(c => c.DoctorId == doctorId && c.ClockOut == null);

        if (active is not null)
        {
            var inDt = DateTime.Parse(active.ClockIn);
            var minutes = (long)Math.Floor((DateTime.Now - inDt).TotalMinutes);
            return new
            {
                clockedIn = true,
                clockInTime = active.ClockIn.Length >= 16
                    ? active.ClockIn.Substring(11, 5)
                    : active.ClockIn,
                sessionMinutes = minutes,
                recordId = active.Id,
            };
        }

        return new { clockedIn = false };
    }

    public async Task<List<ClockRecord>> FindByDoctorAsync(long doctorId) =>
        await _db.ClockRecords.AsNoTracking()
            .Where(c => c.DoctorId == doctorId)
            .OrderByDescending(c => c.Id)
            .ToListAsync();

    public async Task<List<ClockRecord>> FindAllAsync() =>
        await _db.ClockRecords.AsNoTracking()
            .OrderByDescending(c => c.Id)
            .ToListAsync();

    public async Task<List<ClockRecord>> TodayAllAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");
        return await _db.ClockRecords.AsNoTracking()
            .Where(c => c.Date == today)
            .OrderByDescending(c => c.Id)
            .ToListAsync();
    }
}
