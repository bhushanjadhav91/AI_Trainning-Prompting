using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// Pharmacy dispensing record linked to a patient prescription. Mirrors the Spring Boot
/// <c>DispenseRecord</c> JPA entity (table <c>dispense_records</c>).
/// </summary>
[Table("dispense_records")]
public class DispenseRecord
{
    [Key]
    public long Id { get; set; }

    [Required]
    public long PatientId { get; set; }

    [Required]
    public string Uhid { get; set; } = string.Empty;

    public long? PrescriptionId { get; set; }
    public long? AdmissionId { get; set; }

    [Required]
    public long MedicineId { get; set; }

    [Required]
    public string MedicineName { get; set; } = string.Empty;

    [Required]
    public int Quantity { get; set; }

    [Required]
    public double UnitPrice { get; set; } = 0.0;

    [Required]
    public double TotalPrice { get; set; } = 0.0;

    public string? BatchNumber { get; set; }
    public string? ExpiryDate { get; set; }

    public string? DispensedBy { get; set; }
    public string? DispensedAt { get; set; }

    /// <summary>pending, dispensed, returned, cancelled</summary>
    [Required]
    public string Status { get; set; } = "dispensed";

    public string? Notes { get; set; }
}
