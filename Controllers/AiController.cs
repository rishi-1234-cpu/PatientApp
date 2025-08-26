using Microsoft.AspNetCore.Mvc;
using PatientApi.Services;

namespace PatientApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AiController : ControllerBase
    {
        private readonly IOpenAIChatService _ai;
        public AiController(IOpenAIChatService ai) => _ai = ai;

        public record AskRequest(string Prompt);

        [HttpPost("ask")]
        public async Task<IActionResult> Ask([FromBody] AskRequest req, CancellationToken ct)
        {
            if (string.IsNullOrWhiteSpace(req.Prompt)) return BadRequest("Prompt is required.");
            var reply = await _ai.AskAsync(req.Prompt, ct);
            return Ok(new { reply });
        }
    }
}