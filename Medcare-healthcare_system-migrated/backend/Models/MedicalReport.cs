using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// Uploaded medical report metadata. Mirrors the Spring Boot <c>MedicalReport</c> JPA entity
/// (table <c>medical_reports</c>). The file itself is stored on disk by <c>FileStorageService</c>.
/// </summary>
[Table("medical_reports")]
public class MedicalReport
{
    [Key]
    public long Id { get; set; }

    [Required]
    public long PatientId { get; set; }

    /// <summary>Optional - the doctor the report was shared with (null = all treating doctors).</summary>
    public long? DoctorId { get; set; }

    [Required]
    public string FileName { get; set; } = string.Empty;

    /// <summary>Stored filename on disk (UUID-prefixed to avoid collisions).</summary>
    [Required]
    public string StoredName { get; set; } = string.Empty;

    public string? ContentType { get; set; }
    public long? FileSize { get; set; }

    /// <summary>lab, scan, xray, mri, prescription, other</summary>
    [Required]
    public string ReportType { get; set; } = "other";

    public string? Description { get; set; }
    public string? ReportDate { get; set; }

    [Required]
    public string UploadedAt { get; set; } = string.Empty;
}
