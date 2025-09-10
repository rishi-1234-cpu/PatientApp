using Microsoft.Extensions.Configuration;
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace PatientApi.Services
{
    public class OpenAIChatService : IOpenAIChatService
    {
        private readonly HttpClient _http;
        private readonly string _apiKey;
        private readonly string _model;
        private static readonly JsonSerializerOptions _json = new()
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        };

        public OpenAIChatService(HttpClient http, IConfiguration cfg)
        {
            _http = http;

            // Prefer environment variable, fall back to appsettings.json
            _apiKey = Environment.GetEnvironmentVariable("OPENAI_API_KEY")
            ?? cfg["OpenAI:ApiKey"]
            ?? throw new InvalidOperationException("OpenAI API key not configured. Set OPENAI_API_KEY or OpenAI:ApiKey.");

            _model = cfg["OpenAI:Model"] ?? "gpt-4o-mini";
        }

        public Task<string> AskAsync(string prompt, CancellationToken ct = default)
        => CompleteAsync("You are a helpful assistant.", prompt, ct);

        public async Task<string> CompleteAsync(string systemPrompt, string userPrompt, CancellationToken ct = default)
        {
            if (string.IsNullOrWhiteSpace(systemPrompt)) systemPrompt = "You are a helpful assistant.";
            if (string.IsNullOrWhiteSpace(userPrompt)) throw new ArgumentException("userPrompt cannot be empty.", nameof(userPrompt));

            var body = new
            {
                model = _model,
                messages = new object[]
            {
new { role = "system", content = systemPrompt },
new { role = "user", content = userPrompt }
            },
                temperature = 0.2
            };

            using var req = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
            req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", _apiKey);
            req.Content = new StringContent(JsonSerializer.Serialize(body, _json), Encoding.UTF8, "application/json");

            using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
            cts.CancelAfter(TimeSpan.FromSeconds(30)); // keep snappy in dev

            using var res = await _http.SendAsync(req, cts.Token);
            res.EnsureSuccessStatusCode();

            using var stream = await res.Content.ReadAsStreamAsync(cts.Token);
            using var doc = await JsonDocument.ParseAsync(stream, cancellationToken: cts.Token);

            // choices[0].message.content
            return doc.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString()
            ?? string.Empty;
        }
    }
}
