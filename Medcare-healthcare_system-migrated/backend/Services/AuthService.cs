using MedCare.Api.Data;
using MedCare.Api.Dtos;
using MedCare.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MedCare.Api.Services;

/// <summary>
/// Authentication / account service. Mirrors the Spring Boot <c>AuthService</c>.
/// BCrypt work factor 12 is enforced for every password hash, identical to the
/// <c>BCryptPasswordEncoder(12)</c> bean in the original <c>SecurityConfig</c>.
/// </summary>
public class AuthService
{
    private const int BcryptWorkFactor = 12;

    private readonly MedCareDbContext _db;
    private readonly JwtService _jwt;
    private readonly AuditService _audit;
    private static readonly Random Rng = new();

    public AuthService(MedCareDbContext db, JwtService jwt, AuditService audit)
    {
        _db = db;
        _jwt = jwt;
        _audit = audit;
    }

    /// <summary>
    /// Unified login. Tries Admin -> Doctor (by email) -> Patient (by username), exactly like
    /// the Spring implementation. A doctor with no password yet yields a clear "Contact Admin"
    /// message.
    /// </summary>
    public async Task<LoginResponse> LoginAsync(LoginRequest req)
    {
        var username = (req.Username ?? string.Empty).Trim();
        var password = req.Password ?? string.Empty;

        // 1) ADMIN
        var admin = await _db.Admins.FirstOrDefaultAsync(a => a.Username == username);
        if (admin is not null && BCrypt.Net.BCrypt.Verify(password, admin.Password))
        {
            await _audit.LogAsync($"Admin login: {admin.Username}", admin.Username);
            return new LoginResponse
            {
                Token = _jwt.GenerateToken(admin.Username, "ADMIN", admin.Id, admin.Username),
                Role = "ADMIN",
                Name = admin.Username,
                UserId = admin.Id,
                RedirectTo = "/admin/dashboard",
            };
        }

        // 2) DOCTOR (by email)
        var doctor = await _db.Doctors.FirstOrDefaultAsync(d => d.Email == username);
        if (doctor is not null)
        {
            if (string.IsNullOrWhiteSpace(doctor.Password))
            {
                throw new ApiException("Contact Admin to set your password.", 401);
            }
            if (BCrypt.Net.BCrypt.Verify(password, doctor.Password))
            {
                await _audit.LogAsync($"Doctor login: {doctor.Name}", doctor.Name);
                return new LoginResponse
                {
                    Token = _jwt.GenerateToken(doctor.Email, "DOCTOR", doctor.Id, doctor.Name),
                    Role = "DOCTOR",
                    Name = doctor.Name,
                    UserId = doctor.Id,
                    RedirectTo = "/doctor/dashboard",
                };
            }
        }

        // 3) PATIENT (by username)
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.Username == username);
        if (patient is not null && !string.IsNullOrEmpty(patient.Password)
            && BCrypt.Net.BCrypt.Verify(password, patient.Password))
        {
            await _audit.LogAsync($"Patient login: {patient.Username}", patient.Username!);
            return new LoginResponse
            {
                Token = _jwt.GenerateToken(patient.Username!, "PATIENT", patient.Id, patient.Name),
                Role = "PATIENT",
                Name = patient.Name,
                UserId = patient.Id,
                RedirectTo = "/patient/dashboard",
            };
        }

        throw new ApiException("Invalid credentials.", 401);
    }

    /// <summary>Patient self sign-up with security questions.</summary>
    public async Task<Patient> SignupPatientAsync(PatientSignupRequest req)
    {
        if (await _db.Patients.AnyAsync(p => p.Username == req.Username))
        {
            throw new ApiException("Username already taken.");
        }

        var patient = new Patient
        {
            Name = req.Name,
            Username = req.Username,
            Age = req.Age ?? 0,
            Gender = req.Gender,
            Contact = req.Mobile,
            Password = BCrypt.Net.BCrypt.HashPassword(req.Password, BcryptWorkFactor),
            MotherName = req.MotherName.Trim().ToLowerInvariant(),
            PetName = req.PetName.Trim().ToLowerInvariant(),
            HomeTown = req.HomeTown.Trim().ToLowerInvariant(),
            Role = "PATIENT",
            BloodGroup = "Unknown",
            Allergies = "None",
            Address = string.Empty,
            History = string.Empty,
        };

        _db.Patients.Add(patient);
        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Patient self-registered: {patient.Username}", patient.Username!);
        return patient;
    }

    /// <summary>Forgot-password step 1: picks ONE random security question.</summary>
    public async Task<QuestionResponse> PickSecurityQuestionAsync(string username)
    {
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.Username == username)
                      ?? throw new ApiException("Username not found.");

        var questions = new (string Key, string Text)[]
        {
            ("MOTHER", "What is your mother's name?"),
            ("PET", "What is your pet's name?"),
            ("HOMETOWN", "What is your home town?"),
        };
        var picked = questions[Rng.Next(questions.Length)];

        return new QuestionResponse
        {
            Username = patient.Username!,
            QuestionKey = picked.Key,
            Question = picked.Text,
        };
    }

    /// <summary>Forgot-password step 2: verifies the answer and resets the password.</summary>
    public async Task ResetPasswordAsync(ResetRequest req)
    {
        var patient = await _db.Patients.FirstOrDefaultAsync(p => p.Username == req.Username)
                      ?? throw new ApiException("Username not found.");

        var answer = (req.Answer ?? string.Empty).Trim().ToLowerInvariant();
        var ok = req.QuestionKey switch
        {
            "MOTHER" => answer == patient.MotherName,
            "PET" => answer == patient.PetName,
            "HOMETOWN" => answer == patient.HomeTown,
            _ => false,
        };
        if (!ok)
        {
            throw new ApiException("Incorrect answer.");
        }

        var newPassword = req.NewPassword ?? string.Empty;
        if (newPassword.Length < 8
            || !newPassword.Any(char.IsUpper)
            || !newPassword.Any(char.IsDigit))
        {
            throw new ApiException(
                "Password must be 8+ chars with one uppercase and one digit.");
        }

        patient.Password = BCrypt.Net.BCrypt.HashPassword(newPassword, BcryptWorkFactor);
        await _db.SaveChangesAsync();
        await _audit.LogAsync($"Password reset (forgot-flow): {patient.Username}", patient.Username!);
    }
}
