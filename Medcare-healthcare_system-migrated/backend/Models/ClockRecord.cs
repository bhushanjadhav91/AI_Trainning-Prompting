using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// Doctor clock-in / clock-out session. Mirrors the Spring Boot <c>ClockRecord</c> JPA entity
/// (table <c>clock_records</c>). One row per session; <see cref="ClockOut"/> is null while active.
/// </summary>
[Table("clock_records")]
public class ClockRecord
{
    [Key]
    public long Id { get; set; }

    [Required]
    public long DoctorId { get; set; }

    [Required]
    public string DoctorName { get; set; } = string.Empty;

    /// <summary>ISO datetime e.g. "2025-01-15T09:05:32".</summary>
    [Required]
    public string ClockIn { get; set; } = string.Empty;

    /// <summary>Null while active.</summary>
    public string? ClockOut { get; set; }

    /// <summary>Duration in minutes — computed on clock-out.</summary>
    public long? DurationMinutes { get; set; }

    /// <summary>YYYY-MM-DD for easy daily grouping.</summary>
    public string? Date { get; set; }

    public string? Notes { get; set; }
}
