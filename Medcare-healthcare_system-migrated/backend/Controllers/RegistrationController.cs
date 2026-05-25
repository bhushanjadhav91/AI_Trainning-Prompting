using MedCare.Api.Models;
using MedCare.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedCare.Api.Controllers;

/// <summary>
/// OPD reception / registration endpoints. Mirrors the Spring Boot <c>RegistrationController</c>
/// (<c>@RequestMapping("/api/registration")</c>).
///
/// Authorisation mirrors the original Spring Security path matchers: GETs are open to
/// ADMIN/DOCTOR/PATIENT, while writes are restricted to ADMIN/DOCTOR.
/// </summary>
[ApiController]
[Route("api/registration")]
[Authorize(Roles = "ADMIN,DOCTOR")]
public class RegistrationController : ControllerBase
{
    private readonly RegistrationService _regService;
    private readonly PatientService _patientService;

    public RegistrationController(RegistrationService regService, PatientService patientService)
    {
        _regService = regService;
        _patientService = patientService;
    }

    /// <summary>Search an existing patient by UHID / Mobile / Name / Aadhaar / ABHA.</summary>
    [HttpGet("search")]
    [Authorize(Roles = "ADMIN,DOCTOR,PATIENT")]
    public async Task<IActionResult> Search([FromQuery] string query) =>
        Ok(await _patientService.SearchAsync(query));

    /// <summary>Lookup a patient by UHID.</summary>
    [HttpGet("uhid/{uhid}")]
    [Authorize(Roles = "ADMIN,DOCTOR,PATIENT")]
    public async Task<IActionResult> ByUhid(string uhid)
    {
        try
        {
            return Ok(await _patientService.FindByUhidAsync(uhid));
        }
        catch (ApiException)
        {
            return NotFound();
        }
    }

    /// <summary>Today's registration statistics for the reception dashboard.</summary>
    [HttpGet("stats/today")]
    [Authorize(Roles = "ADMIN,DOCTOR,PATIENT")]
    public async Task<IActionResult> TodayStats() => Ok(await _regService.TodayStatsAsync());

    /// <summary>
    /// Registers an existing patient for an OPD visit — generates a token + registration slip.
    /// The patient must already have a UHID.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Register([FromBody] Registration reg)
    {
        var p = await _patientService.FindByIdAsync(reg.PatientId);
        if (!string.IsNullOrWhiteSpace(p.Uhid))
        {
            reg.Uhid = p.Uhid;
        }
        else
        {
            return BadRequest(new { error = "Patient does not have a UHID" });
        }
        return Ok(await _regService.CreateAsync(reg, User.Username()));
    }

    [HttpGet("patient/{patientId:long}")]
    [Authorize(Roles = "ADMIN,DOCTOR,PATIENT")]
    public async Task<IActionResult> ByPatient(long patientId) =>
        Ok(await _regService.FindByPatientAsync(patientId));

    [HttpGet("queue/doctor/{doctorId:long}")]
    [Authorize(Roles = "ADMIN,DOCTOR,PATIENT")]
    public async Task<IActionResult> DoctorQueue(long doctorId) =>
        Ok(await _regService.TodayQueueAsync(doctorId));

    [HttpGet]
    [Authorize(Roles = "ADMIN,DOCTOR,PATIENT")]
    public async Task<IActionResult> All() => Ok(await _regService.FindAllAsync());

    /// <summary>Update registration status (called, done, cancelled).</summary>
    [HttpPut("{id:long}/status")]
    public async Task<IActionResult> UpdateStatus(
        long id, [FromBody] Dictionary<string, string> body) =>
        Ok(await _regService.UpdateStatusAsync(
            id, body.GetValueOrDefault("status") ?? "done", User.Username()));

    /// <summary>Standard registration fee ranges by visit type.</summary>
    [HttpGet("fee-catalogue")]
    [Authorize(Roles = "ADMIN,DOCTOR,PATIENT")]
    public IActionResult FeeCatalogue() => Ok(new Dictionary<string, object>
    {
        ["walkin"] = new { min = 100, max = 200 },
        ["appointment"] = new { min = 100, max = 200 },
        ["emergency"] = new { min = 0, max = 0 },
        ["generalPhysician"] = new { min = 300, max = 1000 },
        ["specialist"] = new { min = 500, max = 2000 },
        ["superSpecialist"] = new { min = 1000, max = 5000 },
        ["followUp"] = new { min = 200, max = 800 },
    });
}
