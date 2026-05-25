using System.Globalization;
using System.Text.RegularExpressions;
using MedCare.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace MedCare.Api.Controllers;

/// <summary>
/// Public (no-auth) endpoints. Mirrors the Spring Boot <c>PublicController</c>
/// (<c>@RequestMapping("/api/public")</c>). Includes the schedule-string slot generation logic
/// translated verbatim from the Java implementation.
/// </summary>
[ApiController]
[Route("api/public")]
[AllowAnonymous]
public class PublicController : ControllerBase
{
    private readonly DoctorService _doctorService;

    public PublicController(DoctorService doctorService)
    {
        _doctorService = doctorService;
    }

    /// <summary>Lists all active doctors with availability info (for patient booking).</summary>
    [HttpGet("doctors")]
    public async Task<IActionResult> PublicDoctors()
    {
        var doctors = await _doctorService.FindAllAsync();
        var trimmed = doctors
            .Where(d => d.AccountStatus == "active")
            .Select(d => new
            {
                id = d.Id,
                name = d.Name,
                specialization = d.Specialization,
                schedule = d.Schedule,
                experience = d.Experience,
                qualification = d.Qualification,
                availabilityStatus = d.AvailabilityStatus,
                availableFrom = d.AvailableFrom,
                availableUntil = d.AvailableUntil,
                availabilityNote = d.AvailabilityNote,
            })
            .ToList();
        return Ok(trimmed);
    }

    /// <summary>
    /// Returns 30-minute appointment slots for a doctor on a given date. Slots are only
    /// generated when the doctor is not "away". Slot times come from the doctor's schedule
    /// string (e.g. "Mon-Sat 9AM-1PM").
    /// </summary>
    [HttpGet("doctors/{id:long}/slots")]
    public async Task<IActionResult> DoctorSlots(long id, [FromQuery] string date = "")
    {
        var d = await _doctorService.FindByIdAsync(id);

        if (d.AccountStatus != "active")
        {
            return Ok(new { slots = Array.Empty<string>(), reason = "Doctor not active" });
        }
        if (d.AvailabilityStatus == "away")
        {
            var reason = d.AvailabilityNote ?? "Doctor is away";
            var when = d.AvailableFrom is not null
                ? $"Available from {d.AvailableFrom}"
                : string.Empty;
            return Ok(new { slots = Array.Empty<string>(), reason, availableFrom = when });
        }

        var slots = GenerateSlots(d.Schedule, d.AvailableUntil);

        return Ok(new
        {
            doctorId = id,
            doctorName = d.Name,
            date,
            status = d.AvailabilityStatus,
            availableUntil = d.AvailableUntil ?? string.Empty,
            availabilityNote = d.AvailabilityNote ?? string.Empty,
            slots,
        });
    }

    /// <summary>Generates 30-min slots from a schedule string like "Mon-Sat 9AM-1PM".</summary>
    private static List<string> GenerateSlots(string? schedule, string? busyUntil)
    {
        if (string.IsNullOrWhiteSpace(schedule))
        {
            return BuildSlots(new TimeOnly(9, 0), new TimeOnly(17, 0), busyUntil);
        }

        var upper = schedule.ToUpperInvariant();
        var match = Regex.Match(
            upper,
            @"(\d{1,2}(?::\d{2})?\s*(?:AM|PM))\s*[-–]\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM))");
        if (match.Success)
        {
            try
            {
                var from = ParseTime(match.Groups[1].Value.Trim());
                var to = ParseTime(match.Groups[2].Value.Trim());
                return BuildSlots(from, to, busyUntil);
            }
            catch
            {
                // Fall through to the default window on any parse failure.
            }
        }

        return BuildSlots(new TimeOnly(9, 0), new TimeOnly(17, 0), busyUntil);
    }

    private static List<string> BuildSlots(TimeOnly from, TimeOnly to, string? busyUntil)
    {
        var slots = new List<string>();
        TimeOnly? busyEnd = null;
        if (!string.IsNullOrWhiteSpace(busyUntil)
            && TimeOnly.TryParseExact(busyUntil, "HH:mm", out var parsed))
        {
            busyEnd = parsed;
        }

        var cursor = from;
        while (cursor < to)
        {
            // Skip slots still inside the "in-operation / away until" window.
            if (busyEnd is not null && cursor <= busyEnd.Value)
            {
                cursor = cursor.AddMinutes(30);
                continue;
            }
            slots.Add(cursor.ToString("HH:mm"));
            cursor = cursor.AddMinutes(30);
        }
        return slots;
    }

    private static TimeOnly ParseTime(string s)
    {
        s = Regex.Replace(s, @"\s+", string.Empty);
        var pm = s.EndsWith("PM", StringComparison.OrdinalIgnoreCase);
        s = s.Replace("AM", string.Empty, StringComparison.OrdinalIgnoreCase)
             .Replace("PM", string.Empty, StringComparison.OrdinalIgnoreCase);

        int hour;
        var min = 0;
        if (s.Contains(':'))
        {
            var parts = s.Split(':');
            hour = int.Parse(parts[0], CultureInfo.InvariantCulture);
            min = int.Parse(parts[1], CultureInfo.InvariantCulture);
        }
        else
        {
            hour = int.Parse(s, CultureInfo.InvariantCulture);
        }

        if (pm && hour != 12)
        {
            hour += 12;
        }
        if (!pm && hour == 12)
        {
            hour = 0;
        }
        return new TimeOnly(hour, min);
    }
}
