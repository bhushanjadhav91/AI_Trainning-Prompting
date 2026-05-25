using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// Laboratory test order covering ordering, sample collection, and result entry. Mirrors the
/// Spring Boot <c>LabTest</c> JPA entity (table <c>lab_tests</c>).
/// </summary>
[Table("lab_tests")]
public class LabTest
{
    [Key]
    public long Id { get; set; }

    [Required]
    public long PatientId { get; set; }

    [Required]
    public string Uhid { get; set; } = string.Empty;

    public long? DoctorId { get; set; }
    public long? AdmissionId { get; set; }

    [Required]
    public string TestName { get; set; } = string.Empty;

    [Required]
    public string TestCode { get; set; } = string.Empty;

    /// <summary>haematology, biochemistry, microbiology, serology, pathology, other</summary>
    public string? Category { get; set; }

    /// <summary>routine, urgent, stat</summary>
    public string? Priority { get; set; }

    /// <summary>blood, urine, stool, sputum, swab, other</summary>
    public string? SampleType { get; set; }

    public string? SampleCollectedAt { get; set; }
    public string? SampleCollectedBy { get; set; }

    public string? Result { get; set; }
    public string? ReferenceRange { get; set; }

    public string? ResultEnteredAt { get; set; }
    public string? ResultEnteredBy { get; set; }

    /// <summary>ordered, sample-collected, processing, completed, cancelled</summary>
    [Required]
    public string Status { get; set; } = "ordered";

    [Required]
    public double Charges { get; set; } = 0.0;

    public string? OrderedAt { get; set; }
    public string? Notes { get; set; }
}
