using MedCare.Api.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace MedCare.Api.Filters;

/// <summary>
/// Global exception filter. Mirrors the Spring Boot <c>GlobalExceptionHandler</c>
/// (<c>@RestControllerAdvice</c>): every unhandled exception is converted to the uniform
/// JSON envelope <c>{ "error": "message string" }</c> with an appropriate status code.
///
/// <list type="bullet">
///   <item><description><see cref="ApiException"/> -> its own status code (400/401/403/404)</description></item>
///   <item><description><see cref="KeyNotFoundException"/> -> 404 (mirrors <c>orElseThrow</c>)</description></item>
///   <item><description><see cref="UnauthorizedAccessException"/> -> 403</description></item>
///   <item><description><see cref="ArgumentException"/> / <see cref="InvalidOperationException"/> -> 400</description></item>
///   <item><description>anything else -> 500 with a generic message; full detail logged server-side</description></item>
/// </list>
/// </summary>
public class GlobalExceptionFilter : IExceptionFilter
{
    private readonly ILogger<GlobalExceptionFilter> _logger;

    public GlobalExceptionFilter(ILogger<GlobalExceptionFilter> logger)
    {
        _logger = logger;
    }

    public void OnException(ExceptionContext context)
    {
        var (status, message) = context.Exception switch
        {
            ApiException api => (api.StatusCode, api.Message),
            KeyNotFoundException nf => (404, nf.Message),
            UnauthorizedAccessException => (403, "Access denied"),
            ArgumentException arg => (400, arg.Message),
            InvalidOperationException inv => (400, inv.Message),
            _ => (500, "An internal error occurred. Please contact support if this persists."),
        };

        if (status >= 500)
        {
            // Log the full stacktrace server-side only — never leak it to the client.
            _logger.LogError(context.Exception, "Unhandled exception");
        }
        else
        {
            _logger.LogWarning("Handled {Status} error: {Message}", status, message);
        }

        context.Result = new ObjectResult(new { error = message })
        {
            StatusCode = status,
        };
        context.ExceptionHandled = true;
    }
}
