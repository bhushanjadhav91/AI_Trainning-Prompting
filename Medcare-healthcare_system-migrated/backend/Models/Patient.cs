using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// Patient record. Mirrors the Spring Boot <c>Patient</c> JPA entity (table <c>patients</c>).
/// Unique indexes on <see cref="Username"/> and <see cref="Uhid"/> are configured in
/// <c>MedCareDbContext</c>.
/// </summary>
[Table("patients")]
public class Patient
{
    [Key]
    public long Id { get; set; }

    [Required]
    public string Name { get; set; } = string.Empty;

    [Required]
    public int Age { get; set; }

    [Required]
    public string Gender { get; set; } = string.Empty;

    [Required]
    public string Contact { get; set; } = string.Empty;

    public string? BloodGroup { get; set; }
    public string? Allergies { get; set; }
    public string? Address { get; set; }
    public string? History { get; set; }
    public string? LastVisit { get; set; }

    /// <summary>Primary doctor of record. May be null for walk-ins.</summary>
    public long? DoctorId { get; set; }

    // ---- Self-registered patient fields ----
    public string? Username { get; set; }

    /// <summary>BCrypt-hashed. Null = walk-in patient with no portal account.</summary>
    public string? Password { get; set; }

    public string? MotherName { get; set; }
    public string? PetName { get; set; }
    public string? HomeTown { get; set; }

    [Required]
    public string Role { get; set; } = "PATIENT";

    // ---- UHID (v4) ----
    public string? Uhid { get; set; }

    // ---- Extended demographics (HIS) ----
    public string? Dob { get; set; }
    public string? AadhaarNo { get; set; }
    public string? AbhaNo { get; set; }
    public string? Email { get; set; }

    public string? PaymentCategory { get; set; }
    public string? TpaName { get; set; }

    public string? MaritalStatus { get; set; }
    public string? Religion { get; set; }
    public string? Nationality { get; set; }
    public string? Occupation { get; set; }

    public string? EmergencyContactName { get; set; }
    public string? EmergencyContactPhone { get; set; }
    public string? EmergencyContactRelation { get; set; }
}
