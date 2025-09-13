using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Primitives;

namespace PatientApi.Middleware
{
    /// <summary>
    /// API-key middleware for unauthenticated requests.
    /// - Protects /api/*
    /// - Allows /hubs/* if either x-api-key header OR ?access_token= query matches
    /// - Skips for JWT-authenticated or [AllowAnonymous] endpoints
    /// </summary>
    public class ApiKeyMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly string? _expectedApiKey;
        private readonly ILogger<ApiKeyMiddleware> _logger;

        public ApiKeyMiddleware(RequestDelegate next, IConfiguration config, ILogger<ApiKeyMiddleware> logger)
        {
            _next = next;
            _logger = logger;
            _expectedApiKey = config["ApiSettings:ApiKey"];
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var req = context.Request;
            var path = req.Path.Value?.ToLowerInvariant() ?? string.Empty;

            // Allow OPTIONS preflight
            if (HttpMethods.IsOptions(req.Method))
            {
                await _next(context);
                return;
            }

            // If already authenticated via JWT
            if (context.User?.Identity?.IsAuthenticated == true)
            {
                await _next(context);
                return;
            }

            // Allow [AllowAnonymous]
            var endpoint = context.GetEndpoint();
            if (endpoint?.Metadata.GetMetadata<IAllowAnonymous>() is not null)
            {
                await _next(context);
                return;
            }

            var isApi = path.StartsWith("/api/");
            var isHub = path.StartsWith("/hubs/");

            // Not targeting /api or /hubs → skip
            if (!isApi && !isHub)
            {
                await _next(context);
                return;
            }

            if (string.IsNullOrWhiteSpace(_expectedApiKey))
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                await context.Response.WriteAsync("API key not configured.");
                return;
            }

            // ---- Special: hubs ----
            if (isHub)
            {
                var headerOk = req.Headers.TryGetValue("x-api-key", out var headerVal)
                && !StringValues.IsNullOrEmpty(headerVal)
                && string.Equals(headerVal.ToString(), _expectedApiKey);

                var qsOk = req.Query.TryGetValue("access_token", out var qsVal)
                && !StringValues.IsNullOrEmpty(qsVal)
                && string.Equals(qsVal.ToString(), _expectedApiKey);

                if (headerOk || qsOk)
                {
                    _logger.LogInformation("✅ Hub authorized via {method}", headerOk ? "header" : "query");
                    await _next(context);
                    return;
                }

                _logger.LogWarning("❌ Hub unauthorized. Provided header={Header}, query={Query}",
                req.Headers["x-api-key"].ToString(), req.Query["access_token"].ToString());

                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                await context.Response.WriteAsync("Missing or invalid API key for SignalR hub.");
                return;
            }

            // ---- Protect /api/*
            if (isApi)
            {
                if (!req.Headers.TryGetValue("x-api-key", out var provided) ||
                StringValues.IsNullOrEmpty(provided) ||
                !string.Equals(provided.ToString(), _expectedApiKey))
                {
                    _logger.LogWarning("❌ API unauthorized. Provided={Provided}", provided.ToString());
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    await context.Response.WriteAsync("Missing or invalid x-api-key.");
                    return;
                }

                _logger.LogInformation("✅ API authorized with x-api-key");
                await _next(context);
                return;
            }

            await _next(context);
        }
    }
}
