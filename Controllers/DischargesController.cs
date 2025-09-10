using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PatientApi.Model;
using PatientApi.Data;

namespace PatientApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class DischargesController : ControllerBase
    {
        private readonly AppDbContext _db;
        public DischargesController(AppDbContext db) => _db = db;

        // GET: api/Discharges
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Discharge>>> GetAll()
        {
            var items = await _db.Discharges
            .Include(d => d.Patient)
            .Include(d => d.Admission)
            .OrderByDescending(d => d.DischargeDate)
            .ToListAsync();

            return Ok(items);
        }

        // GET: api/Discharges/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<Discharge>> GetOne(int id)
        {
            var item = await _db.Discharges
            .Include(d => d.Patient)
            .Include(d => d.Admission)
            .FirstOrDefaultAsync(d => d.Id == id);

            return item is null ? NotFound() : Ok(item);
        }

        // GET: api/Discharges/byPatient/7
        [HttpGet("byPatient/{patientId:int}")]
        public async Task<ActionResult<IEnumerable<Discharge>>> GetByPatient(int patientId)
        {
            var items = await _db.Discharges
            .Where(d => d.PatientId == patientId)
            .OrderByDescending(d => d.DischargeDate)
            .ToListAsync();

            return Ok(items);
        }

        // GET: api/Discharges/byAdmission/10
        [HttpGet("byAdmission/{admissionId:int}")]
        public async Task<ActionResult<Discharge?>> GetByAdmission(int admissionId)
        {
            var item = await _db.Discharges
            .FirstOrDefaultAsync(d => d.AdmissionId == admissionId);

            return item is null ? NotFound() : Ok(item);
        }

        // POST: api/Discharges
        [HttpPost]
        public async Task<ActionResult<Discharge>> Create([FromBody] Discharge dto)
        {
            // FK checks
            var patientExists = await _db.Patients.AnyAsync(p => p.Id == dto.PatientId);
            if (!patientExists) return BadRequest($"Patient {dto.PatientId} not found.");

            var admission = await _db.Admissions.FirstOrDefaultAsync(a => a.Id == dto.AdmissionId);
            if (admission is null) return BadRequest($"Admission {dto.AdmissionId} not found.");

            if (admission.PatientId != dto.PatientId)
                return BadRequest("Admission.PatientId does not match Discharge.PatientId.");

            // One discharge per admission
            var already = await _db.Discharges.AnyAsync(d => d.AdmissionId == dto.AdmissionId);
            if (already) return BadRequest("A discharge already exists for this admission.");

            _db.Discharges.Add(dto);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetOne), new { id = dto.Id }, dto);
        }

        // PUT: api/Discharges/5
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] Discharge dto)
        {
            if (id != dto.Id) return BadRequest("ID mismatch.");

            var entity = await _db.Discharges.FindAsync(id);
            if (entity is null) return NotFound();

            // optional re-checks (keep simple)
            entity.PatientId = dto.PatientId;
            entity.AdmissionId = dto.AdmissionId;
            entity.DischargeDate = dto.DischargeDate;
            entity.Summary = dto.Summary;
            entity.Instructions = dto.Instructions;
            entity.FollowUp = dto.FollowUp;
            entity.OutstandingAmount = dto.OutstandingAmount;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/Discharges/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _db.Discharges.FindAsync(id);
            if (entity is null) return NotFound();

            _db.Discharges.Remove(entity);
            await _db.SaveChangesAsync();
            return NoContent();
        }
    }
}