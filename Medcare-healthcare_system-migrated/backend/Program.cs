using MedCare.Api;
using MedCare.Api.Data;
using MedCare.Api.Filters;
using MedCare.Api.Middleware;
using MedCare.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Serilog;

// ── Always default to Development so local dev never loads Production config ─
if (string.IsNullOrEmpty(Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")))
    Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Development");

Log.Logger = new LoggerConfiguration().WriteTo.Console().CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((ctx, lc) => lc
        .ReadFrom.Configuration(ctx.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console(outputTemplate:
            "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}"));

    // ── Database: always SQLite locally, PostgreSQL only when real URL provided ─
    var conn = builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=medcare.db";
    var useSqlite = string.IsNullOrWhiteSpace(conn)
                    || conn.StartsWith("Data Source", StringComparison.OrdinalIgnoreCase)
                    || conn.StartsWith("${", StringComparison.Ordinal)
                    || builder.Environment.IsDevelopment();

    builder.Services.AddDbContext<MedCareDbContext>(o =>
    {
        if (useSqlite)
            o.UseSqlite(conn.StartsWith("Data Source", StringComparison.OrdinalIgnoreCase) ? conn : "Data Source=medcare.db");
        else
            o.UseNpgsql(conn);
    });

    // ── Services ──────────────────────────────────────────────────────────────
    builder.Services.AddScoped<JwtService>();
    builder.Services.AddScoped<AuditService>();
    builder.Services.AddSingleton<UHIDService>();
    builder.Services.AddScoped<AuthService>();
    builder.Services.AddScoped<DoctorService>();
    builder.Services.AddScoped<PatientService>();
    builder.Services.AddScoped<AppointmentService>();
    builder.Services.AddScoped<PrescriptionService>();
    builder.Services.AddScoped<LeaveService>();
    builder.Services.AddScoped<ClockService>();
    builder.Services.AddScoped<DoctorProfileService>();
    builder.Services.AddScoped<BillingService>();
    builder.Services.AddScoped<RegistrationService>();
    builder.Services.AddScoped<AdmissionService>();
    builder.Services.AddScoped<LabService>();
    builder.Services.AddScoped<RadiologyService>();
    builder.Services.AddScoped<PharmacyService>();
    builder.Services.AddScoped<TriageService>();
    builder.Services.AddScoped<FileStorageService>();
    builder.Services.AddScoped<MedicalReportService>();

    // ── JWT ───────────────────────────────────────────────────────────────────
    // CRITICAL: Clear the default inbound claim type map BEFORE setting up JWT bearer.
    // Without this, the "role" claim gets renamed to ClaimTypes.Role automatically by the
    // default Microsoft mapping, but the RoleClaimType setting only takes effect if the
    // claim hasn't already been mapped. This causes [Authorize(Roles="ADMIN")] to fail.
    System.IdentityModel.Tokens.Jwt.JwtSecurityTokenHandler.DefaultInboundClaimTypeMap.Clear();

    var jwtSvc = new JwtService(builder.Configuration);
    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(o =>
        {
            o.MapInboundClaims = false;  // Disable auto-mapping of standard claim names
            o.TokenValidationParameters = jwtSvc.GetValidationParameters();
            o.Events = new JwtBearerEvents
            {
                OnChallenge = async ctx =>
                {
                    ctx.HandleResponse();
                    ctx.Response.StatusCode = 401;
                    ctx.Response.ContentType = "application/json";
                    await ctx.Response.WriteAsync("{\"error\":\"Unauthorized\"}");
                },
                OnForbidden = async ctx =>
                {
                    ctx.Response.StatusCode = 403;
                    ctx.Response.ContentType = "application/json";
                    await ctx.Response.WriteAsync("{\"error\":\"Access denied\"}");
                },
            };
        });
    builder.Services.AddAuthorization();

    // ── CORS ──────────────────────────────────────────────────────────────────
    var origins = (builder.Configuration.GetSection("MedCare:Cors:AllowedOrigins").Get<string[]>()
                   ?? Array.Empty<string>())
                  .Where(o => !string.IsNullOrWhiteSpace(o))
                  .ToArray();
    if (origins.Length == 0)
        origins = new[] { "http://localhost:4200", "http://localhost:5173" };

    builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
        p.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

    // ── MVC + JSON camelCase ──────────────────────────────────────────────────
    builder.Services.AddControllers(o => o.Filters.Add<GlobalExceptionFilter>())
        .AddJsonOptions(o =>
        {
            o.JsonSerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
            o.JsonSerializerOptions.DefaultIgnoreCondition =
                System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull;
        });

    // ── Swagger (dev only) ────────────────────────────────────────────────────
    if (builder.Environment.IsDevelopment())
    {
        builder.Services.AddEndpointsApiExplorer();
        builder.Services.AddSwaggerGen(c =>
        {
            c.SwaggerDoc("v1", new() { Title = "MedCare+ API v7", Version = "v7" });
            c.AddSecurityDefinition("Bearer", new()
            {
                Type = Microsoft.OpenApi.Models.SecuritySchemeType.Http,
                Scheme = "bearer", BearerFormat = "JWT",
            });
            c.AddSecurityRequirement(new()
            {
                [new() { Reference = new() { Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme, Id = "Bearer" } }]
                    = Array.Empty<string>()
            });
        });
    }

    builder.Services.AddHealthChecks();

    var app = builder.Build();

    app.UseSerilogRequestLogging();
    app.UseSecurityHeaders();

    if (app.Environment.IsDevelopment())
    {
        app.UseSwagger();
        app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "MedCare+ v7"));
    }

    app.UseCors();
    app.UseAuthentication();
    app.UseAuthorization();
    app.MapHealthChecks("/actuator/health");
    app.MapControllers();

    // Always seed (DataSeeder skips if data exists, refreshes dates)
    await DataSeeder.SeedAsync(app.Services);

    app.Run();
}
catch (Exception ex) { Log.Fatal(ex, "Startup failed"); }
finally { Log.CloseAndFlush(); }
