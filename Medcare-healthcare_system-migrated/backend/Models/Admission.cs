using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// IPD admission covering the Admit / Discharge / Transfer lifecycle. Mirrors the Spring Boot
/// <c>Admission</c> JPA entity (table <c>admissions</c>).
/// </summary>
[Table("admissions")]
public class Admission
{
    [Key]
    public long Id { get; set; }

    [Required]
    public long PatientId { get; set; }

    [Required]
    public string Uhid { get; set; } = string.Empty;

    public long? DoctorId { get; set; }
    public long? ReferringDoctorId { get; set; }

    /// <summary>Ward / bed type: general, semi-private, private, deluxe, icu, nicu, picu.</summary>
    [Required]
    public string BedType { get; set; } = string.Empty;

    public string? BedNumber { get; set; }
    public string? WardName { get; set; }

    [Required]
    public string AdmissionDate { get; set; } = string.Empty;

    public string? TentativeDischargeDate { get; set; }
    public string? ActualDischargeDate { get; set; }

    public string? AdmissionDiagnosis { get; set; }
    public string? FinalDiagnosis { get; set; }

    /// <summary>Per-night rate in INR.</summary>
    [Required]
    public double BedChargePerDay { get; set; } = 0.0;

    /// <summary>Computed on discharge (days x rate).</summary>
    public double? TotalBedCharges { get; set; } = 0.0;

    public string? PaymentCategory { get; set; }
    public string? TpaName { get; set; }
    public string? InsuranceAuthNumber { get; set; }

    /// <summary>admitted, transferred, discharged, ama</summary>
    [Required]
    public string Status { get; set; } = "admitted";

    public string? DischargeSummary { get; set; }
    public string? NursingStation { get; set; }

    public string? CreatedAt { get; set; }
    public string? UpdatedAt { get; set; }
}
