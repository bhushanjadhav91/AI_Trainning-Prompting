using System.Text.Json;
using MedCare.Api.Dtos;
using MedCare.Api.Models;
using MedCare.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MedCare.Api.Data;

namespace MedCare.Api.Controllers;

/// <summary>
/// Admin endpoints. Mirrors the Spring Boot <c>AdminController</c>
/// (<c>@RequestMapping("/api/admin")</c>, <c>hasRole("ADMIN")</c>).
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Roles = "ADMIN")]
public class AdminController : ControllerBase
{
    private readonly DoctorService _doctorService;
    private readonly PatientService _patientService;
    private readonly AppointmentService _appointmentService;
    private readonly LeaveService _leaveService;
    private readonly ClockService _clockService;
    private readonly DoctorProfileService _profileService;
    private readonly MedCareDbContext _db;

    public AdminController(
        DoctorService doctorService, PatientService patientService,
        AppointmentService appointmentService, LeaveService leaveService,
        ClockService clockService, DoctorProfileService profileService,
        MedCareDbContext db)
    {
        _doctorService = doctorService;
        _patientService = patientService;
        _appointmentService = appointmentService;
        _leaveService = leaveService;
        _clockService = clockService;
        _profileService = profileService;
        _db = db;
    }

    // ===== DOCTORS =====

    [HttpGet("doctors")]
    public async Task<IActionResult> GetAllDoctors() => Ok(await _doctorService.FindAllAsync());

    [HttpGet("doctors/{id:long}")]
    public async Task<IActionResult> GetDoctor(long id) =>
        Ok(await _doctorService.FindByIdAsync(id));

    [HttpPost("doctors")]
    public async Task<IActionResult> AddDoctor([FromBody] DoctorCreateRequest req) =>
        Ok(await _doctorService.CreateAsync(req, User.Username()));

    [HttpPut("doctors/{id:long}")]
    public async Task<IActionResult> UpdateDoctor(long id, [FromBody] DoctorCreateRequest req) =>
        Ok(await _doctorService.UpdateAsync(id, req, User.Username()));

    [HttpPut("doctors/{id:long}/password")]
    public async Task<IActionResult> ResetDoctorPassword(
        long id, [FromBody] Dictionary<string, string> body)
    {
        await _doctorService.ResetPasswordAsync(
            id, body.GetValueOrDefault("password"), User.Username());
        return Ok(new { success = true, message = "Password set. Doctor can now log in." });
    }

    [HttpDelete("doctors/{id:long}")]
    public async Task<IActionResult> DeleteDoctor(long id)
    {
        await _doctorService.DeleteAsync(id, User.Username());
        return Ok(new { success = true, message = "Doctor deleted" });
    }

    // ===== PATIENTS (admin sees ALL) =====

    [HttpGet("patients")]
    public async Task<IActionResult> GetAllPatients() => Ok(await _patientService.FindAllAsync());

    // ===== APPOINTMENTS =====

    [HttpGet("appointments")]
    public async Task<IActionResult> GetAllAppointments() =>
        Ok(await _appointmentService.FindAllAsync());

    [HttpPut("appointments/{id:long}/assign")]
    public async Task<IActionResult> Reassign(long id, [FromBody] Dictionary<string, long> body) =>
        Ok(await _appointmentService.ReassignAsync(
            id, body.GetValueOrDefault("doctorId"), User.Username()));

    [HttpPut("appointments/{id:long}/done")]
    public async Task<IActionResult> Done(long id) =>
        Ok(await _appointmentService.MarkDoneAsync(id, User.Username()));

    [HttpPut("appointments/{id:long}/revert")]
    public async Task<IActionResult> Revert(long id) =>
        Ok(await _appointmentService.RevertDoneAsync(id, User.Username()));

    // ===== LEAVES =====

    [HttpGet("leaves")]
    public async Task<IActionResult> GetLeaves() => Ok(await _leaveService.FindAllAsync());

    [HttpPut("leaves/{id:long}/approve")]
    public async Task<IActionResult> DecideLeave(
        long id, [FromBody] Dictionary<string, bool> body) =>
        Ok(await _leaveService.DecideAsync(
            id, body.GetValueOrDefault("approve"), User.Username()));

    // ===== CLOCK RECORDS (admin view) =====

    [HttpGet("clock-records")]
    public async Task<IActionResult> AllClockRecords() =>
        Ok(await _clockService.FindAllAsync());

    [HttpGet("clock-records/today")]
    public async Task<IActionResult> TodayClockRecords() =>
        Ok(await _clockService.TodayAllAsync());

    // ===== PROFILE CHANGE REQUESTS =====

    [HttpGet("profile-changes")]
    public async Task<IActionResult> PendingProfileChanges() =>
        Ok(await _profileService.PendingRequestsAsync());

    [HttpPut("profile-changes/{id:long}/approve")]
    public async Task<IActionResult> ApproveProfileChange(
        long id, [FromBody] Dictionary<string, string> body) =>
        Ok(await _profileService.ApproveAsync(
            id, body.GetValueOrDefault("adminNote") ?? string.Empty, User.Username()));

    [HttpPut("profile-changes/{id:long}/reject")]
    public async Task<IActionResult> RejectProfileChange(
        long id, [FromBody] Dictionary<string, string> body) =>
        Ok(await _profileService.RejectAsync(
            id, body.GetValueOrDefault("adminNote") ?? string.Empty, User.Username()));

    // ===== AUDIT =====

    [HttpGet("audit-logs")]
    public async Task<IActionResult> GetAuditLogs() =>
        Ok(await _db.AuditLogs.AsNoTracking()
            .OrderByDescending(a => a.Id)
            .Take(50)
            .ToListAsync());
}
