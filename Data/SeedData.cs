using Microsoft.EntityFrameworkCore;
using PatientApi.Model;

namespace PatientApi.Data
{
    public static class SeedData
    {
        public static void EnsureSeeded(AppDbContext db)
        {
            // Create DB if needed (migrations are handled in Program.cs)
            db.Database.EnsureCreated();

            // ---- PATIENT ----
            Patient patient;
            if (!db.Patients.Any())
            {
                patient = new Patient
                {
                    Name = "Rishi Demo",
                    Email = "rishi@example.com",
                    Phone = "+91-8089765456",
                    Gender = "Male",
                    Address = "101 Demo Street",
                    DateOfBirth = new DateTime(1990, 5, 12),
                    Notes = "Demo patient created by seed."
                };
                db.Patients.Add(patient);
                db.SaveChanges();
            }
            else
            {
                // Pick the first for demo linkage
                patient = db.Patients.First();
            }

            // ---- ADMISSION ----
            Admission admission;
            if (!db.Admissions.Any())
            {
                admission = new Admission
                {
                    PatientId = patient.Id,
                    AdmissionDate = DateTime.UtcNow.AddDays(-2),
                    Reason = "Fever and cough",
                    Ward = "General",
                    BedNumber = "G-12",
                    DoctorName = "Dr. Carter",
                    Notes = "Initial observation."
                };
                db.Admissions.Add(admission);
                db.SaveChanges();
            }
            else
            {
                admission = db.Admissions.Include(a => a.Patient)
                .OrderByDescending(a => a.Id)
                .First();
            }

            // ---- VITALS ----
            if (!db.Vitals.Any())
            {
                var now = DateTime.UtcNow;
                db.Vitals.AddRange(new[]
                {
new Vital
{
PatientId = patient.Id,
RecordedAt = now.AddHours(-30),
TemperatureC = 38.2m,
Pulse = 96,
RespRate = 18,
Systolic = 122,
Diastolic = 78,
SpO2 = 97,
Notes = "Admitted with fever."
},
new Vital
{
PatientId = patient.Id,
RecordedAt = now.AddHours(-4),
TemperatureC = 37.3m,
Pulse = 88,
RespRate = 17,
Systolic = 120,
Diastolic = 76,
SpO2 = 98,
Notes = "Improving on meds."
}
});
                db.SaveChanges();
            }

            // ---- BILLING ----
            if (!db.Billings.Any())
            {
                db.Billings.Add(new Billing
                {
                    PatientId = patient.Id,
                    AdmissionId = admission.Id,
                    Amount = 650.00m,
                    Status = "Open",
                    Notes = "Bed, diagnostics, and lab tests."
                });
                db.SaveChanges();
            }

            // ---- DISCHARGE ----
            if (!db.Discharges.Any())
            {
                db.Discharges.Add(new Discharge
                {
                    PatientId = patient.Id,
                    AdmissionId = admission.Id,
                    DischargeDate = DateTime.UtcNow.AddHours(-1),
                    Summary = "Diagnosed with viral fever; stable.",
                    Instructions = "Hydration, rest, paracetamol as needed.",
                    FollowUp = "OPD follow-up in 3 days",
                    OutstandingAmount = 120.00m
                });
                db.SaveChanges();
            }

            // ---- CHAT MESSAGE (lobby) ----
            if (!db.ChatMessages.Any())
            {
                db.ChatMessages.Add(new ChatMessage
                {
                    Room = "lobby",
                    Sender = "staff:alice",
                    Text = "Welcome to the IPD chat lobby 👋",
                    SentAt = DateTime.UtcNow
                });
                db.SaveChanges();
            }
        }
    }
}