using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// OPD registration slip. Mirrors the Spring Boot <c>Registration</c> JPA entity
/// (table <c>registrations</c>).
/// </summary>
[Table("registrations")]
public class Registration
{
    [Key]
    public long Id { get; set; }

    [Required]
    public long PatientId { get; set; }

    [Required]
    public string Uhid { get; set; } = string.Empty;

    [Required]
    public long DoctorId { get; set; }

    /// <summary>Token number, e.g. OPD-2024-0042.</summary>
    [Required]
    public string Token { get; set; } = string.Empty;

    /// <summary>walkin, appointment, emergency, reference</summary>
    [Required]
    public string ArrivalType { get; set; } = "walkin";

    /// <summary>general, cghs, esic, ayushman, insurance</summary>
    public string? PaymentCategory { get; set; } = "general";

    [Required]
    public double RegistrationFee { get; set; } = 0.0;

    public string? PaymentMethod { get; set; }

    /// <summary>Estimated consultation time (HH:mm).</summary>
    public string? EstimatedTime { get; set; }

    [Required]
    public string RegistrationDateTime { get; set; } = string.Empty;

    /// <summary>QR data string (encodes UHID + token + date).</summary>
    public string? QrData { get; set; }

    /// <summary>waiting, called, done, cancelled</summary>
    public string? Status { get; set; }

    public string? Notes { get; set; }
}
