using System.Threading;
using System.Threading.Tasks;

namespace PatientApi.Services
{
    public interface IOpenAIChatService
    {
        Task<string> AskAsync(string prompt, CancellationToken ct = default);
    }
}
