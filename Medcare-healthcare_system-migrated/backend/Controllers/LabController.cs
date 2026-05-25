using System.Globalization;
using System.Text.Json;
using MedCare.Api.Models;
using MedCare.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedCare.Api.Controllers;

/// <summary>
/// Laboratory (LIS) endpoints. Mirrors the Spring Boot <c>LabController</c>
/// (<c>@RequestMapping("/api/lab")</c>). GETs are open to ADMIN/DOCTOR/PATIENT, writes to
/// ADMIN/DOCTOR — matching the original Spring Security path matchers.
/// </summary>
[ApiController]
[Route("api/lab")]
[Authorize(Roles = "ADMIN,DOCTOR")]
public class LabController : ControllerBase
{
    private readonly LabService _labService;

    public LabController(LabService labService)
    {
        _labService = labService;
    }

    /// <summary>Order a single lab test with charge range validation.</summary>
    [HttpPost("order")]
    public async Task<IActionResult> Order([FromBody] LabTest test) =>
        Ok(await _labService.OrderAsync(test, User.Username()));

    /// <summary>
    /// Order multiple lab tests for a patient at once — auto-generates a consolidated bill.
    /// </summary>
    [HttpPost("order-multiple")]
    public async Task<IActionResult> OrderMultiple([FromBody] JsonElement body)
    {
        var rawTests = body.GetProperty("tests");
        var patientId = GetLong(body, "patientId")
                        ?? throw new ApiException("patientId is required");
        var uhid = GetString(body, "uhid") ?? string.Empty;
        var doctorId = GetLong(body, "doctorId");
        var priority = GetString(body, "priority") ?? "routine";

        var tests = new List<LabTest>();
        foreach (var m in rawTests.EnumerateArray())
        {
            var t = new LabTest
            {
                TestName = GetString(m, "testName") ?? string.Empty,
                TestCode = GetString(m, "testCode") ?? string.Empty,
                Category = GetString(m, "category") ?? "other",
                SampleType = GetString(m, "sampleType") ?? "blood",
            };
            var charges = GetDouble(m, "charges");
            if (charges is not null)
            {
                t.Charges = charges.Value;
            }
            tests.Add(t);
        }

        return Ok(await _labService.OrderMultipleAsync(
            tests, patientId, uhid, doctorId, priority, User.Username()));
    }

    /// <summary>Mark a sample as collected.</summary>
    [HttpPut("{id:long}/collect")]
    public async Task<IActionResult> Collect(long id, [FromBody] Dictionary<string, string> body) =>
        Ok(await _labService.CollectSampleAsync(
            id, body.GetValueOrDefault("collectedBy") ?? User.Username(), User.Username()));

    /// <summary>Enter a lab result.</summary>
    [HttpPut("{id:long}/result")]
    public async Task<IActionResult> Result(long id, [FromBody] Dictionary<string, string?> body) =>
        Ok(await _labService.EnterResultAsync(
            id,
            body.GetValueOrDefault("result") ?? string.Empty,
            body.GetValueOrDefault("referenceRange"),
            body.GetValueOrDefault("enteredBy") ?? User.Username(),
            User.Username()));

    [HttpGet("pending")]
    public async Task<IActionResult> Pending() => Ok(await _labService.FindPendingAsync());

    [HttpGet]
    public async Task<IActionResult> All() => Ok(await _labService.FindAllAsync());

    [HttpGet("patient/{patientId:long}")]
    [Authorize(Roles = "ADMIN,DOCTOR,PATIENT")]
    public async Task<IActionResult> ByPatient(long patientId) =>
        Ok(await _labService.FindByPatientAsync(patientId));

    /// <summary>Standard lab test charges catalogue.</summary>
    [HttpGet("catalogue")]
    [Authorize(Roles = "ADMIN,DOCTOR,PATIENT")]
    public IActionResult Catalogue() => Ok(LabService.TestCharges);

    // ----- JSON helpers -----

    private static string? GetString(JsonElement el, string name) =>
        el.ValueKind == JsonValueKind.Object
        && el.TryGetProperty(name, out var v)
        && v.ValueKind == JsonValueKind.String
            ? v.GetString()
            : null;

    private static long? GetLong(JsonElement el, string name)
    {
        if (el.ValueKind != JsonValueKind.Object || !el.TryGetProperty(name, out var v))
        {
            return null;
        }
        return v.ValueKind switch
        {
            JsonValueKind.Number => v.GetInt64(),
            JsonValueKind.String when long.TryParse(
                v.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var n) => n,
            _ => null,
        };
    }

    private static double? GetDouble(JsonElement el, string name)
    {
        if (el.ValueKind != JsonValueKind.Object || !el.TryGetProperty(name, out var v))
        {
            return null;
        }
        return v.ValueKind switch
        {
            JsonValueKind.Number => v.GetDouble(),
            JsonValueKind.String when double.TryParse(
                v.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var n) => n,
            _ => null,
        };
    }
}
