using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// Pharmacy inventory item. Mirrors the Spring Boot <c>Medicine</c> JPA entity (table <c>medicines</c>).
/// </summary>
[Table("medicines")]
public class Medicine
{
    [Key]
    public long Id { get; set; }

    /// <summary>Generic name.</summary>
    [Required]
    public string Name { get; set; } = string.Empty;

    public string? BrandName { get; set; }
    public string? Manufacturer { get; set; }

    /// <summary>tablet, capsule, syrup, injection, cream, drops, inhaler, other</summary>
    [Required]
    public string Category { get; set; } = string.Empty;

    public string? Composition { get; set; }
    public string? Strength { get; set; }

    [Required]
    public int StockQuantity { get; set; } = 0;

    public int? ReorderLevel { get; set; } = 10;

    [Required]
    public double UnitPrice { get; set; } = 0.0;

    public string? BatchNumber { get; set; }
    public string? ExpiryDate { get; set; }
    public string? HsnCode { get; set; }

    [Required]
    public bool Active { get; set; } = true;

    public string? StorageLocation { get; set; }
    public string? CreatedAt { get; set; }
    public string? UpdatedAt { get; set; }
}
