using System.Text.Json;
using MedCare.Api.Models;
using MedCare.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedCare.Api.Controllers;

/// <summary>
/// Doctor portal endpoints. Mirrors the Spring Boot <c>DoctorController</c>
/// (<c>@RequestMapping("/api/doctor")</c>, accessible to DOCTOR and ADMIN).
/// The doctor identity is taken from the JWT <c>userId</c> claim, exactly as the original
/// extracted it from the bearer token.
/// </summary>
[ApiController]
[Route("api/doctor")]
[Authorize(Roles = "DOCTOR,ADMIN")]
public class DoctorController : ControllerBase
{
    private readonly PatientService _patientService;
    private readonly AppointmentService _appointmentService;
    private readonly PrescriptionService _prescriptionService;
    private readonly LeaveService _leaveService;
    private readonly DoctorService _doctorService;
    private readonly ClockService _clockService;
    private readonly DoctorProfileService _profileService;
    private readonly BillingService _billingService;

    public DoctorController(
        PatientService patientService, AppointmentService appointmentService,
        PrescriptionService prescriptionService, LeaveService leaveService,
        DoctorService doctorService, ClockService clockService,
        DoctorProfileService profileService, BillingService billingService)
    {
        _patientService = patientService;
        _appointmentService = appointmentService;
        _prescriptionService = prescriptionService;
        _leaveService = leaveService;
        _doctorService = doctorService;
        _clockService = clockService;
        _profileService = profileService;
        _billingService = billingService;
    }

    private long DoctorId => User.UserId();

    // ===== APPOINTMENTS =====

    [HttpGet("me/appointments")]
    public async Task<IActionResult> MyAppointments() =>
        Ok(await _appointmentService.FindByDoctorAsync(DoctorId));

    [HttpPut("appointments/{id:long}/done")]
    public async Task<IActionResult> MarkDone(long id) =>
        Ok(await _appointmentService.MarkDoneAsync(id, User.Username()));

    [HttpPut("appointments/{id:long}/revert")]
    public async Task<IActionResult> RevertDone(long id) =>
        Ok(await _appointmentService.RevertDoneAsync(id, User.Username()));

    // ===== PATIENTS =====

    [HttpGet("me/patients")]
    public async Task<IActionResult> MyPatients() =>
        Ok(await _patientService.FindByDoctorAsync(DoctorId));

    /// <summary>Registers a walk-in patient + appointment for the current doctor.</summary>
    [HttpPost("patients/register")]
    public async Task<IActionResult> RegisterPatient([FromBody] JsonElement body)
    {
        var patient = new Patient
        {
            Name = GetString(body, "name") ?? string.Empty,
            Age = GetInt(body, "age") ?? 0,
            Gender = GetString(body, "gender") ?? string.Empty,
            Contact = GetString(body, "contact") ?? string.Empty,
            BloodGroup = GetString(body, "bloodGroup") ?? "Unknown",
            Allergies = GetString(body, "allergies") ?? "None",
            Address = GetString(body, "address") ?? string.Empty,
            History = GetString(body, "history") ?? string.Empty,

            // HIS demographic fields the registration UI may also supply.
            Dob = GetString(body, "dob"),
            AadhaarNo = GetString(body, "aadhaarNo"),
            AbhaNo = GetString(body, "abhaNo"),
            Email = GetString(body, "email"),
            PaymentCategory = GetString(body, "paymentCategory"),
            Occupation = GetString(body, "occupation"),
            Nationality = GetString(body, "nationality"),
            EmergencyContactName = GetString(body, "emergencyContactName"),
            EmergencyContactPhone = GetString(body, "emergencyContactPhone"),
            EmergencyContactRelation = GetString(body, "emergencyContactRelation"),
        };

        var result = await _patientService.RegisterAsync(
            patient, DoctorId,
            GetString(body, "complaint") ?? string.Empty,
            GetString(body, "type") ?? "walkin",
            GetString(body, "time") ?? "09:00",
            User.Username());
        return Ok(result);
    }

