using MedCare.Api.Models;
using MedCare.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedCare.Api.Controllers;

/// <summary>
/// Billing and insurance endpoints. Mirrors the Spring Boot <c>BillingController</c>
/// (<c>@RequestMapping("/api")</c>). Routes are split across patient / doctor / admin prefixes,
/// each protected by the matching role just like the original Spring Security path matchers.
/// The unified charge-summary helper is translated verbatim.
/// </summary>
[ApiController]
[Route("api")]
[Authorize]
public class BillingController : ControllerBase
{
    private readonly BillingService _billing;
    private readonly LabService _labService;
    private readonly RadiologyService _radiologyService;
    private readonly PharmacyService _pharmacyService;
    private readonly AdmissionService _admissionService;

    public BillingController(
        BillingService billing, LabService labService, RadiologyService radiologyService,
        PharmacyService pharmacyService, AdmissionService admissionService)
    {
        _billing = billing;
        _labService = labService;
        _radiologyService = radiologyService;
        _pharmacyService = pharmacyService;
        _admissionService = admissionService;
    }

    // ===== PATIENT =====

    [HttpGet("patient/me/bills")]
    [Authorize(Roles = "PATIENT,ADMIN")]
    public async Task<IActionResult> MyBills() =>
        Ok(await _billing.FindByPatientAsync(User.UserId()));

    [HttpGet("patient/me/charges")]
    [Authorize(Roles = "PATIENT,ADMIN")]
    public async Task<IActionResult> MyCharges() =>
        Ok(await BuildChargesSummaryAsync(User.UserId()));

    [HttpGet("patient/me/insurance")]
    [Authorize(Roles = "PATIENT,ADMIN")]
    public async Task<IActionResult> MyInsurance()
    {
        var ins = await _billing.FindInsuranceAsync(User.UserId());
        return ins is not null ? Ok(ins) : Ok(new { hasInsurance = false });
    }

    [HttpPost("patient/me/insurance")]
    [Authorize(Roles = "PATIENT,ADMIN")]
    public async Task<IActionResult> SaveMyInsurance([FromBody] Insurance ins)
    {
        ins.PatientId = User.UserId();
        return Ok(await _billing.SaveInsuranceAsync(ins, User.Username()));
    }

    [HttpPut("patient/me/bills/{id:long}/pay")]
    [Authorize(Roles = "PATIENT,ADMIN")]
    public async Task<IActionResult> PayBill(long id, [FromBody] Dictionary<string, string> body)
    {
        // Confirm the bill belongs to this patient before paying — matches the Spring guard.
        var ownBills = await _billing.FindByPatientAsync(User.UserId());
        var bill = ownBills.FirstOrDefault(x => x.Id == id)
                   ?? throw ApiException.NotFound("Bill not found");

        var method = body.GetValueOrDefault("paymentMethod") ?? "card";
        var txn = body.GetValueOrDefault("transactionRef")
                  ?? $"TXN-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
        return Ok(await _billing.MarkPaidAsync(bill.Id, method, txn, User.Username()));
    }

    // ===== DOCTOR =====

    [HttpPost("doctor/bills")]
    [Authorize(Roles = "DOCTOR,ADMIN")]
    public async Task<IActionResult> DoctorCreateBill([FromBody] Bill b) =>
        Ok(await _billing.CreateAsync(b, User.Username()));

    [HttpGet("doctor/patients/{patientId:long}/charges")]
    [Authorize(Roles = "DOCTOR,ADMIN")]
    public async Task<IActionResult> DoctorPatientCharges(long patientId) =>
        Ok(await BuildChargesSummaryAsync(patientId));

    [HttpGet("doctor/patients/{patientId:long}/bills")]
    [Authorize(Roles = "DOCTOR,ADMIN")]
    public async Task<IActionResult> PatientBillsForDoctor(long patientId) =>
        Ok(await _billing.FindByPatientAsync(patientId));

