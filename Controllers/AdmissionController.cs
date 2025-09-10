using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PatientApi.Data;
using PatientApi.Model;


namespace PatientApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class AdmissionsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public AdmissionsController(AppDbContext db) => _db = db;

        // GET: api/Admissions
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Admission>>> GetAll()
        {
            var items = await _db.Admissions
            .Include(a => a.Patient) // basic patient info for list views
            .OrderByDescending(a => a.AdmissionDate)
            .ToListAsync();

            return Ok(items);
        }

        // GET: api/Admissions/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<Admission>> GetOne(int id)
        {
            var item = await _db.Admissions
            .Include(a => a.Patient)
            .FirstOrDefaultAsync(a => a.Id == id);

            return item is null ? NotFound() : Ok(item);
        }

        // GET: api/Admissions/byPatient/7
        [HttpGet("byPatient/{patientId:int}")]
        public async Task<ActionResult<IEnumerable<Admission>>> GetByPatient(int patientId)
        {
            var items = await _db.Admissions
            .Where(a => a.PatientId == patientId)
            .OrderByDescending(a => a.AdmissionDate)
            .ToListAsync();

            return Ok(items);
        }

        // POST: api/Admissions
        [HttpPost]
        public async Task<ActionResult<Admission>> Create([FromBody] Admission dto)
        {
            // Basic FK check: ensure Patient exists
            var exists = await _db.Patients.AnyAsync(p => p.Id == dto.PatientId);
            if (!exists) return BadRequest($"Patient {dto.PatientId} not found.");

            _db.Admissions.Add(dto);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetOne), new { id = dto.Id }, dto);
        }

        // PUT: api/Admissions/5
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] Admission dto)
        {
            if (id != dto.Id) return BadRequest("ID mismatch.");

            var entity = await _db.Admissions.FindAsync(id);
            if (entity is null) return NotFound();

            // Update fields explicitly
            entity.PatientId = dto.PatientId;
            entity.AdmissionDate = dto.AdmissionDate;
            entity.DischargeDate = dto.DischargeDate;
            entity.Reason = dto.Reason;
            entity.Ward = dto.Ward;
            entity.BedNumber = dto.BedNumber;
            entity.DoctorName = dto.DoctorName;
            entity.Notes = dto.Notes;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/Admissions/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _db.Admissions.FindAsync(id);
            if (entity is null) return NotFound();

            _db.Admissions.Remove(entity);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}