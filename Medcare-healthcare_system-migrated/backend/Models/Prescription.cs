using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// Prescription. Mirrors the Spring Boot <c>Prescription</c> JPA entity (table <c>prescriptions</c>).
/// </summary>
[Table("prescriptions")]
public class Prescription
{
    [Key]
    public long Id { get; set; }

    [Required]
    public long PatientId { get; set; }

    [Required]
    public long DoctorId { get; set; }

    public string? Date { get; set; }
    public string? Medicines { get; set; }
    public string? Dosage { get; set; }
    public string? Duration { get; set; }
    public string? Tests { get; set; }
    public string? Diet { get; set; }
    public string? Notes { get; set; }
}
