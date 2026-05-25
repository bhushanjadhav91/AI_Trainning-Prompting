using MedCare.Api.Data;
using MedCare.Api.Dtos;
using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Services;

/// <summary>
/// Appointment service. Mirrors the Spring Boot <c>AppointmentService</c>.
/// </summary>
public class AppointmentService
{
    private readonly MedCareDbContext _db;
    private readonly AuditService _audit;

    public AppointmentService(MedCareDbContext db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    /// <summary>All appointments, priority-sorted (1=emergency first).</summary>
    public async Task<List<Appointment>> FindAllAsync() =>
        await _db.Appointments.AsNoTracking()
            .OrderBy(a => a.Priority)
            .ToListAsync();

    /// <summary>A doctor's appointments, priority-sorted.</summary>
    public async Task<List<Appointment>> FindByDoctorAsync(long doctorId) =>
        await _db.Appointments.AsNoTracking()
            .Where(a => a.DoctorId == doctorId)
            .OrderBy(a => a.Priority)
            .ToListAsync();

    public async Task<Appointment> MarkDoneAsync(long id, string user)
    {
        var appt = await _db.Appointments.FirstOrDefaultAsync(a => a.Id == id)
                   ?? throw ApiException.NotFound("Appointment not found");

        appt.Status = "done";
        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Appointment completed: #{id}", user);
        return appt;
    }

    /// <summary>Reverts a 'done' appointment back to 'waiting' so mistakes can be corrected.</summary>
    public async Task<Appointment> RevertDoneAsync(long id, string user)
    {
        var appt = await _db.Appointments.FirstOrDefaultAsync(a => a.Id == id)
                   ?? throw ApiException.NotFound("Appointment not found");

        if (appt.Status != "done")
        {
            throw new ApiException("Appointment is not in done status — cannot revert.");
        }

        appt.Status = "waiting";
        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Appointment #{id} reverted to waiting by {user}", user);
        return appt;
    }

    public async Task<Appointment> ReassignAsync(long apptId, long newDoctorId, string adminUser)
    {
        var appt = await _db.Appointments.FirstOrDefaultAsync(a => a.Id == apptId)
                   ?? throw ApiException.NotFound("Appointment not found");
        var doctor = await _db.Doctors.FirstOrDefaultAsync(d => d.Id == newDoctorId)
                     ?? throw ApiException.NotFound("Doctor not found");

        appt.DoctorId = newDoctorId;
        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Appointment #{apptId} reassigned to {doctor.Name}", adminUser);
        return appt;
    }

    /// <summary>
    /// Emergency booking — no auth required. Creates the patient + a priority=1 appointment,
    /// auto-assigning the first available doctor.
    /// </summary>
    public async Task<Appointment> BookEmergencyAsync(EmergencyRequest req)
    {
        var patient = new Patient
        {
            Name = req.Name ?? string.Empty,
            Age = req.Age ?? 0,
            Gender = req.Gender ?? "Unknown",
            Contact = req.Mobile ?? string.Empty,
            BloodGroup = "Unknown",
            Allergies = "Unknown",
            Address = string.Empty,
            History = "Emergency walk-in - history not yet collected",
            LastVisit = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd"),
        };

        // Auto-assign: first available doctor, else first doctor, else id 1.
        var allDoctors = await _db.Doctors.ToListAsync();
        var available = allDoctors
            .FirstOrDefault(d => string.Equals(
                d.AvailabilityStatus, "available", StringComparison.OrdinalIgnoreCase));
        var doctorId = available?.Id ?? allDoctors.FirstOrDefault()?.Id ?? 1L;

        patient.DoctorId = doctorId;
        _db.Patients.Add(patient);
        await _db.SaveChangesAsync();

        var appt = new Appointment
        {
            PatientId = patient.Id,
            DoctorId = doctorId,
            Type = "emergency",
            Status = "waiting",
            Date = DateOnly.FromDateTime(DateTime.Now).ToString("yyyy-MM-dd"),
            Time = DateTime.Now.ToString("HH:mm"),
            Complaint = $"{req.EmergencyType}: {req.Description ?? string.Empty}",
            Priority = 1,
        };
        _db.Appointments.Add(appt);
        await _db.SaveChangesAsync();

        await _audit.LogAsync(
            $"EMERGENCY booking: {req.Name} ({req.EmergencyType})", "Guest/System");
        return appt;
    }
}
