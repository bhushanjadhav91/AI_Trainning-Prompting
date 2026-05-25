using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace MedCare.Api.Services;

/// <summary>
/// Issues and validates JWTs. Mirrors the Spring Boot <c>JwtUtil</c> component.
///
/// The token layout is kept byte-for-byte compatible with the Java implementation so the
/// existing React frontend continues to work without changes:
/// <list type="bullet">
///   <item><description><c>sub</c> — the username / email (the login identifier)</description></item>
///   <item><description><c>role</c> — ADMIN | DOCTOR | PATIENT</description></item>
///   <item><description><c>userId</c> — numeric primary key of the user</description></item>
///   <item><description><c>name</c> — display name (added per the migration brief)</description></item>
/// </list>
/// HMAC-SHA256 signing, identical to <c>Keys.hmacShaKeyFor</c> in jjwt.
/// </summary>
public class JwtService
{
    private readonly string _secret;
    private readonly long _expirationMs;

    public JwtService(IConfiguration configuration)
    {
        // In production the secret comes ONLY from the JWT_SECRET environment variable —
        // there is no hardcoded fallback (see appsettings.Production.json).
        _secret = configuration["Jwt:Secret"]
                  ?? throw new InvalidOperationException(
                      "JWT secret is not configured. Set the JWT_SECRET environment variable.");

        _expirationMs = long.TryParse(configuration["Jwt:ExpirationMs"], out var ms)
            ? ms
            : 86_400_000; // 24h default, same as Spring dev profile
    }

    private SymmetricSecurityKey GetSigningKey() =>
        new(Encoding.UTF8.GetBytes(_secret));

    /// <summary>
    /// Generates a signed JWT. <paramref name="username"/> becomes the <c>sub</c> claim;
    /// <paramref name="role"/>, <paramref name="userId"/> and <paramref name="name"/> are
    /// added as custom claims.
    /// </summary>
    public string GenerateToken(string username, string role, long userId, string name)
    {
        var now = DateTime.UtcNow;
        var creds = new SigningCredentials(GetSigningKey(), SecurityAlgorithms.HmacSha256);

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, username),
            new("role", role),
            new("userId", userId.ToString()),
            new("name", name),
        };

        var token = new JwtSecurityToken(
            claims: claims,
            notBefore: now,
            expires: now.AddMilliseconds(_expirationMs),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    /// <summary>Token validation parameters used by the JWT bearer middleware.</summary>
    public TokenValidationParameters GetValidationParameters() => new()
    {
        ValidateIssuer = false,
        ValidateAudience = false,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = GetSigningKey(),
        ClockSkew = TimeSpan.Zero,
        // Map the custom "role" claim onto ClaimTypes.Role so [Authorize(Roles=...)] works.
        RoleClaimType = "role",
        NameClaimType = JwtRegisteredClaimNames.Sub,
    };
}
