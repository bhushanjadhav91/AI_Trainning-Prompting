using System.ComponentModel.DataAnnotations;

namespace MedCare.Api.Dtos;

/// <summary>
/// Admin create/update doctor request. Mirrors Spring Boot <c>DoctorCreateRequest</c>.
/// Password is optional at creation — the admin can set it later.
/// </summary>
public class DoctorCreateRequest
{
    [Required(ErrorMessage = "Name is required")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "Specialization is required")]
    public string Specialization { get; set; } = string.Empty;

    [Required]
    [EmailAddress(ErrorMessage = "Valid email required")]
    public string Email { get; set; } = string.Empty;

    /// <summary>Optional at creation. Admin can set/reset later.</summary>
    public string? Password { get; set; }

    public string? Phone { get; set; }
    public string? Schedule { get; set; }
    public string? Experience { get; set; }
    public string? Qualification { get; set; }
}
