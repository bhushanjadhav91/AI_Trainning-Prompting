using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// Appointment. Mirrors the Spring Boot <c>Appointment</c> JPA entity (table <c>appointments</c>).
/// </summary>
[Table("appointments")]
public class Appointment
{
    [Key]
    public long Id { get; set; }

    [Required]
    public long PatientId { get; set; }

    [Required]
    public long DoctorId { get; set; }

    /// <summary>walkin, emergency, scheduled</summary>
    [Required]
    public string Type { get; set; } = string.Empty;

    /// <summary>waiting, in-progress, done, cancelled</summary>
    [Required]
    public string Status { get; set; } = "waiting";

    public string? Date { get; set; }
    public string? Time { get; set; }
    public string? Complaint { get; set; }

    /// <summary>1=emergency, 2=walkin, 3=scheduled</summary>
    public int? Priority { get; set; } = 3;

    // ---- v4 HIS additions ----
    public string? Uhid { get; set; }
    public string? VisitType { get; set; }
    public long? RegistrationId { get; set; }
    public double? ConsultationFee { get; set; } = 0.0;
}
