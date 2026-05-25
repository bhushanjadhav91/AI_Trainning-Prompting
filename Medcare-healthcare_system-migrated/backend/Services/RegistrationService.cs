using MedCare.Api.Data;
using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Services;

/// <summary>
/// OPD reception / registration service. Mirrors the Spring Boot <c>RegistrationService</c>.
/// </summary>
public class RegistrationService
{
    private readonly MedCareDbContext _db;
    private readonly UHIDService _uhid;
    private readonly AuditService _audit;

    public RegistrationService(MedCareDbContext db, UHIDService uhid, AuditService audit)
    {
        _db = db;
        _uhid = uhid;
        _audit = audit;
    }

    /// <summary>
    /// Creates an OPD registration: generates a token, estimates the consultation time
    /// (+15 min per patient already waiting) and builds the QR data string.
    /// </summary>
    public async Task<Registration> CreateAsync(Registration reg, string performedBy)
    {
        var now = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
        if (string.IsNullOrWhiteSpace(reg.RegistrationDateTime))
        {
            reg.RegistrationDateTime = now;
        }
        reg.Status ??= "waiting";

        if (string.IsNullOrWhiteSpace(reg.Token))
        {
            var date = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");
            var seq = await _db.Registrations
                .CountAsync(r => r.RegistrationDateTime.StartsWith(date)) + 1;
            reg.Token = _uhid.GenerateToken(date, seq);
        }

        var waiting = await _db.Registrations.CountAsync(r => r.Status == "waiting");
        var est = DateTime.Now.AddMinutes(15 * (waiting + 1));
        reg.EstimatedTime = est.ToString("HH:mm");

        reg.QrData = _uhid.BuildQrData(reg.Uhid, reg.Token, reg.RegistrationDateTime, string.Empty);

        _db.Registrations.Add(reg);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            $"OPD Registration: token={reg.Token} UHID={reg.Uhid}", performedBy);
        return reg;
    }

    /// <summary>Today's OPD queue for a specific doctor.</summary>
    public async Task<List<Registration>> TodayQueueAsync(long doctorId)
    {
        var today = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");
        return await _db.Registrations.AsNoTracking()
            .Where(r => r.RegistrationDateTime.StartsWith(today) && r.DoctorId == doctorId)
            .ToListAsync();
    }

    public async Task<List<Registration>> FindByPatientAsync(long patientId) =>
        await _db.Registrations.AsNoTracking()
            .Where(r => r.PatientId == patientId)
            .OrderByDescending(r => r.Id)
            .ToListAsync();

    public async Task<List<Registration>> FindAllAsync() =>
        await _db.Registrations.AsNoTracking().ToListAsync();

    public async Task<Registration> UpdateStatusAsync(long id, string status, string user)
    {
        var r = await _db.Registrations.FirstOrDefaultAsync(x => x.Id == id)
                ?? throw ApiException.NotFound("Registration not found");

        r.Status = status;
        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Registration {id} status → {status}", user);
        return r;
    }

    /// <summary>Today's registration statistics for the reception dashboard.</summary>
    public async Task<object> TodayStatsAsync()
    {
        var today = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");
        var todayRegs = await _db.Registrations.AsNoTracking()
            .Where(r => r.RegistrationDateTime.StartsWith(today))
            .ToListAsync();

        return new
        {
            total = todayRegs.Count,
            done = todayRegs.Count(r => r.Status == "done"),
            waiting = todayRegs.Count(r => r.Status == "waiting"),
            revenue = todayRegs.Sum(r => r.RegistrationFee),
        };
    }
}
