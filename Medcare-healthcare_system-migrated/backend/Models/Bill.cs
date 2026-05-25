using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace MedCare.Api.Models;

/// <summary>
/// Itemised bill. Mirrors the Spring Boot <c>Bill</c> JPA entity (table <c>bills</c>).
/// </summary>
[Table("bills")]
public class Bill
{
    [Key]
    public long Id { get; set; }

    [Required]
    public long PatientId { get; set; }

    public long? DoctorId { get; set; }
    public long? AppointmentId { get; set; }

    [Required]
    public string InvoiceNumber { get; set; } = string.Empty;

    [Required]
    public string BillDate { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Required]
    public double ConsultationFee { get; set; } = 0.0;

    [Required]
    public double MedicineCost { get; set; } = 0.0;

    [Required]
    public double LabTestCost { get; set; } = 0.0;

    [Required]
    public double OtherCharges { get; set; } = 0.0;

    [Required]
    public double TotalAmount { get; set; } = 0.0;

    [Required]
    public double InsuranceCovered { get; set; } = 0.0;

    [Required]
    public double AmountPayable { get; set; } = 0.0;

    /// <summary>pending, paid, partially-paid, cancelled</summary>
    [Required]
    public string Status { get; set; } = "pending";

    public string? PaymentMethod { get; set; }
    public string? PaymentDate { get; set; }
    public string? TransactionRef { get; set; }
}
