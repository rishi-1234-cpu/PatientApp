using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using PatientApi.Data; // AppDbContext
using PatientApi.Model; // ChatMessage model
using PatientApi.Hubs; // ChatHub

namespace PatientApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ChatController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IHubContext<ChatHub> _hub;

    public ChatController(AppDbContext db, IHubContext<ChatHub> hub)
    {
        _db = db;
        _hub = hub;
    }

    // GET: api/Chat?room=lobby&take=50
    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetRecent(
    [FromQuery] string? room = "lobby",
    [FromQuery] int take = 50)
    {
        room ??= "lobby";
        take = Math.Clamp(take, 1, 200);

        var rows = await _db.ChatMessages
        .Where(m => m.Room == room)
        .OrderByDescending(m => m.SentAt)
        .Take(take)
        .OrderBy(m => m.SentAt)
        .Select(m => new
        {
            id = m.Id,
            room = m.Room,
            sender = m.Sender,
            text = m.Text,
            sentAt = m.SentAt,
            patientId = m.PatientId
        })
        .ToListAsync();

        return Ok(rows);
    }

    // GET: api/Chat/byPatient/2?take=100
    [HttpGet("byPatient/{patientId:int}")]
    public async Task<ActionResult<IEnumerable<object>>> GetByPatient(
    int patientId, [FromQuery] int take = 100)
    {
        take = Math.Clamp(take, 1, 500);

        var rows = await _db.ChatMessages
        .Where(m => m.PatientId == patientId)
        .OrderByDescending(m => m.SentAt)
        .Take(take)
        .OrderBy(m => m.SentAt)
        .Select(m => new
        {
            id = m.Id,
            room = m.Room,
            sender = m.Sender,
            text = m.Text,
            sentAt = m.SentAt,
            patientId = m.PatientId
        })
        .ToListAsync();

        return Ok(rows);
    }

    // POST: api/Chat
    // body: { "room":"patient-2", "sender":"staff:alice", "text":"Hello!", "patientId":2 }
    [HttpPost]
    public async Task<ActionResult<object>> Create([FromBody] ChatCreateDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Text))
            return BadRequest("Message text is required.");

        var room = string.IsNullOrWhiteSpace(dto.Room) ? "lobby" : dto.Room.Trim();

        var entity = new ChatMessage
        {
            Room = room,
            Sender = dto.Sender?.Trim() ?? "",
            Text = dto.Text.Trim(),
            PatientId = dto.PatientId,
            SentAt = DateTime.UtcNow
        };

        _db.ChatMessages.Add(entity);
        await _db.SaveChangesAsync();

        var payload = new
        {
            id = entity.Id,
            room = entity.Room,
            sender = entity.Sender,
            text = entity.Text,
            sentAt = entity.SentAt,
            patientId = entity.PatientId
        };

        // Broadcast to connected clients in this room
        await _hub.Clients.Group(room).SendAsync("newMessage", payload);

        return CreatedAtAction(nameof(GetOne), new { id = entity.Id }, payload);
    }

    // GET: api/Chat/5
    [HttpGet("{id:int}")]
    public async Task<ActionResult<object>> GetOne(int id)
    {
        var m = await _db.ChatMessages.FindAsync(id);
        if (m == null) return NotFound();

        return Ok(new
        {
            id = m.Id,
            room = m.Room,
            sender = m.Sender,
            text = m.Text,
            sentAt = m.SentAt,
            patientId = m.PatientId
        });
    }

    // DELETE: api/Chat/5
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var m = await _db.ChatMessages.FindAsync(id);
        if (m == null) return NotFound();

        _db.ChatMessages.Remove(m);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    // Small DTO for POST
    public class ChatCreateDto
    {
        public string? Room { get; set; }
        public string? Sender { get; set; }
        public string Text { get; set; } = "";
        public int? PatientId { get; set; }
    }
}