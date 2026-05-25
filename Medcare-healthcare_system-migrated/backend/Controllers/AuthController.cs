using MedCare.Api.Dtos;
using MedCare.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedCare.Api.Controllers;

/// <summary>
/// Auth and account endpoints. Mirrors the Spring Boot <c>AuthController</c>
/// (<c>@RequestMapping("/api")</c>). Routes are kept byte-for-byte identical.
/// </summary>
[ApiController]
[Route("api")]
[AllowAnonymous]
public class AuthController : ControllerBase
{
    private readonly AuthService _auth;
    private readonly AppointmentService _appointments;

    public AuthController(AuthService auth, AppointmentService appointments)
    {
        _auth = auth;
        _appointments = appointments;
    }

    /// <summary>Unified login (admin / doctor / patient). <c>POST /api/auth/login</c>.</summary>
    [HttpPost("auth/login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        try
        {
            return Ok(await _auth.LoginAsync(req));
        }
        catch (ApiException e)
        {
            // Login failures historically returned 401 with { error } in Spring.
            return StatusCode(401, new { error = e.Message });
        }
    }

    /// <summary>Patient self sign-up with security questions. <c>POST /api/auth/signup</c>.</summary>
    [HttpPost("auth/signup")]
    public async Task<IActionResult> Signup([FromBody] PatientSignupRequest req)
    {
        var patient = await _auth.SignupPatientAsync(req);
        return Ok(new
        {
            success = true,
            patientId = patient.Id,
            message = "Account created. You can log in now.",
        });
    }

    /// <summary>Forgot-password step 1: get a random security question.</summary>
    [HttpGet("auth/forgot/question")]
    public async Task<IActionResult> GetQuestion([FromQuery] string username)
    {
        return Ok(await _auth.PickSecurityQuestionAsync(username));
    }

    /// <summary>Forgot-password step 2: answer the question and reset the password.</summary>
    [HttpPost("auth/forgot/reset")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetRequest req)
    {
        await _auth.ResetPasswordAsync(req);
        return Ok(new { success = true, message = "Password reset. You can log in now." });
    }

    /// <summary>Emergency booking — no auth required. <c>POST /api/emergency/book</c>.</summary>
    [HttpPost("emergency/book")]
    public async Task<IActionResult> BookEmergency([FromBody] EmergencyRequest req)
    {
        var appt = await _appointments.BookEmergencyAsync(req);
        return Ok(new
        {
            success = true,
            appointmentId = appt.Id,
            message = "Emergency booked. Auto-prioritized in queue.",
        });
    }
}
