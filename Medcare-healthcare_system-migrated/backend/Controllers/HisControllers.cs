using System.Globalization;
using System.Text.Json;
using MedCare.Api.Models;
using MedCare.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedCare.Api.Controllers;

// ============================================================
// RADIOLOGY CONTROLLER
// ============================================================

[ApiController]
[Route("api/radiology")]
[Authorize(Roles = "ADMIN,DOCTOR")]
public class RadiologyController : ControllerBase
{
    private readonly RadiologyService _rad;

    public RadiologyController(RadiologyService rad) => _rad = rad;

    [HttpPost("order")]
    public async Task<IActionResult> Order([FromBody] RadiologyOrder r) =>
        Ok(await _rad.OrderAsync(r, User.Username()));

    [HttpPost("order-multiple")]
    public async Task<IActionResult> OrderMultiple([FromBody] JsonElement body)
    {
        var rawOrders = body.GetProperty("orders");
        var patientId = GetLong(body, "patientId") ?? throw new ApiException("patientId required");
        var uhid = GetString(body, "uhid") ?? string.Empty;
        var doctorId = GetLong(body, "doctorId");
        var priority = GetString(body, "priority") ?? "routine";

        var orders = new List<RadiologyOrder>();
        foreach (var o in rawOrders.EnumerateArray())
        {
            var ro = new RadiologyOrder
            {
                ImagingType = GetString(o, "imagingType") ?? string.Empty,
                BodyPart = GetString(o, "bodyPart") ?? string.Empty,
                Contrast = GetString(o, "contrast") ?? "none",
                ClinicalNotes = GetString(o, "clinicalNotes"),
            };
            var c = GetDouble(o, "charges");
            if (c is not null) ro.Charges = c.Value;
            orders.Add(ro);
        }

        return Ok(await _rad.OrderMultipleAsync(orders, patientId, uhid, doctorId, priority, User.Username()));
    }

    [HttpPut("{id:long}/imaging-done")]
    public async Task<IActionResult> ImagingDone(long id) =>
        Ok(await _rad.ImagingDoneAsync(id, User.Username()));

    [HttpPut("{id:long}/report")]
    public async Task<IActionResult> SubmitReport(long id, [FromBody] Dictionary<string, string?> body) =>
        Ok(await _rad.SubmitReportAsync(id,
            body.GetValueOrDefault("findings") ?? string.Empty,
            body.GetValueOrDefault("impression") ?? string.Empty,
            body.GetValueOrDefault("reportedBy") ?? User.Username(),
            User.Username()));

    [HttpGet("pending")]
    public async Task<IActionResult> Pending() => Ok(await _rad.FindPendingAsync());

    [HttpGet]
    public async Task<IActionResult> All() => Ok(await _rad.FindAllAsync());

    [HttpGet("patient/{patientId:long}")]
    [Authorize(Roles = "ADMIN,DOCTOR,PATIENT")]
    public async Task<IActionResult> ByPatient(long patientId) =>
        Ok(await _rad.FindByPatientAsync(patientId));

    [HttpGet("catalogue")]
    [Authorize(Roles = "ADMIN,DOCTOR,PATIENT")]
    public IActionResult Catalogue() => Ok(RadiologyService.ImagingCharges);

    private static string? GetString(JsonElement el, string n) =>
        el.ValueKind == JsonValueKind.Object && el.TryGetProperty(n, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;
    private static long? GetLong(JsonElement el, string n) {
        if (el.ValueKind != JsonValueKind.Object || !el.TryGetProperty(n, out var v)) return null;
        return v.ValueKind switch { JsonValueKind.Number => v.GetInt64(), JsonValueKind.String when long.TryParse(v.GetString(), out var x) => x, _ => null };
    }
    private static double? GetDouble(JsonElement el, string n) {
        if (el.ValueKind != JsonValueKind.Object || !el.TryGetProperty(n, out var v)) return null;
        return v.ValueKind switch { JsonValueKind.Number => v.GetDouble(), JsonValueKind.String when double.TryParse(v.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var x) => x, _ => null };
    }
}

// ============================================================
// PHARMACY CONTROLLER
// ============================================================

[ApiController]
[Route("api/pharmacy")]
[Authorize(Roles = "ADMIN,DOCTOR")]
public class PharmacyController : ControllerBase
{
    private readonly PharmacyService _pharm;

    public PharmacyController(PharmacyService pharm) => _pharm = pharm;

    [HttpGet("medicines")]
    [Authorize(Roles = "ADMIN,DOCTOR,PATIENT")]
    public async Task<IActionResult> All() => Ok(await _pharm.FindAllMedicinesAsync());

