using MedCare.Api.Data;
using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Services;

/// <summary>
/// Radiology (RIS) service. Mirrors the Spring Boot <c>RadiologyService</c>, including the
/// charge-range validation, PACS accession-number generation and consolidated-bill creation.
/// </summary>
public class RadiologyService
{
    private readonly MedCareDbContext _db;
    private readonly AuditService _audit;
    private readonly BillingService _billing;

    /// <summary>Standard RIS charges (INR): <c>[min, max]</c>. Identical to the Spring static map.</summary>
    public static readonly IReadOnlyDictionary<string, double[]> ImagingCharges =
        new Dictionary<string, double[]>
        {
            ["xray"] = new double[] { 300, 500 },
            ["ultrasound"] = new double[] { 600, 1200 },
            ["ct"] = new double[] { 2000, 3500 },
            ["mri"] = new double[] { 4000, 7000 },
            ["mammography"] = new double[] { 800, 1500 },
            ["pet-ct"] = new double[] { 15000, 25000 },
            ["fluoroscopy"] = new double[] { 2000, 4000 },
            ["dexa"] = new double[] { 1200, 2000 },
            ["doppler"] = new double[] { 1500, 3000 },
        };

    public RadiologyService(MedCareDbContext db, AuditService audit, BillingService billing)
    {
        _db = db;
        _audit = audit;
        _billing = billing;
    }

    /// <summary>
    /// Orders multiple imaging studies in one call, validates charges and auto-generates a
    /// single consolidated bill.
    /// </summary>
    public async Task<object> OrderMultipleAsync(
        List<RadiologyOrder> orders, long patientId, string uhid,
        long? doctorId, string? priority, string user)
    {
        if (orders is null || orders.Count == 0)
        {
            throw new ApiException("No imaging orders provided");
        }

        var now = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
        var saved = new List<RadiologyOrder>();
        var total = 0.0;
        var desc = "Radiology: ";

        foreach (var r in orders)
        {
            r.PatientId = patientId;
            r.Uhid = uhid;
            r.DoctorId = doctorId;
            r.Priority = priority ?? "routine";
            r.OrderedAt = now;
            r.Status = "ordered";
            r.PacsAccessionNumber ??=
                "RAD" + DateTime.Now.ToString("yyyyMMddHHmmss") + saved.Count;

            var range = ImagingCharges.GetValueOrDefault(
                r.ImagingType, new double[] { 300, 30000 });
            var charge = r.Charges == 0.0 ? range[0] : r.Charges;
            if (charge < range[0] || charge > range[1])
            {
                throw new ApiException(
                    $"Charge ₹{charge} out of range ₹{range[0]}–₹{range[1]} for {r.ImagingType}");
            }
            r.Charges = charge;
            total += charge;

            _db.RadiologyOrders.Add(r);
            saved.Add(r);
            desc += $"{r.ImagingType} {r.BodyPart}, ";
        }

        await _db.SaveChangesAsync();

        var description = desc.TrimEnd(' ', ',');
        var bill = await _billing.CreateAsync(new Bill
        {
            PatientId = patientId,
            DoctorId = doctorId,
            Description = description,
            BillDate = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd"),
            ConsultationFee = 0.0,
            MedicineCost = 0.0,
            LabTestCost = 0.0,
            OtherCharges = total,
            InsuranceCovered = 0.0,
            Status = "pending",
        }, user);

        await _audit.LogAsync(
            $"Radiology batch order: {description} total=₹{total} patient#{patientId}", user);
        return new { orders = saved, bill, totalCharges = total };
    }

    /// <summary>Places a single radiology order, auto-charging and generating a PACS number.</summary>
    public async Task<RadiologyOrder> OrderAsync(RadiologyOrder r, string user)
    {
        r.OrderedAt ??= DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
        if (string.IsNullOrWhiteSpace(r.Status))
        {
            r.Status = "ordered";
        }
        r.Priority ??= "routine";

        if (r.Charges == 0.0)
        {
            var range = ImagingCharges.GetValueOrDefault(
                r.ImagingType, new double[] { 500, 1000 });
            r.Charges = range[0];
        }

        r.PacsAccessionNumber ??= "RAD" + DateTime.Now.ToString("yyyyMMddHHmmss");

        _db.RadiologyOrders.Add(r);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            $"Radiology order: {r.ImagingType}/{r.BodyPart} for patient#{r.PatientId}", user);
        return r;
    }

    public async Task<RadiologyOrder> ImagingDoneAsync(long id, string user)
    {
        var r = await FindTrackedByIdAsync(id);
        r.Status = "imaging-done";
        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Imaging done: {id}", user);
        return r;
    }

    public async Task<RadiologyOrder> SubmitReportAsync(
        long id, string findings, string impression, string reportedBy, string user)
    {
        var r = await FindTrackedByIdAsync(id);
        r.Findings = findings;
        r.Impression = impression;
        r.ReportedBy = reportedBy;
        r.ReportedAt = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
        r.Status = "reported";
        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Radiology report submitted: {id}", user);
        return r;
    }

    public async Task<List<RadiologyOrder>> FindByPatientAsync(long patientId) =>
        await _db.RadiologyOrders.AsNoTracking()
            .Where(r => r.PatientId == patientId)
            .OrderByDescending(r => r.Id)
            .ToListAsync();

    public async Task<List<RadiologyOrder>> FindPendingAsync() =>
        await _db.RadiologyOrders.AsNoTracking().Where(r => r.Status == "ordered").ToListAsync();

    public async Task<List<RadiologyOrder>> FindAllAsync() =>
        await _db.RadiologyOrders.AsNoTracking().ToListAsync();

    private async Task<RadiologyOrder> FindTrackedByIdAsync(long id) =>
        await _db.RadiologyOrders.FirstOrDefaultAsync(r => r.Id == id)
        ?? throw ApiException.NotFound("Radiology order not found");
}
