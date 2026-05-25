using System.Globalization;
using System.Text.Json;
using MedCare.Api.Data;
using MedCare.Api.Models;
using MedCare.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Controllers;

/// <summary>
/// Patient portal endpoints. Mirrors the Spring Boot <c>PatientController</c>
/// (<c>@RequestMapping("/api/patient")</c>, accessible to PATIENT and ADMIN).
/// The full slot-validation logic in <see cref="Book"/> is translated verbatim from the Java.
/// </summary>
[ApiController]
[Route("api/patient")]
[Authorize(Roles = "PATIENT,ADMIN")]
public class PatientController : ControllerBase
{
    private readonly PatientService _patientService;
    private readonly MedCareDbContext _db;
    private readonly AuditService _auditService;

    public PatientController(
        PatientService patientService, MedCareDbContext db, AuditService auditService)
    {
        _patientService = patientService;
        _db = db;
        _auditService = auditService;
    }

    private long PatientId => User.UserId();

    [HttpGet("me")]
    public async Task<IActionResult> Me() => Ok(await _patientService.FindByIdAsync(PatientId));

    [HttpGet("me/appointments")]
    public async Task<IActionResult> MyAppointments() =>
        Ok(await _db.Appointments.AsNoTracking()
            .Where(a => a.PatientId == PatientId)
            .OrderByDescending(a => a.Date)
            .ThenByDescending(a => a.Time)
            .ToListAsync());

    [HttpGet("me/prescriptions")]
    public async Task<IActionResult> MyPrescriptions() =>
        Ok(await _db.Prescriptions.AsNoTracking()
            .Where(p => p.PatientId == PatientId)
            .ToListAsync());

    /// <summary>
    /// Books an appointment with a doctor. Reproduces the Spring slot-validation rules:
    /// doctor must be active, not "away" today, the requested time must be after any
    /// "busy until" window, and there must be no existing appointment in the same slot.
    /// </summary>
    [HttpPost("me/appointments")]
    public async Task<IActionResult> Book([FromBody] JsonElement body)
    {
        var pid = PatientId;

        if (!body.TryGetProperty("doctorId", out var doctorIdEl))
        {
            return BadRequest(new { error = "doctorId is required" });
        }
        var did = doctorIdEl.ValueKind == JsonValueKind.Number
            ? doctorIdEl.GetInt64()
            : long.Parse(doctorIdEl.GetString() ?? "0", CultureInfo.InvariantCulture);

        var requestedTime = GetString(body, "time") ?? "10:00";
        var requestedDate = GetString(body, "date")
                            ?? DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");

        // ── Slot validation ──────────────────────────────────────────────
        var doc = await _db.Doctors.AsNoTracking().FirstOrDefaultAsync(d => d.Id == did)
                  ?? throw ApiException.NotFound("Doctor not found");

        var today = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");

        if (doc.AccountStatus != "active")
        {
            return BadRequest(new
            {
                error = "Doctor is not currently available for appointments.",
            });
        }

        if (doc.AvailabilityStatus == "away" && requestedDate == today)
        {
            var note = doc.AvailabilityNote ?? "Doctor is away.";
            var from = doc.AvailableFrom is not null
                ? $" Available from {doc.AvailableFrom}"
                : string.Empty;
            return BadRequest(new { error = note + from });
        }

        if (!string.IsNullOrWhiteSpace(doc.AvailableUntil) && requestedDate == today)
        {
            if (TimeOnly.TryParse(doc.AvailableUntil, out var until)
                && TimeOnly.TryParse(requestedTime, out var requested)
                && requested <= until)
            {
                return BadRequest(new
                {
                    error = $"Doctor is busy until {doc.AvailableUntil}. "
                            + "Please choose a later slot.",
                });
            }
        }

        // Check for a slot conflict — no two non-cancelled appointments at the same time.
        var conflict = await _db.Appointments.AsNoTracking()
            .Where(a => a.DoctorId == did)
            .AnyAsync(a => a.Date == requestedDate
                           && a.Time == requestedTime
                           && a.Status != "cancelled");
        if (conflict)
        {
            return BadRequest(new
            {
                error = "This time slot is already booked. Please choose a different time.",
            });
        }
        // ────────────────────────────────────────────────────────────────

        var appt = new Appointment
        {
            PatientId = pid,
            DoctorId = did,
            Type = "scheduled",
            Status = "waiting",
            Date = requestedDate,
            Time = requestedTime,
            Complaint = GetString(body, "complaint") ?? "Online booking",
            Priority = 3,
        };
        _db.Appointments.Add(appt);
        await _db.SaveChangesAsync();
        await _auditService.LogAsync($"Patient booked appt #{appt.Id}", User.Username());
        return Ok(appt);
    }

    private static string? GetString(JsonElement el, string name) =>
        el.ValueKind == JsonValueKind.Object
        && el.TryGetProperty(name, out var v)
        && v.ValueKind == JsonValueKind.String
            ? v.GetString()
            : null;
}
