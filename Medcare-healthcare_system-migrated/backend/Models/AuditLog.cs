using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// Audit log entry. Mirrors the Spring Boot <c>AuditLog</c> JPA entity (table <c>audit_logs</c>).
/// </summary>
[Table("audit_logs")]
public class AuditLog
{
    [Key]
    public long Id { get; set; }

    [Required]
    public string Action { get; set; } = string.Empty;

    [Required]
    public string PerformedBy { get; set; } = string.Empty;

    [Required]
    public string Timestamp { get; set; } = string.Empty;
}
