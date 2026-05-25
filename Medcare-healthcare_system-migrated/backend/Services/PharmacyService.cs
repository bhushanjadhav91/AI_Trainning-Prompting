using MedCare.Api.Data;
using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Services;

/// <summary>
/// Pharmacy service: medicine inventory + prescription dispensing. Mirrors the Spring Boot
/// <c>PharmacyService</c>, including stock deduction and consolidated-bill generation for
/// multi-medicine dispensing.
/// </summary>
public class PharmacyService
{
    private readonly MedCareDbContext _db;
    private readonly AuditService _audit;
    private readonly BillingService _billing;

    public PharmacyService(MedCareDbContext db, AuditService audit, BillingService billing)
    {
        _db = db;
        _audit = audit;
        _billing = billing;
    }

    // ---- Inventory ----

    public async Task<List<Medicine>> FindAllMedicinesAsync() =>
        await _db.Medicines.AsNoTracking().Where(m => m.Active).ToListAsync();

    public async Task<List<Medicine>> SearchMedicinesAsync(string query) =>
        await _db.Medicines.AsNoTracking()
            .Where(m => EF.Functions.Like(m.Name, $"%{query}%")
                        || (m.BrandName != null && EF.Functions.Like(m.BrandName, $"%{query}%")))
            .ToListAsync();

    /// <summary>Medicines at or below the fixed reorder level of 10 — matches the Spring query.</summary>
    public async Task<List<Medicine>> LowStockAsync() =>
        await _db.Medicines.AsNoTracking()
            .Where(m => m.Active && m.StockQuantity <= 10)
            .ToListAsync();

    public async Task<Medicine> AddMedicineAsync(Medicine m, string user)
    {
        var now = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
        m.CreatedAt = now;
        m.UpdatedAt = now;
        m.Active = true;

        _db.Medicines.Add(m);
        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Medicine added: {m.Name}", user);
        return m;
    }

    public async Task<Medicine> UpdateStockAsync(long id, int qty, string user)
    {
        var m = await _db.Medicines.FirstOrDefaultAsync(x => x.Id == id)
                ?? throw ApiException.NotFound("Medicine not found");

        m.StockQuantity += qty;
        m.UpdatedAt = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Stock updated: {m.Name} qty={qty}", user);
        return m;
    }

    // ---- Dispensing ----

    /// <summary>
    /// Dispenses a single medicine, deducting from stock. Throws if stock is insufficient.
    /// This is the shared building block used by <see cref="DispenseMultipleAsync"/>.
    /// </summary>
    public async Task<DispenseRecord> DispenseAsync(DispenseRecord rec, string user)
    {
        var m = await _db.Medicines.FirstOrDefaultAsync(x => x.Id == rec.MedicineId)
                ?? throw ApiException.NotFound($"Medicine not found: {rec.MedicineId}");

        if (m.StockQuantity < rec.Quantity)
        {
            throw new ApiException($"Insufficient stock. Available: {m.StockQuantity}");
        }

        var now = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss");
        rec.MedicineName = m.Name;
        rec.UnitPrice = m.UnitPrice;
        rec.TotalPrice = m.UnitPrice * rec.Quantity;
        rec.BatchNumber = m.BatchNumber;
        rec.ExpiryDate = m.ExpiryDate;
        rec.DispensedAt = now;
        rec.DispensedBy = user;
        rec.Status = "dispensed";

        m.StockQuantity -= rec.Quantity;
        m.UpdatedAt = now;

        _db.DispenseRecords.Add(rec);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            $"Dispensed: {m.Name} x{rec.Quantity} to patient#{rec.PatientId}", user);
        return rec;
    }

    /// <summary>
    /// Dispenses multiple medicines in one call and auto-generates a single consolidated bill.
    /// </summary>
    public async Task<object> DispenseMultipleAsync(
        List<DispenseRecord> items, long patientId, string uhid,
        long? prescriptionId, string user)
    {
        if (items is null || items.Count == 0)
        {
            throw new ApiException("No medicines provided");
        }

        var saved = new List<DispenseRecord>();
        var totalCost = 0.0;
        var desc = "Medicines: ";

        foreach (var rec in items)
        {
            rec.PatientId = patientId;
            rec.Uhid = uhid;
            if (prescriptionId is not null)
            {
                rec.PrescriptionId = prescriptionId;
            }

            var d = await DispenseAsync(rec, user);
            saved.Add(d);
            totalCost += d.TotalPrice;
            desc += $"{d.MedicineName} x{d.Quantity}, ";
        }

        var description = desc.TrimEnd(' ', ',');
        var bill = await _billing.CreateAsync(new Bill
        {
            PatientId = patientId,
            Description = description,
            BillDate = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd"),
            ConsultationFee = 0.0,
            LabTestCost = 0.0,
            OtherCharges = 0.0,
            MedicineCost = totalCost,
            InsuranceCovered = 0.0,
            Status = "pending",
        }, user);

        await _audit.LogAsync(
            $"Pharmacy batch dispense: {description} ₹{totalCost} patient#{patientId}", user);
        return new { records = saved, bill, totalCost };
    }

    public async Task<List<DispenseRecord>> FindByPatientAsync(long patientId) =>
        await _db.DispenseRecords.AsNoTracking()
            .Where(d => d.PatientId == patientId)
            .OrderByDescending(d => d.Id)
            .ToListAsync();

    public async Task<List<DispenseRecord>> FindAllAsync() =>
        await _db.DispenseRecords.AsNoTracking().ToListAsync();
}
