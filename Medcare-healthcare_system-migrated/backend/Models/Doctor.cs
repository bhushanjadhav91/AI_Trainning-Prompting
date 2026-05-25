using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// Doctor account. Mirrors the Spring Boot <c>Doctor</c> JPA entity (table <c>doctors</c>).
/// A unique index on <see cref="Email"/> is configured in <c>MedCareDbContext</c>.
/// </summary>
[Table("doctors")]
public class Doctor
{
    [Key]
    public long Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Specialization { get; set; } = string.Empty;

    [Required]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Nullable. If null the admin has not set a password yet so the doctor cannot log in.
    /// </summary>
    public string? Password { get; set; }

    public string? Phone { get; set; }
    public string? Schedule { get; set; }
    public string? Experience { get; set; }
    public string? Qualification { get; set; }

    /// <summary>Account status: 'pending', 'active', 'on-leave'.</summary>
    [Required]
    public string AccountStatus { get; set; } = "pending";

    /// <summary>Real-time availability: 'available', 'in-operation', 'away'.</summary>
    [Required]
    public string AvailabilityStatus { get; set; } = "available";

    public string? AvailableFrom { get; set; }
    public string? AvailableUntil { get; set; }
    public string? AvailabilityNote { get; set; }

    public int? ActivePatients { get; set; } = 0;

    [Required]
    public string Role { get; set; } = "DOCTOR";
}
