namespace MedCare.Api.Services;

/// <summary>
/// On-disk file storage for medical report uploads. Mirrors the Spring Boot
/// <c>FileStorageService</c> with the same defence-in-depth checks:
/// <list type="number">
///   <item><description>non-empty and under the 10 MB size limit</description></item>
///   <item><description>content-type whitelist AND extension whitelist</description></item>
///   <item><description>filename sanitisation — blocks <c>..</c>, <c>/</c>, <c>\</c></description></item>
///   <item><description>stored as <c>{Guid}.{ext}</c> so on-disk names are unguessable</description></item>
///   <item><description>path-traversal guard — the resolved path must stay inside the upload dir</description></item>
/// </list>
/// </summary>
public class FileStorageService
{
    private readonly string _uploadDir;
    private readonly long _maxSizeMb;

    /// <summary>Strict content-type whitelist. Anything not listed is rejected.</summary>
    private static readonly HashSet<string> AllowedTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf",
        "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
    };

    private static readonly HashSet<string> AllowedExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        "pdf", "jpg", "jpeg", "png", "gif", "webp", "doc", "docx", "txt",
    };

    public FileStorageService(IConfiguration configuration)
    {
        _uploadDir = Path.GetFullPath(
            configuration["MedCare:Upload:Dir"] ?? "./uploads");
        _maxSizeMb = long.TryParse(configuration["MedCare:Upload:MaxSizeMb"], out var mb)
            ? mb
            : 10;

        Directory.CreateDirectory(_uploadDir);
    }

    /// <summary>The result of storing a file. Mirrors the Spring <c>StoredFile</c> record.</summary>
    public record StoredFile(string OriginalName, string StoredName, string ContentType, long Size);

    /// <summary>Validates and persists an uploaded file, returning its metadata.</summary>
    public async Task<StoredFile> StoreAsync(IFormFile? file)
    {
        if (file is null || file.Length == 0)
        {
            throw new ApiException("File is empty");
        }

        var maxBytes = _maxSizeMb * 1024L * 1024L;
        if (file.Length > maxBytes)
        {
            throw new ApiException($"File exceeds maximum size of {_maxSizeMb} MB");
        }

        var contentType = file.ContentType;
        if (string.IsNullOrEmpty(contentType) || !AllowedTypes.Contains(contentType))
        {
            throw new ApiException(
                "File type not allowed. Allowed: PDF, images, Word docs, text.");
        }

        var original = file.FileName;
        if (string.IsNullOrWhiteSpace(original))
        {
            throw new ApiException("Filename is missing");
        }

        // Defence in depth — block path traversal and sanitise.
        var cleanName = Path.GetFileName(original);
        if (cleanName.Contains("..") || cleanName.Contains('/') || cleanName.Contains('\\'))
        {
            throw new ApiException("Invalid filename");
        }

        var ext = string.Empty;
        var dot = cleanName.LastIndexOf('.');
        if (dot > 0)
        {
            ext = cleanName[(dot + 1)..].ToLowerInvariant();
        }
        if (!AllowedExtensions.Contains(ext))
        {
            throw new ApiException($"File extension '{ext}' not allowed");
        }

        var storedName = $"{Guid.NewGuid()}.{ext}";
        var target = Path.Combine(_uploadDir, storedName);

        // Final safety check — the resolved path must remain inside the upload directory.
        var resolved = Path.GetFullPath(target);
        if (Path.GetDirectoryName(resolved) != _uploadDir)
        {
            throw new ApiException("Invalid file path");
        }

        await using (var stream = new FileStream(resolved, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        return new StoredFile(cleanName, storedName, contentType, file.Length);
    }

    /// <summary>Resolves a stored file to a readable path, guarding against path traversal.</summary>
    public string ResolvePath(string storedName)
    {
        var path = Path.GetFullPath(Path.Combine(_uploadDir, storedName));
        if (Path.GetDirectoryName(path) != _uploadDir)
        {
            throw new ApiException("Invalid file path");
        }
        if (!File.Exists(path))
        {
            throw ApiException.NotFound($"File not found: {storedName}");
        }
        return path;
    }

    /// <summary>Deletes a stored file, guarding against path traversal.</summary>
    public void Delete(string storedName)
    {
        var path = Path.GetFullPath(Path.Combine(_uploadDir, storedName));
        if (Path.GetDirectoryName(path) != _uploadDir)
        {
            throw new ApiException("Invalid file path");
        }
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }
}
