using MedCare.Api.Data;
using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Services;

/// <summary>
/// Billing and insurance service. Mirrors the Spring Boot <c>BillingService</c>.
/// </summary>
public class BillingService
{
    private readonly MedCareDbContext _db;
    private readonly AuditService _audit;

    public BillingService(MedCareDbContext db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    // ---- Bills ----

    public async Task<List<Bill>> FindByPatientAsync(long patientId) =>
        await _db.Bills.AsNoTracking()
            .Where(b => b.PatientId == patientId)
            .OrderByDescending(b => b.Id)
            .ToListAsync();

    public async Task<List<Bill>> FindAllAsync() =>
        await _db.Bills.AsNoTracking().ToListAsync();

    /// <summary>
    /// Creates a bill, computing <c>totalAmount</c> and <c>amountPayable</c> exactly as the
    /// Spring service did. Auto-generates an invoice number if none was supplied.
    /// </summary>
    public async Task<Bill> CreateAsync(Bill b, string user)
    {
        if (string.IsNullOrWhiteSpace(b.InvoiceNumber))
        {
            b.InvoiceNumber = "INV-" + DateTime.Now.ToString("yyyyMMddHHmmss");
        }
        if (string.IsNullOrWhiteSpace(b.BillDate))
        {
            b.BillDate = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");
        }

        var total = b.ConsultationFee + b.MedicineCost + b.LabTestCost + b.OtherCharges;
        b.TotalAmount = total;
        b.AmountPayable = Math.Max(0, total - b.InsuranceCovered);

        if (string.IsNullOrWhiteSpace(b.Status))
        {
            b.Status = "pending";
        }

        _db.Bills.Add(b);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            $"Bill created: {b.InvoiceNumber} for patient #{b.PatientId} (₹{total})", user);
        return b;
    }

    /// <summary>
    /// Marks a bill paid and, if insurance was applied, increments the linked
    /// <see cref="Insurance.AmountUsed"/>.
    /// </summary>
    public async Task<Bill> MarkPaidAsync(long id, string paymentMethod, string txnRef, string user)
    {
        var b = await _db.Bills.FirstOrDefaultAsync(x => x.Id == id)
                ?? throw ApiException.NotFound("Bill not found");

        b.Status = "paid";
        b.PaymentMethod = paymentMethod;
        b.PaymentDate = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd");
        b.TransactionRef = txnRef;

        if (b.InsuranceCovered > 0)
        {
            var ins = await _db.Insurances.FirstOrDefaultAsync(i => i.PatientId == b.PatientId);
            if (ins is not null)
            {
                ins.AmountUsed += b.InsuranceCovered;
            }
        }

        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Bill paid: {b.InvoiceNumber} via {paymentMethod}", user);
        return b;
    }

    // ---- Insurance ----

    public async Task<Insurance?> FindInsuranceAsync(long patientId) =>
        await _db.Insurances.AsNoTracking().FirstOrDefaultAsync(i => i.PatientId == patientId);

    public async Task<Insurance> SaveInsuranceAsync(Insurance ins, string user)
    {
        var existing = await _db.Insurances
            .FirstOrDefaultAsync(i => i.PatientId == ins.PatientId);

        if (existing is not null)
        {
            // Update in place — preserves the existing primary key.
            existing.ProviderName = ins.ProviderName;
            existing.PolicyNumber = ins.PolicyNumber;
            existing.PolicyHolderName = ins.PolicyHolderName;
            existing.ValidFrom = ins.ValidFrom;
            existing.ValidTo = ins.ValidTo;
            existing.SumInsured = ins.SumInsured;
            existing.AmountUsed = ins.AmountUsed;
            existing.CoverageType = ins.CoverageType;
            existing.ContactNumber = ins.ContactNumber;
            existing.TpaName = ins.TpaName;
            await _db.SaveChangesAsync();
            await _audit.LogAsync(
                $"Insurance updated for patient #{ins.PatientId}", user);
            return existing;
        }

        _db.Insurances.Add(ins);
        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Insurance added for patient #{ins.PatientId}", user);
        return ins;
    }
}
