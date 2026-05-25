# ── Build stage ──────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

COPY MedCare.Api.csproj .
RUN dotnet restore

COPY . .
RUN dotnet publish -c Release -o /app/publish --no-restore

# ── Runtime stage ─────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Create uploads directory (volume-mounted in production).
RUN mkdir -p /app/uploads && chmod 750 /app/uploads

COPY --from=build /app/publish .

# Non-root user for security, matching the Spring image convention.
RUN addgroup --system medcare && adduser --system --ingroup medcare medcare
RUN chown -R medcare:medcare /app
USER medcare

EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENV ASPNETCORE_ENVIRONMENT=Production

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget --quiet --spider http://localhost:8080/actuator/health || exit 1

ENTRYPOINT ["dotnet", "MedCare.Api.dll"]
