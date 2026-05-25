namespace MedCare.Api.Services;

/// <summary>
/// Thrown by the service layer to signal a user-safe 400-level error. Equivalent to the
/// <c>RuntimeException</c> with user-safe messages that the Spring Boot services threw and
/// that <c>GlobalExceptionHandler</c> turned into <c>{ "error": "..." }</c> 400 responses.
/// </summary>
public class ApiException : Exception
{
    /// <summary>HTTP status code to return. Defaults to 400 Bad Request.</summary>
    public int StatusCode { get; }

    public ApiException(string message, int statusCode = StatusCodes400) : base(message)
    {
        StatusCode = statusCode;
    }

    private const int StatusCodes400 = 400;

    /// <summary>Convenience factory for a 404 Not Found, mirroring <c>orElseThrow</c> usage.</summary>
    public static ApiException NotFound(string message) => new(message, 404);

    /// <summary>Convenience factory for a 403 Forbidden.</summary>
    public static ApiException Forbidden(string message) => new(message, 403);

    /// <summary>Convenience factory for a 401 Unauthorized.</summary>
    public static ApiException Unauthorized(string message) => new(message, 401);
}
