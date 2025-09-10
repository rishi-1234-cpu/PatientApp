using System.Threading;
using System.Threading.Tasks;

namespace PatientApi.Services
{
    public interface IOpenAIChatService
    {
        // Legacy/simple single-prompt call (kept for compatibility)
        Task<string> AskAsync(string prompt, CancellationToken ct = default);

        // New dual-prompt call used by AiController
        Task<string> CompleteAsync(string systemPrompt, string userPrompt, CancellationToken ct = default);
    }
}
