using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Configuration;

namespace PatientApi.Services
{
    public class OpenAIChatService : IOpenAIChatService
    {
        private readonly HttpClient _http;
        private readonly string _apiKey;

        public OpenAIChatService(HttpClient http, IConfiguration config)
        {
            _http = http;

            // Prefer env var, fallback to appsettings.json -> "OpenAI:ApiKey"
            _apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY")
            ?? config["OpenAI:ApiKey"]
            ?? throw new InvalidOperationException("OpenAI API key not configured.");
        }

        public async Task<string> AskAsync(string prompt, CancellationToken ct = default)
        {
            var payload = new
            {
                model = "gpt-4o-mini",
                messages = new[]
            {
new { role = "user", content = prompt }
},
                temperature = 0.3
            };

            using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
            req.Content = new StringContent(JsonSerializer.Serialize(payload), Encoding.UTF8, "application/json");

            var res = await _http.SendAsync(req, ct);
            res.EnsureSuccessStatusCode();

            using var stream = await res.Content.ReadAsStreamAsync(ct);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: ct);

            return doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? string.Empty;
        }
    }
}