using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using PatientApi.Services;

namespace PatientApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class AiController : ControllerBase
    {
        private readonly IOpenAIChatService _ai;
        public AiController(IOpenAIChatService ai) => _ai = ai;

        // ---------- 1) Generic Ask ----------
        public record AskRequest([Required] string Prompt);

        /// <summary>Generic AI ask endpoint (non-medical specific).</summary>
        [HttpPost("ask")]
        [Consumes("application/json")]
        public async Task<IActionResult> Ask([FromBody] AskRequest req, CancellationToken ct)
        {
            if (!ModelState.IsValid || string.IsNullOrWhiteSpace(req.Prompt))
                return BadRequest("Prompt is required.");

            var reply = await _ai.CompleteAsync(
            systemPrompt: "You are a helpful assistant. Be concise and factual.",
            userPrompt: req.Prompt,
            ct
            );

            return Ok(new { reply });
        }

        // ---------- 2) Treatment Suggestion (de-identified) ----------

        public record TreatmentSuggestRequest(
        int? PatientId, // optional – NOT used for PII, just for app correlation
        string? Diagnosis,
        IEnumerable<string>? Symptoms,
        double? TempC,
        int? Pulse,
        int? RespRate,
        int? Systolic,
        int? Diastolic,
        int? SpO2,
        IEnumerable<string>? Allergies,
        IEnumerable<string>? Medications,
        string? Notes
        );

        /// <summary>
        /// Returns PHI-safe treatment suggestions in structured JSON.
        /// Sends only clinical context (no name/DOB/phone/address).
        /// </summary>
        [HttpPost("treatment-suggest")]
        [Consumes("application/json")]
        public async Task<IActionResult> TreatmentSuggest(
        [FromBody] TreatmentSuggestRequest req,
        CancellationToken ct)
        {
            // System prompt: safety + schema
            var systemPrompt =
            @"You are a clinical decision-support assistant. Do NOT provide a diagnosis.
Offer conservative, educational suggestions ONLY, and include red-flag warnings.
Always recommend consulting a licensed clinician.

Return STRICT JSON matching this schema:
{
""triageLevel"": ""low|moderate|urgent"",
""redFlags"": [""string""],
""recommendedTests"": [""string""],
""initialManagement"": [""string""],
""medicationOptions"": [
{ ""name"": ""string"", ""class"": ""string"", ""typicalDose"": ""string"", ""notes"": ""string"" }
],
""followUp"": ""string"",
""disclaimer"": ""string""
}";

            // Build PHI-safe clinical context (no identity fields)
            var context = new
            {
                req.PatientId, // only for your own correlation; not identity
                req.Diagnosis,
                Symptoms = req.Symptoms ?? Array.Empty<string>(),
                Vitals = new
                {
                    TempC = req.TempC,
                    Pulse = req.Pulse,
                    RespRate = req.RespRate,
                    BP = new { Systolic = req.Systolic, Diastolic = req.Diastolic },
                    SpO2 = req.SpO2
                },
                Allergies = req.Allergies ?? Array.Empty<string>(),
                Medications = req.Medications ?? Array.Empty<string>(),
                Notes = req.Notes
            };

            var userPrompt =
            "Provide suggestions for the following de-identified clinical context. " +
            "Respond ONLY with JSON matching the schema.\n\n" +
            System.Text.Json.JsonSerializer.Serialize(context,
            new System.Text.Json.JsonSerializerOptions { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase });

            var raw = await _ai.CompleteAsync(systemPrompt, userPrompt, ct);

            // If the model returns JSON, pass it through as application/json; else wrap it.
            var looksJson = raw.TrimStart().StartsWith("{") || raw.TrimStart().StartsWith("[");
            if (looksJson)
                return Content(raw, "application/json");

            // Fallback (rare): wrap as text so frontend still sees something
            return Ok(new { result = raw });
        }
    }
}
