using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// Doctor leave request. Mirrors the Spring Boot <c>Leave</c> JPA entity (table <c>leaves</c>).
/// </summary>
[Table("leaves")]
public class Leave
{
    [Key]
    public long Id { get; set; }

    [Required]
    public long DoctorId { get; set; }

    [Required]
    public string FromDate { get; set; } = string.Empty;

    [Required]
    public string ToDate { get; set; } = string.Empty;

    public string? Reason { get; set; }

    /// <summary>pending, approved, rejected</summary>
    [Required]
    public string Status { get; set; } = "pending";

    public string? AppliedDate { get; set; }
}
