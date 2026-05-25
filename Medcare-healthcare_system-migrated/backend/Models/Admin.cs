using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// System administrator account. Mirrors the Spring Boot <c>Admin</c> JPA entity
/// (table <c>admins</c>).
/// </summary>
[Table("admins")]
public class Admin
{
    [Key]
    public long Id { get; set; }

    [Required]
    public string Username { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;

    [Required]
    public string Role { get; set; } = "ADMIN";
}
