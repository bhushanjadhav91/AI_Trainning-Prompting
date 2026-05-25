using MedCare.Api.Data;
using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Services;

/// <summary>
/// Laboratory (LIS) service. Mirrors the Spring Boot <c>LabService</c>, including the
/// charge-range validation against the built-in test catalogue and the consolidated-bill
/// generation for multi-test orders.
/// </summary>
public class LabService
{
    private readonly MedCareDbContext _db;
    private readonly AuditService _audit;
    private readonly BillingService _billing;

    /// <summary>Standard LIS test charges: <c>[min, max]</c>. Identical to the Spring static map.</summary>
    public static readonly IReadOnlyDictionary<string, double[]> TestCharges =
        new Dictionary<string, double[]>
        {
            ["CBC"] = new double[] { 250, 400 },
            ["LFT"] = new double[] { 500, 800 },
            ["KFT"] = new double[] { 400, 700 },
            ["LIPID_PROFILE"] = new double[] { 600, 900 },
            ["HBA1C"] = new double[] { 400, 600 },
            ["THYROID"] = new double[] { 600, 900 },
            ["BLOOD_SUGAR"] = new double[] { 80, 150 },
            ["URINE_ROUTINE"] = new double[] { 100, 200 },
            ["URINE_CULTURE"] = new double[] { 400, 700 },
            ["ECG"] = new double[] { 150, 300 },
            ["ECHO"] = new double[] { 1500, 3000 },
            ["CULTURE"] = new double[] { 500, 900 },
            ["BIOPSY"] = new double[] { 1500, 4000 },
            ["SPUTUM_AFB"] = new double[] { 200, 400 },
            ["COVID_RTPCR"] = new double[] { 900, 1500 },
            ["DENGUE_NS1"] = new double[] { 600, 1000 },
            ["WIDAL"] = new double[] { 200, 400 },
            ["MALARIA"] = new double[] { 200, 350 },
        };

    public LabService(MedCareDbContext db, AuditService audit, BillingService billing)
    {
        _db = db;
        _audit = audit;
        _billing = billing;
    }

    /// <summary>Orders a single lab test, validating the charge falls within the catalogue range.</summary>
    public async Task<LabTest> OrderAsync(LabTest test, string user)
    {
        test.OrderedAt ??= DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
        if (string.IsNullOrWhiteSpace(test.Status))
        {
            test.Status = "ordered";
        }
        test.Priority ??= "routine";

        var range = TestCharges.GetValueOrDefault(
            test.TestCode ?? string.Empty, new double[] { 100, 10000 });
        var charge = test.Charges == 0.0 ? range[0] : test.Charges;
        if (charge < range[0] || charge > range[1])
        {
            throw new ApiException(
                $"Charge ₹{charge} is out of allowed range ₹{range[0]}–₹{range[1]} for {test.TestName}");
        }
        test.Charges = charge;

        _db.LabTests.Add(test);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            $"Lab test ordered: {test.TestName} ₹{charge} for patient#{test.PatientId}", user);
        return test;
    }

    /// <summary>
    /// Orders multiple tests in one call and auto-generates a single consolidated bill.
    /// </summary>
    public async Task<object> OrderMultipleAsync(
        List<LabTest> tests, long patientId, string uhid,
        long? doctorId, string? priority, string user)
    {
        if (tests is null || tests.Count == 0)
        {
            throw new ApiException("No tests provided");
        }

        var now = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
        var saved = new List<LabTest>();
        var totalCharges = 0.0;
        var description = "Lab Tests: ";

        foreach (var t in tests)
        {
            t.PatientId = patientId;
            t.Uhid = uhid;
            t.DoctorId = doctorId;
            t.Priority = priority ?? "routine";
            t.OrderedAt = now;
            t.Status = "ordered";

            var range = TestCharges.GetValueOrDefault(
                t.TestCode ?? string.Empty, new double[] { 100, 10000 });
            var charge = t.Charges == 0.0 ? range[0] : t.Charges;
            if (charge < range[0] || charge > range[1])
            {
                throw new ApiException(
                    $"Charge ₹{charge} out of range ₹{range[0]}–₹{range[1]} for {t.TestName}");
            }
            t.Charges = charge;
            totalCharges += charge;

            _db.LabTests.Add(t);
            saved.Add(t);
            description += t.TestName + ", ";
        }

        await _db.SaveChangesAsync();

        var desc = description.TrimEnd(' ', ',');
        var bill = await _billing.CreateAsync(new Bill
        {
            PatientId = patientId,
            DoctorId = doctorId,
            Description = desc,
            BillDate = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd"),
            ConsultationFee = 0.0,
            MedicineCost = 0.0,
            LabTestCost = totalCharges,
            OtherCharges = 0.0,
            InsuranceCovered = 0.0,
            Status = "pending",
        }, user);

        await _audit.LogAsync(
            $"Lab order batch: {desc} total=₹{totalCharges} for patient#{patientId}", user);
        return new { tests = saved, bill, totalCharges };
    }

    public async Task<LabTest> CollectSampleAsync(long id, string collectedBy, string user)
    {
        var t = await FindTrackedByIdAsync(id);
        t.SampleCollectedAt = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
        t.SampleCollectedBy = collectedBy;
        t.Status = "sample-collected";
        await _db.SaveChangesAsync();
        return t;
    }

    public async Task<LabTest> EnterResultAsync(
        long id, string result, string? referenceRange, string enteredBy, string user)
    {
        var t = await FindTrackedByIdAsync(id);
        t.Result = result;
        t.ReferenceRange = referenceRange;
        t.ResultEnteredAt = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
        t.ResultEnteredBy = enteredBy;
        t.Status = "completed";
        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            $"Lab result entered: {t.TestName} for patient#{t.PatientId}", user);
        return t;
    }

    public async Task<List<LabTest>> FindByPatientAsync(long patientId) =>
        await _db.LabTests.AsNoTracking()
            .Where(t => t.PatientId == patientId)
            .OrderByDescending(t => t.Id)
            .ToListAsync();

    public async Task<List<LabTest>> FindPendingAsync() =>
        await _db.LabTests.AsNoTracking().Where(t => t.Status == "ordered").ToListAsync();

    public async Task<List<LabTest>> FindAllAsync() =>
        await _db.LabTests.AsNoTracking().ToListAsync();

    private async Task<LabTest> FindTrackedByIdAsync(long id) =>
        await _db.LabTests.FirstOrDefaultAsync(t => t.Id == id)
        ?? throw ApiException.NotFound("Lab test not found");
}
