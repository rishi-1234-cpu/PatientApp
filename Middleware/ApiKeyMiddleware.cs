using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Primitives;

namespace PatientApi.Middleware
{
    /// <summary>
    /// Simple API-key guard for unauthenticated requests.
    /// - Secures /api/* by default
    /// - Allows /hubs/* when either x-api-key header OR access_token query matches
    /// - Skips for authenticated (JWT) requests and [AllowAnonymous] endpoints
    /// </summary>
    public class ApiKeyMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly string? _expectedApiKey;

        public ApiKeyMiddleware(RequestDelegate next, IConfiguration config)
        {
            _next = next;
            _expectedApiKey = config["ApiSettings:ApiKey"];
        }

        public async Task InvokeAsync(HttpContext context)
        {
            var req = context.Request;
            var path = req.Path.Value?.ToLowerInvariant() ?? string.Empty;

            // Let non-API traffic pass (static files, index.html, swagger, etc.)
            var isApi = path.StartsWith("/api/");
            var isHub = path.StartsWith("/hubs/");

            // Always allow CORS preflight
            if (HttpMethods.IsOptions(req.Method))
            {
                await _next(context);
                return;
            }

            // Already authenticated via JWT? Skip API-key check.
            if (context.User?.Identity?.IsAuthenticated == true)
            {
                await _next(context);
                return;
            }

            // Respect endpoint metadata (e.g., [AllowAnonymous])
            var endpoint = context.GetEndpoint();
            if (endpoint?.Metadata.GetMetadata<IAllowAnonymous>() is not null)
            {
                await _next(context);
                return;
            }

            // If not touching /api or /hubs, just pass through
            if (!isApi && !isHub)
            {
                await _next(context);
                return;
            }

            // Ensure we actually have a configured key
            if (string.IsNullOrWhiteSpace(_expectedApiKey))
            {
                context.Response.StatusCode = StatusCodes.Status500InternalServerError;
                context.Response.ContentType = "text/plain";
                await context.Response.WriteAsync("API key not configured.");
                return;
            }

            // ----- Special handling for SignalR hubs -----
            if (isHub)
            {
                // Accept either header x-api-key OR query ?access_token=KEY
                var headerOk = req.Headers.TryGetValue("x-api-key", out var headerVal)
                && !StringValues.IsNullOrEmpty(headerVal)
                && string.Equals(headerVal.ToString(), _expectedApiKey);

                var qsOk = req.Query.TryGetValue("access_token", out var qsVal)
                && !StringValues.IsNullOrEmpty(qsVal)
                && string.Equals(qsVal.ToString(), _expectedApiKey);

                if (headerOk || qsOk)
                {
                    await _next(context);
                    return;
                }

                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.ContentType = "text/plain";
                await context.Response.WriteAsync("Missing or invalid API key for SignalR hub.");
                return;
            }

            // ----- Default: protect /api/* with x-api-key header -----
            if (isApi)
            {
                if (!req.Headers.TryGetValue("x-api-key", out var provided) ||
                StringValues.IsNullOrEmpty(provided) ||
                !string.Equals(provided.ToString(), _expectedApiKey))
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    context.Response.ContentType = "text/plain";
                    await context.Response.WriteAsync("Missing or invalid x-api-key.");
                    return;
                }

                await _next(context);
                return;
            }

            // Fallback (shouldn’t hit)
            await _next(context);
        }
    }
}
