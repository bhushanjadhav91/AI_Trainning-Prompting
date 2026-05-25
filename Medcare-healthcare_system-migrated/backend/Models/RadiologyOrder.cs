using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// Radiology / imaging order (RIS module). Mirrors the Spring Boot <c>RadiologyOrder</c> JPA entity
/// (table <c>radiology_orders</c>).
/// </summary>
[Table("radiology_orders")]
public class RadiologyOrder
{
    [Key]
    public long Id { get; set; }

    [Required]
    public long PatientId { get; set; }

    [Required]
    public string Uhid { get; set; } = string.Empty;

    public long? DoctorId { get; set; }
    public long? RadiologistId { get; set; }
    public long? AdmissionId { get; set; }

    /// <summary>xray, ultrasound, ct, mri, mammography, pet-ct, fluoroscopy</summary>
    [Required]
    public string ImagingType { get; set; } = string.Empty;

    [Required]
    public string BodyPart { get; set; } = string.Empty;

    /// <summary>none, with-contrast, with-without</summary>
    public string? Contrast { get; set; }

    public string? ClinicalNotes { get; set; }

    /// <summary>routine, urgent, stat</summary>
    public string? Priority { get; set; }

    public string? Findings { get; set; }
    public string? Impression { get; set; }

    public string? ReportedAt { get; set; }
    public string? ReportedBy { get; set; }

    public string? PacsAccessionNumber { get; set; }

    /// <summary>ordered, scheduled, imaging-done, reported, cancelled</summary>
    [Required]
    public string Status { get; set; } = "ordered";

    [Required]
    public double Charges { get; set; } = 0.0;

    public string? OrderedAt { get; set; }
    public string? Notes { get; set; }
}