    // ===== ADMIN =====

    [HttpGet("admin/bills")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> AllBills() => Ok(await _billing.FindAllAsync());

    [HttpPost("admin/bills")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> CreateBill([FromBody] Bill b) =>
        Ok(await _billing.CreateAsync(b, User.Username()));

    [HttpGet("admin/patients/{patientId:long}/insurance")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> PatientInsurance(long patientId)
    {
        var ins = await _billing.FindInsuranceAsync(patientId);
        return ins is not null ? Ok(ins) : Ok(new { hasInsurance = false });
    }

    [HttpGet("admin/patients/{patientId:long}/charges")]
    [Authorize(Roles = "ADMIN")]
    public async Task<IActionResult> AdminPatientCharges(long patientId) =>
        Ok(await BuildChargesSummaryAsync(patientId));

    // ===== SHARED HELPER =====

    /// <summary>
    /// Builds the unified charge summary: standard bills + lab + radiology + pharmacy + IPD bed
    /// charges, plus the per-category and grand totals. Field names match the Spring response
    /// exactly so the React payments page works unchanged.
    /// </summary>
    private async Task<object> BuildChargesSummaryAsync(long patientId)
    {
        var bills = await _billing.FindByPatientAsync(patientId);

        var labCharges = (await _labService.FindByPatientAsync(patientId))
            .Where(t => t.Charges > 0)
            .Select(t => new
            {
                id = t.Id,
                description = t.TestName,
                date = t.OrderedAt is { Length: >= 10 } o ? o[..10] : string.Empty,
                amount = t.Charges,
                type = "lab",
                status = t.Status,
            })
            .ToList();

        var radCharges = (await _radiologyService.FindByPatientAsync(patientId))
            .Where(r => r.Charges > 0)
            .Select(r => new
            {
                id = r.Id,
                description = $"{r.ImagingType} — {r.BodyPart}",
                date = r.OrderedAt is { Length: >= 10 } o ? o[..10] : string.Empty,
                amount = r.Charges,
                type = "radiology",
                status = r.Status,
            })
            .ToList();

        var pharmaCharges = (await _pharmacyService.FindByPatientAsync(patientId))
            .Select(d => new
            {
                id = d.Id,
                description = $"{d.MedicineName} x{d.Quantity}",
                date = d.DispensedAt is { Length: >= 10 } o ? o[..10] : string.Empty,
                amount = d.TotalPrice,
                type = "pharmacy",
                status = d.Status,
            })
            .ToList();

        var ipdCharges = (await _admissionService.FindByPatientAsync(patientId))
            .Select(a => new
            {
                id = a.Id,
                description = $"IPD — {a.BedType} ward",
                date = a.AdmissionDate ?? string.Empty,
                amount = a.TotalBedCharges ?? 0.0,
                type = "ipd",
                status = a.Status,
                discharged = a.ActualDischargeDate ?? "still admitted",
            })
            .ToList();

        var billTotal = bills.Sum(b => b.AmountPayable);
        var labTotal = labCharges.Sum(m => m.amount);
        var radTotal = radCharges.Sum(m => m.amount);
        var pharTotal = pharmaCharges.Sum(m => m.amount);
        var ipdTotal = ipdCharges.Sum(m => m.amount);
        var grandTotal = billTotal + labTotal + radTotal + pharTotal + ipdTotal;

        var paid = bills.Where(b => b.Status == "paid").Sum(b => b.AmountPayable);

        return new
        {
            bills,
            labCharges,
            radiologyCharges = radCharges,
            pharmacyCharges = pharmaCharges,
            ipdCharges,
            summary = new
            {
                billsTotal = billTotal,
                labTotal,
                radiologyTotal = radTotal,
                pharmacyTotal = pharTotal,
                ipdTotal,
                grandTotal,
                paid,
                outstanding = grandTotal - paid,
            },
        };
    }
}
