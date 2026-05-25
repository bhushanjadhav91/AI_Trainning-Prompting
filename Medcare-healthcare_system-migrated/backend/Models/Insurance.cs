using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// Patient insurance policy. Mirrors the Spring Boot <c>Insurance</c> JPA entity
/// (table <c>insurance</c>). A unique index on <see cref="PatientId"/> is configured
/// in <c>MedCareDbContext</c>.
/// </summary>
[Table("insurance")]
public class Insurance
{
    [Key]
    public long Id { get; set; }

    [Required]
    public long PatientId { get; set; }

    [Required]
    public string ProviderName { get; set; } = string.Empty;

    [Required]
    public string PolicyNumber { get; set; } = string.Empty;

    [Required]
    public string PolicyHolderName { get; set; } = string.Empty;

    [Required]
    public string ValidFrom { get; set; } = string.Empty;

    [Required]
    public string ValidTo { get; set; } = string.Empty;

    [Required]
    public double SumInsured { get; set; } = 0.0;

    [Required]
    public double AmountUsed { get; set; } = 0.0;

    public string? CoverageType { get; set; }
    public string? ContactNumber { get; set; }
    public string? TpaName { get; set; }
}
