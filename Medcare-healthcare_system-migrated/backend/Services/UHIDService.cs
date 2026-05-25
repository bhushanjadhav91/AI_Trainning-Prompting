using System.Text.RegularExpressions;
using MedCare.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MedCare.Api.Services;

/// <summary>
/// Generates and validates Unique Health Identification numbers (UHID), OPD tokens, and QR data.
/// Mirrors the Spring Boot <c>UHIDService</c>.
///
/// UHID format: <c>MED{YYYY}{NNNNNN}</c> e.g. <c>MED2024001234</c>.
/// Registered as Singleton — uses IServiceScopeFactory to safely resolve the scoped DbContext.
/// </summary>
public class UHIDService
{
    private const string Prefix = "MED";
    private readonly IServiceScopeFactory _scopeFactory;

    // Serialises UHID generation across concurrent requests, mirroring the Java
    // `synchronized` keyword on UHIDService.generate().
    private static readonly SemaphoreSlim GenerateLock = new(1, 1);

    public UHIDService(IServiceScopeFactory scopeFactory)
    {
        _scopeFactory = scopeFactory;
    }

    /// <summary>
    /// Generates the next UHID. Called exactly once per new patient registration; the value
    /// must be persisted by the caller. Uses the patient count as a safe surrogate sequence,
    /// identical to the Spring implementation.
    /// </summary>
    public async Task<string> GenerateAsync()
    {
        await GenerateLock.WaitAsync();
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var db = scope.ServiceProvider.GetRequiredService<MedCareDbContext>();
            var year = DateTime.Now.Year;
            var count = await db.Patients.CountAsync() + 1;
            return $"{Prefix}{year}{count:D6}";
        }
        finally
        {
            GenerateLock.Release();
        }
    }

    /// <summary>Generates an OPD queue token. Format: <c>OPD-{YYYYMMDD}-{SEQ}</c>.</summary>
    public string GenerateToken(string date, long dailySeq)
    {
        var compact = date.Replace("-", string.Empty);
        return $"OPD-{compact}-{dailySeq:D4}";
    }

    /// <summary>Builds the QR data string encoding UHID + token + datetime + name.</summary>
    public string BuildQrData(string? uhid, string? token, string? dateTime, string? patientName) =>
        $"UHID:{uhid}|TOKEN:{token}|DT:{dateTime}|NAME:{patientName}";

    /// <summary>Validates that a string matches the UHID format <c>MED</c> + 10 digits.</summary>
    public bool IsValidUhid(string? uhid) =>
        uhid is not null && Regex.IsMatch(uhid, @"^MED\d{10}$");
}