    [HttpGet("patients/{id:long}/prescriptions")]
    public async Task<IActionResult> PatientPrescriptions(long id) =>
        Ok(await _prescriptionService.FindByPatientAsync(id));

    [HttpGet("patients/{patientId:long}/bills")]
    public async Task<IActionResult> PatientBills(long patientId) =>
        Ok(await _billingService.FindByPatientAsync(patientId));

    // ===== PRESCRIPTIONS =====

    [HttpGet("me/prescriptions")]
    public async Task<IActionResult> MyPrescriptions() =>
        Ok(await _prescriptionService.FindByDoctorAsync(DoctorId));

    [HttpPost("prescriptions")]
    public async Task<IActionResult> CreatePrescription([FromBody] Prescription p)
    {
        p.DoctorId = DoctorId;
        return Ok(await _prescriptionService.CreateAsync(p, User.Username()));
    }

    // ===== AVAILABILITY =====

    [HttpPut("me/availability")]
    public async Task<IActionResult> SetAvailability([FromBody] Dictionary<string, string?> body) =>
        Ok(await _doctorService.UpdateAvailabilityAsync(
            DoctorId,
            body.GetValueOrDefault("status"),
            body.GetValueOrDefault("availableFrom"),
            body.GetValueOrDefault("availableUntil"),
            body.GetValueOrDefault("note"),
            User.Username()));

    // ===== CLOCK IN / OUT =====

    [HttpPost("me/clock-in")]
    public async Task<IActionResult> ClockIn() =>
        Ok(await _clockService.ClockInAsync(DoctorId, User.Username()));

    [HttpPost("me/clock-out")]
    public async Task<IActionResult> ClockOut() =>
        Ok(await _clockService.ClockOutAsync(DoctorId, User.Username()));

    [HttpGet("me/clock-status")]
    public async Task<IActionResult> ClockStatus() =>
        Ok(await _clockService.StatusAsync(DoctorId));

    [HttpGet("me/clock-history")]
    public async Task<IActionResult> ClockHistory() =>
        Ok(await _clockService.FindByDoctorAsync(DoctorId));

    // ===== PROFILE =====

    [HttpGet("me/profile")]
    public async Task<IActionResult> MyProfile() =>
        Ok(await _doctorService.FindByIdAsync(DoctorId));

    [HttpPost("me/profile-change")]
    public async Task<IActionResult> RequestProfileChange([FromBody] DoctorProfileChange change)
    {
        change.DoctorId = DoctorId;
        return Ok(await _profileService.RequestAsync(change, User.Username()));
    }

    [HttpGet("me/profile-changes")]
    public async Task<IActionResult> MyProfileChanges() =>
        Ok(await _profileService.MyRequestsAsync(DoctorId));

    // ===== LEAVE =====

    [HttpGet("me/leaves")]
    public async Task<IActionResult> MyLeaves() =>
        Ok(await _leaveService.FindByDoctorAsync(DoctorId));

    [HttpPost("leaves")]
    public async Task<IActionResult> RequestLeave([FromBody] Leave l)
    {
        l.DoctorId = DoctorId;
        return Ok(await _leaveService.ApplyAsync(l, User.Username()));
    }

    // ----- JSON helpers for the loosely-typed register-patient body -----

    private static string? GetString(JsonElement el, string name) =>
        el.ValueKind == JsonValueKind.Object
        && el.TryGetProperty(name, out var v)
        && v.ValueKind == JsonValueKind.String
            ? v.GetString()
            : null;

    private static int? GetInt(JsonElement el, string name)
    {
        if (el.ValueKind != JsonValueKind.Object || !el.TryGetProperty(name, out var v))
        {
            return null;
        }
        return v.ValueKind switch
        {
            JsonValueKind.Number => v.GetInt32(),
            JsonValueKind.String when int.TryParse(v.GetString(), out var n) => n,
            _ => null,
        };
    }
}
