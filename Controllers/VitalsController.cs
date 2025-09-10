using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PatientApi.Data;
using PatientApi.Model;


namespace PatientApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VitalsController : ControllerBase
{
    private readonly AppDbContext _db;
    public VitalsController(AppDbContext db) => _db = db;

    // GET: api/vitals
    [HttpGet]
    public async Task<ActionResult<IEnumerable<Vital>>> GetAll()
    {
        var items = await _db.Vitals
        .OrderByDescending(v => v.TakenAt)
        .ToListAsync();

        return Ok(items);
    }

    // GET: api/vitals/10
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Vital>> GetOne(int id)
    {
        var item = await _db.Vitals.FindAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    // GET: api/vitals/byPatient/7
    [HttpGet("byPatient/{patientId:int}")]
    public async Task<ActionResult<IEnumerable<Vital>>> GetByPatient(int patientId)
    {
        var items = await _db.Vitals
        .Where(v => v.PatientId == patientId)
        .OrderByDescending(v => v.TakenAt)
        .ToListAsync();

        return Ok(items);
    }

    // POST: api/vitals
    [HttpPost]
    public async Task<ActionResult<Vital>> Create(Vital dto)
    {
        var exists = await _db.Patients.AnyAsync(p => p.Id == dto.PatientId);
        if (!exists) return BadRequest($"Patient {dto.PatientId} not found.");

        // If client didn’t send time, default stays from model
        _db.Vitals.Add(dto);
        await _db.SaveChangesAsync();

        return CreatedAtAction(nameof(GetOne), new { id = dto.Id }, dto);
    }

    // PUT: api/vitals/10
    [HttpPut("{id:int}")]
    public async Task<IActionResult> Update(int id, Vital dto)
    {
        if (id != dto.Id) return BadRequest("ID mismatch.");

        var entity = await _db.Vitals.FindAsync(id);
        if (entity is null) return NotFound();

        entity.PatientId = dto.PatientId;
        entity.TakenAt = dto.TakenAt;
        entity.Temperature = dto.Temperature;
        entity.Pulse = dto.Pulse;
        entity.RespRate = dto.RespRate;
        entity.Systolic = dto.Systolic;
        entity.Diastolic = dto.Diastolic;
        entity.SpO2 = dto.SpO2;
        entity.Notes = dto.Notes;

        await _db.SaveChangesAsync();
        return NoContent();
    }

    // DELETE: api/vitals/10
    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var entity = await _db.Vitals.FindAsync(id);
        if (entity is null) return NotFound();

        _db.Vitals.Remove(entity);
        await _db.SaveChangesAsync();
        return NoContent();
    }
}