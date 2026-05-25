namespace MedCare.Api.Middleware;

/// <summary>
/// Adds the security response headers that the Spring Boot <c>SecurityConfig</c>
/// configured via <c>http.headers(...)</c>:
/// <list type="bullet">
///   <item><description><c>X-Frame-Options: DENY</c></description></item>
///   <item><description><c>Content-Security-Policy</c> — same policy directives as Spring</description></item>
///   <item><description><c>Strict-Transport-Security</c> — 1 year, includeSubDomains</description></item>
///   <item><description><c>X-Content-Type-Options: nosniff</c> (defence in depth)</description></item>
/// </list>
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task Invoke(HttpContext context)
    {
        var headers = context.Response.Headers;

        headers["X-Frame-Options"] = "DENY";
        headers["X-Content-Type-Options"] = "nosniff";
        headers["Content-Security-Policy"] =
            "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'";
        headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";

        await _next(context);
    }
}

/// <summary>Extension method to register <see cref="SecurityHeadersMiddleware"/>.</summary>
public static class SecurityHeadersMiddlewareExtensions
{
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder app) =>
        app.UseMiddleware<SecurityHeadersMiddleware>();
}
