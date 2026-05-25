using MedCare.Api.Data;
using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Services;

/// <summary>
/// Patient service. Mirrors the Spring Boot <c>PatientService</c>, including the v2 bug-fix
/// where "My Patients" is derived from the appointments table (every patient a doctor has
/// actually seen) rather than only patients whose primary doctor matches.
/// </summary>
public class PatientService
{
    private readonly MedCareDbContext _db;
    private readonly AuditService _audit;
    private readonly UHIDService _uhid;

    public PatientService(MedCareDbContext db, AuditService audit, UHIDService uhid)
    {
        _db = db;
        _audit = audit;
        _uhid = uhid;
    }

    public async Task<List<Patient>> FindAllAsync()
    {
        var all = await _db.Patients.AsNoTracking().ToListAsync();
        all.ForEach(p => p.Password = null);
        return all;
    }

    /// <summary>
    /// BUG FIX (carried over from Spring v2): returns every distinct patient this doctor has
    /// seen via the appointments table — walk-ins, reassignments and emergency cases included.
    /// </summary>
    public async Task<List<Patient>> FindByDoctorAsync(long doctorId)
    {
        var patientIds = await _db.Appointments
            .Where(a => a.DoctorId == doctorId)
            .Select(a => a.PatientId)
            .Distinct()
            .ToListAsync();

        var patients = await _db.Patients
            .AsNoTracking()
            .Where(p => patientIds.Contains(p.Id))
            .ToListAsync();

        patients.ForEach(p => p.Password = null);
        return patients;
    }

    public async Task<Patient> FindByIdAsync(long id)
    {
        var p = await _db.Patients.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id)
                ?? throw ApiException.NotFound("Patient not found");
        p.Password = null;
        return p;
    }

    public async Task<Patient> FindByUhidAsync(string uhid)
    {
        var p = await _db.Patients.AsNoTracking().FirstOrDefaultAsync(x => x.Uhid == uhid)
                ?? throw ApiException.NotFound($"Patient not found for UHID: {uhid}");
        p.Password = null;
        return p;
    }

    /// <summary>Search by UHID, mobile, name, Aadhaar or ABHA — same precedence as Spring.</summary>
    public async Task<object> SearchAsync(string query)
    {
        var results = new List<Patient>();

        var byUhid = await _db.Patients.AsNoTracking().FirstOrDefaultAsync(p => p.Uhid == query);
        if (byUhid is not null)
        {
            results.Add(byUhid);
        }

        if (results.Count == 0)
        {
            var byContact = await _db.Patients.AsNoTracking()
                .FirstOrDefaultAsync(p => p.Contact == query);
            if (byContact is not null)
            {
                results.Add(byContact);
            }
        }

        if (results.Count == 0)
        {
            var byAadhaar = await _db.Patients.AsNoTracking()
                .FirstOrDefaultAsync(p => p.AadhaarNo == query);
            if (byAadhaar is not null)
            {
                results.Add(byAadhaar);
            }
        }

        if (results.Count == 0)
        {
            var byAbha = await _db.Patients.AsNoTracking()
                .FirstOrDefaultAsync(p => p.AbhaNo == query);
            if (byAbha is not null)
            {
                results.Add(byAbha);
            }
        }

        if (results.Count == 0 && query.Length >= 2)
        {
            var byName = await _db.Patients.AsNoTracking()
                .Where(p => EF.Functions.Like(p.Name, $"%{query}%"))
                .ToListAsync();
            results.AddRange(byName);
        }

        results.ForEach(p => p.Password = null);
        return new { results, count = results.Count };
    }

    /// <summary>
    /// Registers a walk-in patient and creates the corresponding waiting appointment.
    /// Generates a UHID if the patient does not already have one.
    /// </summary>
    public async Task<Patient> RegisterAsync(
        Patient p, long doctorId, string? complaint, string? type, string? time, string user)
    {
        p.DoctorId = doctorId;
        p.LastVisit = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");
        p.Role = "PATIENT";

        if (string.IsNullOrWhiteSpace(p.Uhid))
        {
            p.Uhid = await _uhid.GenerateAsync();
        }

        _db.Patients.Add(p);
        await _db.SaveChangesAsync();

        var priority = type == "emergency" ? 1 : type == "walkin" ? 2 : 3;
        _db.Appointments.Add(new Appointment
        {
            PatientId = p.Id,
            DoctorId = doctorId,
            Type = type ?? "walkin",
            Status = "waiting",
            Date = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd"),
            Time = time ?? "09:00",
            Complaint = complaint,
            Priority = priority,
            Uhid = p.Uhid,
            VisitType = "opd",
        });
        await _db.SaveChangesAsync();

        await _audit.LogAsync($"Patient registered: {p.Name} UHID={p.Uhid}", user);
        p.Password = null;
        return p;
    }
}