    [HttpGet("medicines/search")]
    [Authorize(Roles = "ADMIN,DOCTOR,PATIENT")]
    public async Task<IActionResult> Search([FromQuery] string q) =>
        Ok(await _pharm.SearchMedicinesAsync(q));

    [HttpGet("medicines/low-stock")]
    public async Task<IActionResult> LowStock() => Ok(await _pharm.LowStockAsync());

    [HttpPost("medicines")]
    public async Task<IActionResult> Add([FromBody] Medicine m) =>
        Ok(await _pharm.AddMedicineAsync(m, User.Username()));

    [HttpPut("medicines/{id:long}/stock")]
    public async Task<IActionResult> UpdateStock(long id, [FromBody] Dictionary<string, int> body) =>
        Ok(await _pharm.UpdateStockAsync(id, body.GetValueOrDefault("qty"), User.Username()));

    [HttpPost("dispense")]
    public async Task<IActionResult> Dispense([FromBody] DispenseRecord rec) =>
        Ok(await _pharm.DispenseAsync(rec, User.Username()));

    [HttpPost("dispense-multiple")]
    public async Task<IActionResult> DispenseMultiple([FromBody] JsonElement body)
    {
        var items = new List<DispenseRecord>();
        foreach (var i in body.GetProperty("items").EnumerateArray())
        {
            var mid = i.TryGetProperty("medicineId", out var midEl) ? midEl.GetInt64() : 0L;
            var qty = i.TryGetProperty("quantity", out var qEl) ? qEl.GetInt32() : 1;
            items.Add(new DispenseRecord { MedicineId = mid, Quantity = qty });
        }
        var pid = body.TryGetProperty("patientId", out var pidEl) ? pidEl.GetInt64() : 0L;
        var uhid = body.TryGetProperty("uhid", out var uhidEl) ? uhidEl.GetString() ?? "" : "";
        long? prescId = body.TryGetProperty("prescriptionId", out var pEl) ? pEl.GetInt64() : null;
        return Ok(await _pharm.DispenseMultipleAsync(items, pid, uhid, prescId, User.Username()));
    }

    [HttpGet("dispense")]
    public async Task<IActionResult> AllDispenses() => Ok(await _pharm.FindAllAsync());

    [HttpGet("patient/{patientId:long}")]
    [Authorize(Roles = "ADMIN,DOCTOR,PATIENT")]
    public async Task<IActionResult> ByPatient(long patientId) =>
        Ok(await _pharm.FindByPatientAsync(patientId));
}

// ============================================================
// EMERGENCY CONTROLLER
// ============================================================

[ApiController]
[Route("api/emergency")]
[Authorize(Roles = "ADMIN,DOCTOR")]
public class EmergencyController : ControllerBase
{
    private readonly TriageService _triage;

    public EmergencyController(TriageService triage) => _triage = triage;

    [HttpPost("triage")]
    public async Task<IActionResult> CreateTriage([FromBody] Triage t) =>
        Ok(await _triage.TriageAsync(t, User.Username()));

    [HttpGet("triage/queue")]
    public async Task<IActionResult> Queue() => Ok(await _triage.ActiveQueueAsync());

    [HttpGet("triage")]
    public async Task<IActionResult> All() => Ok(await _triage.FindAllAsync());

    [HttpPut("triage/{id:long}/status")]
    public async Task<IActionResult> UpdateStatus(long id, [FromBody] JsonElement body)
    {
        var status = body.TryGetProperty("status", out var s) ? s.GetString() ?? "registered" : "registered";
        long? apptId = body.TryGetProperty("appointmentId", out var aEl) ? aEl.GetInt64() : null;
        long? patId = body.TryGetProperty("patientId", out var pEl) ? pEl.GetInt64() : null;
        string? uhid = body.TryGetProperty("uhid", out var uEl) ? uEl.GetString() : null;
        return Ok(await _triage.UpdateStatusAsync(id, status, apptId, patId, uhid, User.Username()));
    }

    [HttpGet("triage/categories")]
    public IActionResult Categories() => Ok(new[]
    {
        new { category = 1, label = "Resuscitation", colour = "#dc2626", targetTime = "Immediate" },
        new { category = 2, label = "Emergent",      colour = "#ea580c", targetTime = "< 15 min" },
        new { category = 3, label = "Urgent",        colour = "#ca8a04", targetTime = "< 30 min" },
        new { category = 4, label = "Less Urgent",   colour = "#16a34a", targetTime = "< 60 min" },
        new { category = 5, label = "Non-Urgent",    colour = "#2563eb", targetTime = "< 120 min" },
    });
}
