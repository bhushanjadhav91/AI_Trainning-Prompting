using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;

namespace MedCare.Api.Services;

/// <summary>
/// Helper extensions for reading identity out of the authenticated <see cref="ClaimsPrincipal"/>.
/// Replaces the ad-hoc <c>jwtUtil.extractUserId(...)</c> / <c>auth.getName()</c> calls scattered
/// through the Spring Boot controllers.
/// </summary>
public static class CurrentUser
{
    /// <summary>The numeric <c>userId</c> claim (Doctor / Patient / Admin primary key).</summary>
    public static long UserId(this ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue("userId");
        return long.TryParse(raw, out var id) ? id : 0L;
    }

    /// <summary>
    /// The login identifier (<c>sub</c> claim) — username for admin/patient, email for doctor.
    /// This is what the Spring controllers passed as <c>auth.getName()</c> into audit logs.
    /// </summary>
    public static string Username(this ClaimsPrincipal user) =>
        user.FindFirstValue(JwtRegisteredClaimNames.Sub)
        ?? user.FindFirstValue(ClaimTypes.NameIdentifier)
        ?? user.Identity?.Name
        ?? "unknown";

    /// <summary>The human-readable display <c>name</c> claim.</summary>
    public static string DisplayName(this ClaimsPrincipal user) =>
        user.FindFirstValue("name") ?? user.Username();

    /// <summary>The <c>role</c> claim — ADMIN | DOCTOR | PATIENT.</summary>
    public static string Role(this ClaimsPrincipal user) =>
        user.FindFirstValue("role") ?? string.Empty;
}
