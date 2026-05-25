using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// Doctor profile change request awaiting admin approval. Mirrors the Spring Boot
/// <c>DoctorProfileChange</c> JPA entity (table <c>doctor_profile_changes</c>).
/// </summary>
[Table("doctor_profile_changes")]
public class DoctorProfileChange
{
    [Key]
    public long Id { get; set; }

    [Required]
    public long DoctorId { get; set; }

    public string? DoctorName { get; set; }

    // Requested new values (null = no change requested for that field)
    public string? NewName { get; set; }
    public string? NewPhone { get; set; }
    public string? NewQualification { get; set; }
    public string? NewExperience { get; set; }
    public string? NewSchedule { get; set; }
    public string? NewSpecialization { get; set; }

    public string? Reason { get; set; }

    /// <summary>pending, approved, rejected</summary>
    [Required]
    public string Status { get; set; } = "pending";

    public string? AppliedAt { get; set; }
    public string? AdminNote { get; set; }
}
