using MedCare.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.StaticFiles;

namespace MedCare.Api.Controllers;

/// <summary>
/// Medical report endpoints. Mirrors the Spring Boot <c>MedicalReportController</c>
/// (<c>@RequestMapping("/api")</c>). File uploads use <see cref="IFormFile"/> (max 10 MB,
/// MIME whitelist enforced by <see cref="FileStorageService"/>). Downloads stream the file
/// inline with the original filename in <c>Content-Disposition</c>.
/// </summary>
[ApiController]
[Route("api")]
[Authorize(Roles = "PATIENT,DOCTOR,ADMIN")]
public class MedicalReportController : ControllerBase
{
    private readonly MedicalReportService _reportService;
    private readonly FileStorageService _storage;

    public MedicalReportController(MedicalReportService reportService, FileStorageService storage)
    {
        _reportService = reportService;
        _storage = storage;
    }

    /// <summary>Patient uploads a medical report (PDF/image/doc, max 10 MB).</summary>
    [HttpPost("patient/me/reports")]
    [RequestSizeLimit(12 * 1024 * 1024)]
    public async Task<IActionResult> UploadAsPatient(
        [FromForm] IFormFile file,
        [FromForm] string reportType = "other",
        [FromForm] string? description = null,
        [FromForm] string? reportDate = null,
        [FromForm] long? doctorId = null)
    {
        var report = await _reportService.UploadAsync(
            User.UserId(), doctorId, file, reportType, description, reportDate, User.Username());
        return Ok(report);
    }

    [HttpGet("patient/me/reports")]
    public async Task<IActionResult> PatientReports() =>
        Ok(await _reportService.FindByPatientAsync(User.UserId()));

    [HttpGet("doctor/patients/{patientId:long}/reports")]
    public async Task<IActionResult> DoctorPatientReports(long patientId) =>
        Ok(await _reportService.FindByPatientAsync(patientId));

    [HttpGet("admin/patients/{patientId:long}/reports")]
    public async Task<IActionResult> AdminPatientReports(long patientId) =>
        Ok(await _reportService.FindByPatientAsync(patientId));

    /// <summary>
    /// Downloads a report file, streamed inline. The frontend fetches this with an
    /// Authorization header and turns the blob into an object URL.
    /// </summary>
    [HttpGet("reports/{id:long}/file")]
    public async Task<IActionResult> Download(long id)
    {
        var r = await _reportService.FindByIdAsync(id);
        var path = _storage.ResolvePath(r.StoredName);

        var contentType = r.ContentType ?? "application/octet-stream";
        var stream = new FileStream(path, FileMode.Open, FileAccess.Read);

        // Inline disposition with the original filename — matches the Spring behaviour.
        Response.Headers["Content-Disposition"] = $"inline; filename=\"{r.FileName}\"";
        return File(stream, contentType);
    }

    /// <summary>Patient deletes their own report. Ownership is enforced here.</summary>
    [HttpDelete("patient/me/reports/{id:long}")]
    public async Task<IActionResult> Delete(long id)
    {
        var r = await _reportService.FindByIdAsync(id);
        if (r.PatientId != User.UserId())
        {
            return StatusCode(403, new { error = "Not your report" });
        }
        await _reportService.DeleteAsync(id, User.Username());
        return Ok(new { success = true });
    }
}
