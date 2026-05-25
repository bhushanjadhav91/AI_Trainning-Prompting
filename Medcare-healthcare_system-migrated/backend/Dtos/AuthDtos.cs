using System.ComponentModel.DataAnnotations;

namespace MedCare.Api.Dtos;

/// <summary>Login request body. Mirrors Spring Boot <c>LoginRequest</c>.</summary>
public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

/// <summary>
/// Login response body. Mirrors Spring Boot <c>LoginResponse</c> — field names
/// (token, role, name, userId, redirectTo) are kept identical so the React frontend
/// works unchanged.
/// </summary>
public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public long UserId { get; set; }
    public string RedirectTo { get; set; } = string.Empty;
}

/// <summary>Patient self sign-up request. Mirrors Spring Boot <c>PatientSignupRequest</c>.</summary>
public class PatientSignupRequest
{
    [Required(ErrorMessage = "name is required")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "username is required")]
    public string Username { get; set; } = string.Empty;

    [Required(ErrorMessage = "age is required")]
    public int? Age { get; set; }

    [Required(ErrorMessage = "mobile is required")]
    public string Mobile { get; set; } = string.Empty;

    [Required(ErrorMessage = "gender is required")]
    public string Gender { get; set; } = string.Empty;

    [Required]
    [MinLength(8, ErrorMessage = "Password must be at least 8 characters")]
    [RegularExpression(".*[A-Z].*", ErrorMessage = "Password must contain an uppercase letter")]
    public string Password { get; set; } = string.Empty;

    [Required(ErrorMessage = "motherName is required")]
    public string MotherName { get; set; } = string.Empty;

    [Required(ErrorMessage = "petName is required")]
    public string PetName { get; set; } = string.Empty;

    [Required(ErrorMessage = "homeTown is required")]
    public string HomeTown { get; set; } = string.Empty;
}

/// <summary>Forgot-password step 1 response. Mirrors Spring Boot <c>QuestionResponse</c>.</summary>
public class QuestionResponse
{
    public string Username { get; set; } = string.Empty;
    public string Question { get; set; } = string.Empty;
    public string QuestionKey { get; set; } = string.Empty;
}

/// <summary>Forgot-password step 2 request. Mirrors Spring Boot <c>ResetRequest</c>.</summary>
public class ResetRequest
{
    public string Username { get; set; } = string.Empty;
    public string QuestionKey { get; set; } = string.Empty;
    public string? Answer { get; set; }
    public string? NewPassword { get; set; }
}

/// <summary>Emergency booking request. Mirrors Spring Boot <c>EmergencyRequest</c>.</summary>
public class EmergencyRequest
{
    public string? Name { get; set; }
    public string? Mobile { get; set; }
    public int? Age { get; set; }
    public string? Gender { get; set; }
    public string? EmergencyType { get; set; }
    public string? Description { get; set; }
}
