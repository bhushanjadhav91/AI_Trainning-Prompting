using MedCare.Api.Data;
using MedCare.Api.Dtos;
using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Services;

/// <summary>
/// Doctor management service. Mirrors the Spring Boot <c>DoctorService</c>.
/// As in the original, every returned <see cref="Doctor"/> has its password field nulled out
/// before leaving the service so it is never serialised to clients.
/// </summary>
public class DoctorService
{
    private const int BcryptWorkFactor = 12;

    private readonly MedCareDbContext _db;
    private readonly AuditService _audit;

    public DoctorService(MedCareDbContext db, AuditService audit)
    {
        _db = db;
        _audit = audit;
    }

    public async Task<List<Doctor>> FindAllAsync()
    {
        var docs = await _db.Doctors.AsNoTracking().ToListAsync();
        docs.ForEach(d => d.Password = null);
        return docs;
    }

    public async Task<Doctor> FindByIdAsync(long id)
    {
        var doc = await _db.Doctors.AsNoTracking().FirstOrDefaultAsync(d => d.Id == id)
                  ?? throw ApiException.NotFound("Doctor not found");
        doc.Password = null;
        return doc;
    }

    /// <summary>Admin creates a doctor. Password is optional — if omitted the account is 'pending'.</summary>
    public async Task<Doctor> CreateAsync(DoctorCreateRequest req, string adminUser)
    {
        if (await _db.Doctors.AnyAsync(d => d.Email == req.Email))
        {
            throw new ApiException("Email already in use");
        }

        var withPassword = !string.IsNullOrWhiteSpace(req.Password);
        if (withPassword)
        {
            ValidatePassword(req.Password!);
        }

        var doc = new Doctor
        {
            Name = req.Name,
            Specialization = req.Specialization,
            Email = req.Email,
            Password = withPassword
                ? BCrypt.Net.BCrypt.HashPassword(req.Password, BcryptWorkFactor)
                : null,
            Phone = req.Phone,
            Schedule = req.Schedule,
            Experience = req.Experience,
            Qualification = req.Qualification,
            AccountStatus = withPassword ? "active" : "pending",
            AvailabilityStatus = "available",
            ActivePatients = 0,
            Role = "DOCTOR",
        };

        _db.Doctors.Add(doc);
        await _db.SaveChangesAsync();
        await _audit.LogAsync(
            $"Doctor account created: {doc.Name} ({doc.Email}) status={doc.AccountStatus}",
            adminUser);
        doc.Password = null;
        return doc;
    }

    public async Task<Doctor> UpdateAsync(long id, DoctorCreateRequest req, string adminUser)
    {
        var doc = await _db.Doctors.FirstOrDefaultAsync(d => d.Id == id)
                  ?? throw ApiException.NotFound("Doctor not found");

        doc.Name = req.Name;
        doc.Specialization = req.Specialization;
        doc.Email = req.Email;
        doc.Phone = req.Phone;
        doc.Schedule = req.Schedule;
        doc.Experience = req.Experience;
        doc.Qualification = req.Qualification;

        if (!string.IsNullOrWhiteSpace(req.Password))
        {
            ValidatePassword(req.Password!);
            doc.Password = BCrypt.Net.BCrypt.HashPassword(req.Password, BcryptWorkFactor);
            doc.AccountStatus = "active";
        }

        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Doctor updated: {doc.Name}", adminUser);
        doc.Password = null;
        return doc;
    }

    /// <summary>Admin sets/resets a doctor password — moves a 'pending' account to 'active'.</summary>
    public async Task ResetPasswordAsync(long id, string? newPassword, string adminUser)
    {
        ValidatePassword(newPassword ?? string.Empty);
        var doc = await _db.Doctors.FirstOrDefaultAsync(d => d.Id == id)
                  ?? throw ApiException.NotFound("Doctor not found");

        doc.Password = BCrypt.Net.BCrypt.HashPassword(newPassword, BcryptWorkFactor);
        doc.AccountStatus = "active";
        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Admin set password for doctor: {doc.Email}", adminUser);
    }

    public async Task DeleteAsync(long id, string adminUser)
    {
        var doc = await _db.Doctors.FirstOrDefaultAsync(d => d.Id == id)
                  ?? throw ApiException.NotFound("Doctor not found");

        await _audit.LogAsync($"Doctor deleted: {doc.Name} ({doc.Email})", adminUser);
        _db.Doctors.Remove(doc);
        await _db.SaveChangesAsync();
    }

    /// <summary>Doctor sets their real-time availability: available, in-operation, away.</summary>
    public async Task<Doctor> UpdateAvailabilityAsync(
        long id, string? status, string? availableFrom,
        string? availableUntil, string? note, string user)
    {
        if (status is not ("available" or "in-operation" or "away"))
        {
            throw new ApiException("Invalid status. Use: available, in-operation, or away.");
        }

        var doc = await _db.Doctors.FirstOrDefaultAsync(d => d.Id == id)
                  ?? throw ApiException.NotFound("Doctor not found");

        doc.AvailabilityStatus = status;
        doc.AvailableFrom = availableFrom;
        doc.AvailableUntil = availableUntil;
        doc.AvailabilityNote = note;
        await _db.SaveChangesAsync();

        await _audit.LogAsync(
            $"Doctor {doc.Name} set availability: {status}"
            + (availableUntil is not null ? $" until {availableUntil}" : string.Empty),
            user);
        doc.Password = null;
        return doc;
    }

    /// <summary>Mirrors the Spring private password policy check.</summary>
    private static void ValidatePassword(string pw)
    {
        if (pw.Length < 8)
        {
            throw new ApiException("Password must be at least 8 characters.");
        }
        if (!pw.Any(char.IsUpper))
        {
            throw new ApiException("Password must contain an uppercase letter.");
        }
        if (!pw.Any(char.IsDigit))
        {
            throw new ApiException("Password must contain a digit.");
        }
    }
}
