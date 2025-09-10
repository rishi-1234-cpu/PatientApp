using Microsoft.AspNetCore.SignalR;
using PatientApi.Data; // your AppDbContext namespace
using PatientApi.Model; // ChatMessage model
using Microsoft.EntityFrameworkCore;
using System.Threading.Tasks;

namespace PatientApi.Hubs;

public class ChatHub : Hub
{
    private readonly AppDbContext _db;

    public ChatHub(AppDbContext db) => _db = db;

    // ---- optional API key guard as an extra safety net for WebSockets ----
    public override async Task OnConnectedAsync()
    {
        var http = Context.GetHttpContext();
        var headerKey = http?.Request.Headers["x-api-key"].ToString();
        var qsKey = http?.Request.Query["access_token"].ToString(); // SignalR puts token here for WS
        var cfgKey = http?.RequestServices
        .GetRequiredService<IConfiguration>()["ApiSettings:ApiKey"];

        if (string.IsNullOrWhiteSpace(cfgKey) ||
        (!string.Equals(headerKey, cfgKey, StringComparison.Ordinal) &&
        !string.Equals(qsKey, cfgKey, StringComparison.Ordinal)))
        {
            Context.Abort();
            return;
        }

        await base.OnConnectedAsync();
    }

    // Join/leave “rooms” (e.g., "patient-42")
    public Task JoinRoom(string room) => Groups.AddToGroupAsync(Context.ConnectionId, room);
    public Task LeaveRoom(string room) => Groups.RemoveFromGroupAsync(Context.ConnectionId, room);

    // Send a message to a room and persist it
    public async Task SendMessage(string room, string sender, string text, int? patientId = null)
    {
        // save to DB
        var entity = new ChatMessage
        {
            Room = string.IsNullOrWhiteSpace(room) ? "lobby" : room,
            Sender = sender ?? "",
            Text = text ?? "",
            PatientId = patientId,
            SentAt = DateTime.UtcNow
        };
        _db.ChatMessages.Add(entity);
        await _db.SaveChangesAsync();

        // broadcast payload (what the UI will render)
        var payload = new
        {
            id = entity.Id,
            room = entity.Room,
            sender = entity.Sender,
            text = entity.Text,
            sentAt = entity.SentAt,
            patientId = entity.PatientId
        };

        await Clients.Group(entity.Room).SendAsync("newMessage", payload);
    }

    // Optional: let clients fetch recent history after joining
    public async Task<List<object>> GetRecent(string room, int take = 50)
    {
        room = string.IsNullOrWhiteSpace(room) ? "lobby" : room;

        var rows = await _db.ChatMessages
        .Where(m => m.Room == room)
        .OrderByDescending(m => m.SentAt)
        .Take(Math.Clamp(take, 1, 200))
        .OrderBy(m => m.SentAt)
        .Select(m => new {
            id = m.Id,
            room = m.Room,
            sender = m.Sender,
            text = m.Text,
            sentAt = m.SentAt,
            patientId = m.PatientId
        })
        .ToListAsync();

        return rows.Cast<object>().ToList();
    }
}