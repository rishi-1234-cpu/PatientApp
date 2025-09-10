using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

// If your DbContext is under this namespace (from your screenshots):
using PatientApi.Data;
// If instead it's PatientPortal.Api.Data, swap the using above.

namespace PatientPortal.Api.Controllers
{
    [ApiController]
    [Route("api/admin/stats")]
    public class AdminStatsController : ControllerBase
    {
        private readonly AppDbContext _db;
        public AdminStatsController(AppDbContext db) => _db = db;

        // 1) Total patient count
        [HttpGet("total-patients")]
        public async Task<IActionResult> TotalPatients()
        {
            var total = await _db.Patients.CountAsync();
            return Ok(new { total });
        }

        // 2) Admissions by date range (daily counts, zero-filled)
        [HttpGet("admissions")]
        public async Task<IActionResult> Admissions([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            var end = (to ?? DateTime.UtcNow.Date.AddDays(1)).Date; // exclusive
            var start = (from ?? end.AddDays(-30)).Date; // inclusive

            var days = await _db.Admissions
            .AsNoTracking()
            .Where(a => a.AdmissionDate >= start && a.AdmissionDate < end)
            .Select(a => new { Day = a.AdmissionDate.Date })
            .GroupBy(x => x.Day)
            .Select(g => new { date = g.Key, count = g.Count() })
            .OrderBy(x => x.date)
            .ToListAsync();

            var totalDays = (end - start).Days;
            var filled = Enumerable.Range(0, totalDays)
            .Select(i => start.AddDays(i))
            .GroupJoin(days, d => d, x => x.date,
            (d, g) => new { date = d, count = g.Select(v => v.count).FirstOrDefault() })
            .ToList();

            return Ok(new { range = new { from = start, to = end }, items = filled });
        }

        // 3) Vitals daily averages (optionally filter by patientId; default last 14 days)
        [HttpGet("vitals-trend")]
        public async Task<IActionResult> VitalsTrend([FromQuery] int patientId = 0, [FromQuery] int days = 14)
        {
            var start = DateTime.UtcNow.Date.AddDays(-Math.Max(1, days) + 1);
            var q = _db.Vitals.AsNoTracking().Where(v => v.TakenAt >= start);
            if (patientId > 0) q = q.Where(v => v.PatientId == patientId);

            var vitals = await q
            .Select(v => new
            {
                Day = v.TakenAt.Date,
                v.Pulse,
                v.Systolic,
                v.Diastolic,
                v.Temperature,
                v.SpO2
            })
            .ToListAsync();

            var items = vitals
            .GroupBy(v => v.Day)
            .OrderBy(g => g.Key)
            .Select(g => new
            {
                date = g.Key,
                avgPulse = g.Average(x => (double?)x.Pulse),
                avgSys = g.Average(x => (double?)x.Systolic),
                avgDia = g.Average(x => (double?)x.Diastolic),
                avgTemp = g.Average(x => (double?)x.Temperature),
                avgSpO2 = g.Average(x => (double?)x.SpO2)
            })
            .ToList();

            return Ok(new { from = start, to = DateTime.UtcNow.Date, items });
        }

        // 4) Discharge and billing statistics (daily)
        [HttpGet("discharge-billing")]
        public async Task<IActionResult> DischargeBilling([FromQuery] DateTime? from, [FromQuery] DateTime? to)
        {
            var end = (to ?? DateTime.UtcNow.Date.AddDays(1)).Date; // exclusive
            var start = (from ?? end.AddDays(-30)).Date; // inclusive

            // Discharges per day
            var discharges = await _db.Admissions.AsNoTracking()
            .Where(a => a.DischargeDate != null && a.DischargeDate >= start && a.DischargeDate < end)
            .Select(a => new { Day = a.DischargeDate!.Value.Date })
            .GroupBy(x => x.Day)
            .Select(g => new { date = g.Key, count = g.Count() })
            .OrderBy(x => x.date)
            .ToListAsync();

            // Billing per day (uses BilledAt + Status)
            var billing = await _db.Billings.AsNoTracking()
            .Where(b => b.BilledAt >= start && b.BilledAt < end)
            .Select(b => new { Day = b.BilledAt.Date, b.Status, b.TotalAmount })
            .GroupBy(x => x.Day)
            .Select(g => new
            {
                date = g.Key,
                totalAmount = g.Sum(x => x.TotalAmount),
                paid = g.Where(x => x.Status == "Paid").Sum(x => x.TotalAmount),
                pending = g.Where(x => x.Status == "Pending").Sum(x => x.TotalAmount),
                cancelled = g.Where(x => x.Status == "Cancelled").Sum(x => x.TotalAmount)
            })
            .OrderBy(x => x.date)
            .ToListAsync();

            return Ok(new { range = new { from = start, to = end }, discharges, billing });
        }
    }
}