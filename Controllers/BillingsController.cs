using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PatientApi.Model;
using PatientApi.Data;

namespace PatientApi.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BillingsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public BillingsController(AppDbContext db) => _db = db;

        // GET: api/Billings
        [HttpGet]
        public async Task<ActionResult<IEnumerable<Billing>>> GetAll()
        {
            var items = await _db.Billings
            .Include(b => b.Patient)
            .Include(b => b.Admission)
            .OrderByDescending(b => b.BilledAt)
            .ToListAsync();

            return Ok(items);
        }

        // GET: api/Billings/5
        [HttpGet("{id:int}")]
        public async Task<ActionResult<Billing>> GetOne(int id)
        {
            var item = await _db.Billings
            .Include(b => b.Patient)
            .Include(b => b.Admission)
            .FirstOrDefaultAsync(b => b.Id == id);

            return item is null ? NotFound() : Ok(item);
        }

        // GET: api/Billings/byPatient/7
        [HttpGet("byPatient/{patientId:int}")]
        public async Task<ActionResult<IEnumerable<Billing>>> GetByPatient(int patientId)
        {
            var items = await _db.Billings
            .Where(b => b.PatientId == patientId)
            .OrderByDescending(b => b.BilledAt)
            .ToListAsync();

            return Ok(items);
        }

        // GET: api/Billings/byAdmission/10
        [HttpGet("byAdmission/{admissionId:int}")]
        public async Task<ActionResult<IEnumerable<Billing>>> GetByAdmission(int admissionId)
        {
            var items = await _db.Billings
            .Where(b => b.AdmissionId == admissionId)
            .OrderByDescending(b => b.BilledAt)
            .ToListAsync();

            return Ok(items);
        }

        // POST: api/Billings
        [HttpPost]
        public async Task<ActionResult<Billing>> Create([FromBody] Billing dto)
        {
            // FK checks
            var patientExists = await _db.Patients.AnyAsync(p => p.Id == dto.PatientId);
            if (!patientExists) return BadRequest($"Patient {dto.PatientId} not found.");

            var admission = await _db.Admissions.FirstOrDefaultAsync(a => a.Id == dto.AdmissionId);
            if (admission is null) return BadRequest($"Admission {dto.AdmissionId} not found.");

            if (admission.PatientId != dto.PatientId)
                return BadRequest("Admission.PatientId does not match Billing.PatientId.");

            // Auto-calc total if not provided (or <= 0)
            dto.TotalAmount = CalcTotal(dto);

            _db.Billings.Add(dto);
            await _db.SaveChangesAsync();

            return CreatedAtAction(nameof(GetOne), new { id = dto.Id }, dto);
        }

        // PUT: api/Billings/5
        [HttpPut("{id:int}")]
        public async Task<IActionResult> Update(int id, [FromBody] Billing dto)
        {
            if (id != dto.Id) return BadRequest("ID mismatch.");

            var entity = await _db.Billings.FindAsync(id);
            if (entity is null) return NotFound();

            entity.PatientId = dto.PatientId;
            entity.AdmissionId = dto.AdmissionId;
            entity.BilledAt = dto.BilledAt;

            entity.RoomCharges = dto.RoomCharges;
            entity.TreatmentCharges = dto.TreatmentCharges;
            entity.MedicationCharges = dto.MedicationCharges;
            entity.OtherCharges = dto.OtherCharges;
            entity.Discount = dto.Discount;
            entity.Tax = dto.Tax;

            entity.TotalAmount = CalcTotal(dto);
            entity.Status = dto.Status;
            entity.Notes = dto.Notes;

            await _db.SaveChangesAsync();
            return NoContent();
        }

        // DELETE: api/Billings/5
        [HttpDelete("{id:int}")]
        public async Task<IActionResult> Delete(int id)
        {
            var entity = await _db.Billings.FindAsync(id);
            if (entity is null) return NotFound();

            _db.Billings.Remove(entity);
            await _db.SaveChangesAsync();
            return NoContent();
        }

        private static decimal CalcTotal(Billing b)
        {
            var subtotal = (b.RoomCharges)
            + (b.TreatmentCharges)
            + (b.MedicationCharges)
            + (b.OtherCharges);

            var afterDiscount = subtotal - (b.Discount);
            var total = afterDiscount + (b.Tax);
            return total < 0 ? 0 : total;
        }
    }
}
