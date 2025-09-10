using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PatientApi.Data;
using PatientApi.Model;
using PatientApi.Services;


namespace PatientApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PatientController : ControllerBase
    {
        private readonly AppDbContext _db;
        private readonly IOpenAIChatService _ai;

        public PatientController(AppDbContext db, IOpenAIChatService ai)
        {
            _db = db;
            _ai = ai;
        }

        // GET: api/Patient
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Patient>>> GetAll(CancellationToken ct)
        {
            var patients = await _db.Patients
            .OrderBy(p => p.Id)
            .ToListAsync(ct);

            return Ok(patients);
        }

        // GET: api/Patient/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<Patient>> GetById(int id, CancellationToken ct)
        {
            var patient = await _db.Patients.FindAsync(new object?[] { id }, ct);
            if (patient == null) return NotFound();
            return Ok(patient);
        }
      
        // POST: api/Patient
        [HttpPost]
        public async Task<ActionResult<Patient>> Create([FromBody] Patient patient, CancellationToken ct)
        {
            // let SQL Server handle Id identity, ignore any incoming Id
            patient.Id = 0;
            if (patient.CreatedAt == default) patient.CreatedAt = DateTime.UtcNow;

            _db.Patients.Add(patient);
            await _db.SaveChangesAsync(ct);

            return CreatedAtAction(nameof(GetById), new { id = patient.Id }, patient);
        }

        // PUT: api/Patient/5
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] Patient patient, CancellationToken ct)
        {
            if (id != patient.Id) return BadRequest("Route id and body id must match.");

            var existing = await _db.Patients.FindAsync(new object?[] { id }, ct);
            if (existing == null) return NotFound();

            existing.FirstName = patient.FirstName;
            existing.LastName = patient.LastName;
            existing.DateOfBirth = patient.DateOfBirth;
            existing.Gender = patient.Gender;
            existing.Phone = patient.Phone;
            existing.Email = patient.Email;
            // keep existing.CreatedAt as original

            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // DELETE: api/Patient/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            var existing = await _db.Patients.FindAsync(new object?[] { id }, ct);
            if (existing == null) return NotFound();

            _db.Patients.Remove(existing);
            await _db.SaveChangesAsync(ct);
            return NoContent();
        }

        // GET: api/Patient/5/summary -> uses OpenAI to summarize the patient
        [HttpGet("{id:int}/summary")]
        public async Task<IActionResult> GetSummary(int id, CancellationToken ct)
        {
            var p = await _db.Patients.AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == id, ct);
            if (p == null) return NotFound();

            // Build a short, safe prompt
            var prompt =
            $"Summarize this patient concisely for a clinician. " +
            $"Name: {p.FirstName} {p.LastName}. DOB: {p.DateOfBirth:yyyy-MM-dd}. " +
            $"Gender: {p.Gender}. Email: {p.Email}. Phone: {p.Phone}. " +
            $"Return 2–3 bullet points.";

            var reply = await _ai.AskAsync(prompt, ct);
            return Ok(new { id = p.Id, summary = reply });
        }
    }
}