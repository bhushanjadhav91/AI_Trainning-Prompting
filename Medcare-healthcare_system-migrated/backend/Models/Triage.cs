using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// Emergency triage record. Mirrors the Spring Boot <c>Triage</c> JPA entity (table <c>triage</c>).
/// Created at the triage desk before the patient is registered / assigned a doctor.
/// </summary>
[Table("triage")]
public class Triage
{
    [Key]
    public long Id { get; set; }

    /// <summary>May be null if the patient has not been formally registered yet.</summary>
    public long? PatientId { get; set; }

    public string? Uhid { get; set; }

    [Required]
    public string PatientName { get; set; } = string.Empty;

    public string? PatientAge { get; set; }
    public string? PatientGender { get; set; }
    public string? ContactNumber { get; set; }

    [Required]
    public string ChiefComplaint { get; set; } = string.Empty;

    /// <summary>
    /// Triage category: 1=Resuscitation (Red), 2=Emergent (Orange), 3=Urgent (Yellow),
    /// 4=Less Urgent (Green), 5=Non-Urgent (Blue).
    /// </summary>
    [Required]
    public int TriageCategory { get; set; } = 3;

    // Vital signs at triage
    public string? BloodPressure { get; set; }
    public string? Pulse { get; set; }
    public string? Temperature { get; set; }
    public string? SpO2 { get; set; }
    public string? RespiratoryRate { get; set; }
    public string? BloodSugar { get; set; }
    public string? GcsScore { get; set; }

    public long? AssignedDoctorId { get; set; }
    public long? AppointmentId { get; set; }

    /// <summary>ambulance, walk-in, police, referred</summary>
    public string? ModeOfArrival { get; set; }

    /// <summary>triaged, registered, under-treatment, admitted, discharged, expired</summary>
    [Required]
    public string Status { get; set; } = "triaged";

    [Required]
    public string TriageTime { get; set; } = string.Empty;

    public string? Notes { get; set; }
}
