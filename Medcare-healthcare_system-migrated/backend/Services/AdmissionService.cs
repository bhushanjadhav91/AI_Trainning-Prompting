using MedCare.Api.Data;
using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Services;

/// <summary>
/// IPD admission service covering the Admit / Discharge / Transfer lifecycle and bed management.
/// Mirrors the Spring Boot <c>AdmissionService</c>.
/// </summary>
public class AdmissionService
{
    private readonly MedCareDbContext _db;
    private readonly AuditService _audit;

    /// <summary>Standard bed rate map (INR/day) — identical to the Spring static map.</summary>
    public static readonly IReadOnlyDictionary<string, double> BedRates =
        new Dictionary<string, double>
        {
            ["general"] = 1500.0,
            ["semi-private"] = 3500.0,
            ["private"] = 7500.0,
            ["deluxe"] = 20000.0,
            ["icu"] = 20000.0,
            ["nicu"] = 18000.0,
            ["picu"] = 18000.0,
        };

    public AdmissionService(MedCareDbContext db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<Admission> AdmitAsync(Admission adm, string user)
    {
        var now = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
        if (string.IsNullOrWhiteSpace(adm.AdmissionDate))
        {
            adm.AdmissionDate = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");
        }
        if (string.IsNullOrWhiteSpace(adm.Status))
        {
            adm.Status = "admitted";
        }
        adm.CreatedAt = now;
        adm.UpdatedAt = now;

        adm.BedChargePerDay = BedRates.GetValueOrDefault(adm.BedType, 1500.0);

        _db.Admissions.Add(adm);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            $"IPD Admission: patient#{adm.PatientId} bed={adm.BedType}", user);
        return adm;
    }

    /// <summary>Discharges a patient and auto-calculates the total bed charges (days x rate).</summary>
    public async Task<Admission> DischargeAsync(long id, string dischargeSummary, string user)
    {
        var adm = await _db.Admissions.FirstOrDefaultAsync(a => a.Id == id)
                  ?? throw ApiException.NotFound("Admission not found");

        adm.ActualDischargeDate = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");
        adm.DischargeSummary = dischargeSummary;
        adm.Status = "discharged";
        adm.UpdatedAt = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");

        var from = DateOnly.Parse(adm.AdmissionDate);
        var to = DateOnly.FromDateTime(DateTime.Now);
        var days = Math.Max(1, to.DayNumber - from.DayNumber);
        adm.TotalBedCharges = days * adm.BedChargePerDay;

        await _db.SaveChangesAsync();
        await _audit.LogAsync($"IPD Discharge: admission#{id} days={days}", user);
        return adm;
    }

    /// <summary>
    /// Transfers a patient to a different bed/ward: closes the old admission and opens a new one,
    /// exactly as the Spring service does.
    /// </summary>
    public async Task<Admission> TransferAsync(
        long id, string newBedType, string? newBedNumber, string? newWard, string user)
    {
        var adm = await _db.Admissions.FirstOrDefaultAsync(a => a.Id == id)
                  ?? throw ApiException.NotFound("Admission not found");

        var now = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
        adm.Status = "transferred";
        adm.ActualDischargeDate = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");
        adm.UpdatedAt = now;

        var transferred = new Admission
        {
            PatientId = adm.PatientId,
            Uhid = adm.Uhid,
            DoctorId = adm.DoctorId,
            BedType = newBedType,
            BedNumber = newBedNumber,
            WardName = newWard,
            AdmissionDate = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd"),
            AdmissionDiagnosis = adm.AdmissionDiagnosis,
            PaymentCategory = adm.PaymentCategory,
            TpaName = adm.TpaName,
            BedChargePerDay = BedRates.GetValueOrDefault(newBedType, 1500.0),
            NursingStation = newWard,
            Status = "admitted",
            CreatedAt = now,
            UpdatedAt = now,
        };

        _db.Admissions.Add(transferred);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            $"IPD Transfer: patient#{adm.PatientId} to {newBedType}", user);
        return transferred;
    }

    public async Task<List<Admission>> FindByPatientAsync(long patientId) =>
        await _db.Admissions.AsNoTracking()
            .Where(a => a.PatientId == patientId)
            .OrderByDescending(a => a.Id)
            .ToListAsync();

    public async Task<List<Admission>> FindAdmittedAsync() =>
        await _db.Admissions.AsNoTracking().Where(a => a.Status == "admitted").ToListAsync();

    public async Task<List<Admission>> FindAllAsync() =>
        await _db.Admissions.AsNoTracking().ToListAsync();

    /// <summary>Bed occupancy statistics plus the standard rate card.</summary>
    public async Task<object> BedStatsAsync()
    {
        var active = await _db.Admissions.AsNoTracking()
            .Where(a => a.Status == "admitted")
            .ToListAsync();

        var byType = BedRates.Keys.ToDictionary(
            t => t,
            t => (long)active.Count(a => a.BedType == t));

        return new
        {
            occupiedBeds = active.Count,
            byType,
            rates = BedRates,
        };
    }
}
