using MedCare.Api.Data;
using MedCare.Api.Models;

namespace MedCare.Api.Services;

/// <summary>
/// Records audit-log entries. Mirrors the Spring Boot <c>AuditService</c> — a scoped service
/// registered in the DI container (Spring <c>@Service</c>).
/// </summary>
public class AuditService
{
    private readonly MedCareDbContext _db;

    public AuditService(MedCareDbContext db)
    {
        _db = db;
    }

    /// <summary>
    /// Persists a single audit entry. The timestamp format <c>yyyy-MM-dd HH:mm:ss</c> matches
    /// the Spring implementation exactly.
    /// </summary>
    public async Task LogAsync(string action, string user)
    {
        _db.AuditLogs.Add(new AuditLog
        {
            Action = action,
            PerformedBy = user,
            Timestamp = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"),
        });
        await _db.SaveChangesAsync();
    }
}
