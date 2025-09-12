using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PatientApi.Data;
using PatientApi.Services;

namespace PatientApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Produces("application/json")]
    public class AiController : ControllerBase
    {
        private readonly IOpenAIChatService _ai;
        private readonly AppDbContext _db;

        public AiController(IOpenAIChatService ai, AppDbContext db)
        {
            _ai = ai;
            _db = db;
        }

        // =========================
        // DTOs
        // =========================
        public sealed class PatientSummaryRequest
        {
            // Option A: manual case text
            public string? Notes { get; set; }

            // Option B: pull clinical context by id (PHI suppressed)
            public int? PatientId { get; set; }

            // Optional hints (manual overrides)
            public int? Age { get; set; }
            public double? TemperatureC { get; set; }
            public string? Duration { get; set; }
            public string? MedicationsTried { get; set; }
            public bool? DischargedStable { get; set; }
        }

        // =========================
        // 1) Generic Ask (existing)
        // =========================
        public record AskRequest([Required] string Prompt);

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

        // =========================
        // 2) PHI-safe AI Summary ✅
        // =========================
        /// <summary>
        /// Produces a concise (3–5 bullets) clinical-style summary.
        /// Accepts either manual Notes or PatientId (DB-hydrated: demographics + latest vitals). PHI is not sent to AI.
        /// </summary>
        [HttpPost("summary")]
        [Consumes("application/json")]
        public async Task<IActionResult> Summary([FromBody] PatientSummaryRequest req, CancellationToken ct)
        {
            if (req == null || (string.IsNullOrWhiteSpace(req.Notes) && req.PatientId is null))
                return BadRequest("Provide either Notes or PatientId.");

            var lines = new List<string>();

            // A) Manual notes path
            if (!string.IsNullOrWhiteSpace(req.Notes))
                lines.Add($"Notes: {req.Notes}");

            // B) DB hydration path (PHI-safe)
            if (req.PatientId is int pid)
            {
                var hydrated = await BuildClinicalContextAsync(pid, ct);
                if (hydrated == null)
                    return NotFound($"Patient {pid} not found.");

                if (hydrated.Age is not null) lines.Add($"Age: {hydrated.Age}");
                if (!string.IsNullOrWhiteSpace(hydrated.Gender)) lines.Add($"Gender: {hydrated.Gender}");
                lines.Add("Context: hydrated from EHR (PHI suppressed)");

                if (hydrated.Vitals?.Any() == true)
                {
                    foreach (var v in hydrated.Vitals)
                    {
                        lines.Add(
                        $"Vital @ {v.TakenAt:yyyy-MM-dd HH:mm}: " +
                        $"TempC {(v.Temperature is null ? "-" : v.Temperature.Value.ToString("0.0"))}, " +
                        $"Pulse {(v.Pulse?.ToString() ?? "-")}, " +
                        $"RR {(v.RespRate?.ToString() ?? "-")}, " +
                        $"BP {((v.Systolic.HasValue && v.Diastolic.HasValue) ? $"{v.Systolic}/{v.Diastolic}" : "-")}, " +
                        $"SpO2 {(v.SpO2?.ToString() ?? "-")}"
                        );
                    }
                }

                // ---- Optional: Admission / Discharge notes (uncomment & adjust property names if available) ----
                // if (!string.IsNullOrWhiteSpace(hydrated.LastAdmissionNote))
                // lines.Add($"AdmissionNote: {hydrated.LastAdmissionNote}");
                //
                // if (!string.IsNullOrWhiteSpace(hydrated.LastDischargeNote))
                // lines.Add($"DischargeNote: {hydrated.LastDischargeNote}");
            }

            // Optional manual overrides from the request
            if (req.Age is not null) lines.Add($"Age: {req.Age}");
            if (req.TemperatureC is not null) lines.Add($"TempC: {req.TemperatureC}");
            if (!string.IsNullOrWhiteSpace(req.Duration)) lines.Add($"Duration: {req.Duration}");
            if (!string.IsNullOrWhiteSpace(req.MedicationsTried)) lines.Add($"MedsTried: {req.MedicationsTried}");
            if (req.DischargedStable is not null) lines.Add($"DischargedStable: {req.DischargedStable}");

            var clinicalContext = string.Join("\n", lines);

            var systemPrompt =
            "You are a clinical summarizer. Produce a concise, factual patient summary in 3–5 bullet points. " +
            "Avoid diagnosis; focus on findings, course, response, and current status. " +
            "Keep under 80 words. No extra commentary or disclaimers.";

            var userPrompt = $"Summarize the following case:\n---\n{clinicalContext}\n---";

            var summary = await _ai.CompleteAsync(systemPrompt, userPrompt, ct);
            return Ok(new { summary, traceId = HttpContext.TraceIdentifier });
        }

        // =========================
        // 3) Treatment Suggestion
        // =========================
        // Renamed to avoid clash with Model/TreatmentSuggestRequest.cs (which you can keep using elsewhere)
        public record TreatmentSuggestPayload(
        int? PatientId,
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

        [HttpPost("treatment-suggest")]
        [Consumes("application/json")]
        public async Task<IActionResult> TreatmentSuggest([FromBody] TreatmentSuggestPayload req, CancellationToken ct)
        {
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
            var context = new
            {
                req.PatientId,
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
            System.Text.Json.JsonSerializer.Serialize(
            context,
            new System.Text.Json.JsonSerializerOptions { PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase });

            var raw = await _ai.CompleteAsync(systemPrompt, userPrompt, ct);
            var looksJson = raw.TrimStart().StartsWith("{") || raw.TrimStart().StartsWith("[");
            if (looksJson) return Content(raw, "application/json");
            return Ok(new { result = raw });
        }

        // =========================
        // Helpers
        // =========================
        private sealed class HydratedContext
        {
            public int? Age { get; init; }
            public string? Gender { get; init; }
            public List<VitalRow>? Vitals { get; init; }
            public string? LastAdmissionNote { get; init; } // optional (not yet populated)
            public string? LastDischargeNote { get; init; } // optional (not yet populated)
        }

        private sealed class VitalRow
        {
            public DateTime TakenAt { get; init; }
            public double? Temperature { get; init; }
            public int? Pulse { get; init; }
            public int? RespRate { get; init; }
            public int? Systolic { get; init; }
            public int? Diastolic { get; init; }
            public int? SpO2 { get; init; }
        }

        private async Task<HydratedContext?> BuildClinicalContextAsync(int patientId, CancellationToken ct)
        {
            // Patient (only demographics to compute Age/Gender; no PII to AI)
            var p = await _db.Patients.AsNoTracking()
            .Where(x => x.Id == patientId)
            .Select(x => new { x.DateOfBirth, x.Gender })
            .FirstOrDefaultAsync(ct);

            if (p == null) return null;

            int? age = null;
            if (p.DateOfBirth != default)
            {
                var today = DateTime.UtcNow.Date;
                var dob = p.DateOfBirth.Date;
                var a = today.Year - dob.Year;
                if (dob > today.AddYears(-a)) a--;
                age = a;
            }

            // Latest vitals (most recent 3) ← uses TakenAt & Temperature
            var vitals = await _db.Vitals.AsNoTracking()
            .Where(v => v.PatientId == patientId)
            .OrderByDescending(v => v.TakenAt)
            .Take(3)
            .Select(v => new VitalRow
            {
                TakenAt = v.TakenAt,
                Temperature = v.Temperature,
                Pulse = v.Pulse,
                RespRate = v.RespRate,
                Systolic = v.Systolic,
                Diastolic = v.Diastolic,
                SpO2 = v.SpO2
            })
            .ToListAsync(ct);

            // ---- Optional: Admission / Discharge (uncomment + adjust names if available) ----
            // var lastAdmissionNote = await _db.Admissions.AsNoTracking()
            // .Where(a => a.PatientId == patientId)
            // .OrderByDescending(a => a.CreatedAt) // or AdmittedAt
            // .Select(a => a.Notes) // adjust property name
            // .FirstOrDefaultAsync(ct);
            //
            // var lastDischargeNote = await _db.Discharges.AsNoTracking()
            // .Where(d => d.PatientId == patientId)
            // .OrderByDescending(d => d.CreatedAt) // or DischargedAt
            // .Select(d => d.Summary) // or d.Notes
            // .FirstOrDefaultAsync(ct);

            return new HydratedContext
            {
                Age = age,
                Gender = p.Gender,
                Vitals = vitals,
                // LastAdmissionNote = lastAdmissionNote,
                // LastDischargeNote = lastDischargeNote
            };
        }
    }
}
