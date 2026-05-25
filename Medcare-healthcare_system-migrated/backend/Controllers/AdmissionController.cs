using MedCare.Api.Models;
using MedCare.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedCare.Api.Controllers;

/// <summary>
/// In-Patient Department (IPD) endpoints. Mirrors the Spring Boot <c>AdmissionController</c>
/// (<c>@RequestMapping("/api/ipd")</c>, accessible to ADMIN and DOCTOR).
/// </summary>
[ApiController]
[Route("api/ipd")]
[Authorize(Roles = "ADMIN,DOCTOR")]
public class AdmissionController : ControllerBase
{
    private readonly AdmissionService _admService;

    public AdmissionController(AdmissionService admService)
    {
        _admService = admService;
    }

    /// <summary>Admit a patient to a ward/bed.</summary>
    [HttpPost("admit")]
    public async Task<IActionResult> Admit([FromBody] Admission adm) =>
        Ok(await _admService.AdmitAsync(adm, User.Username()));

    /// <summary>Discharge a patient — auto-calculates bed charges.</summary>
    [HttpPut("{id:long}/discharge")]
    public async Task<IActionResult> Discharge(
        long id, [FromBody] Dictionary<string, string> body) =>
        Ok(await _admService.DischargeAsync(
            id, body.GetValueOrDefault("dischargeSummary") ?? string.Empty, User.Username()));

    /// <summary>Transfer a patient to a different bed/ward.</summary>
    [HttpPut("{id:long}/transfer")]
    public async Task<IActionResult> Transfer(
        long id, [FromBody] Dictionary<string, string> body) =>
        Ok(await _admService.TransferAsync(
            id,
            body.GetValueOrDefault("bedType") ?? "general",
            body.GetValueOrDefault("bedNumber"),
            body.GetValueOrDefault("wardName"),
            User.Username()));

    [HttpGet("admitted")]
    public async Task<IActionResult> Admitted() => Ok(await _admService.FindAdmittedAsync());

    [HttpGet]
    public async Task<IActionResult> All() => Ok(await _admService.FindAllAsync());

    [HttpGet("patient/{patientId:long}")]
    public async Task<IActionResult> ByPatient(long patientId) =>
        Ok(await _admService.FindByPatientAsync(patientId));

    /// <summary>Bed occupancy statistics + standard rates.</summary>
    [HttpGet("beds/stats")]
    public async Task<IActionResult> BedStats() => Ok(await _admService.BedStatsAsync());

    /// <summary>Standard bed charges (INR/day).</summary>
    [HttpGet("beds/rates")]
    public IActionResult Rates() => Ok(AdmissionService.BedRates);
}
