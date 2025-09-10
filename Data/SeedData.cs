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

            // ===== PATIENT =====
            var demoEmail = "rishi@example.com";
            var patient = db.Patients.FirstOrDefault(p => p.Email == demoEmail);
            if (patient == null)
            {
                patient = new Patient
                {
                    Name = "Rishi Demo",
                    Email = demoEmail,
                    Phone = "+1-555-0100",
                    Gender = "Male"
                };
                db.Patients.Add(patient);
                db.SaveChanges();
            }

            // ===== ADMISSION =====
            var admission = db.Admissions
            .FirstOrDefault(a => a.PatientId == patient.Id);
            if (admission == null)
            {
                admission = new Admission
                {
                    PatientId = patient.Id,
                    AdmissionDate = DateTime.UtcNow.AddDays(-2),
                    Reason = "Fever and fatigue",
                    Ward = "A2",
                    BedNumber = "12",
                    DoctorName = "Dr. Demo",
                    Notes = "Admitted for observation"
                };
                db.Admissions.Add(admission);
                db.SaveChanges();
            }

            // ===== VITALS (two samples) =====
            bool hasVitals = db.Vitals.Any(v => v.PatientId == patient.Id);
            if (!hasVitals)
            {
                db.Vitals.AddRange(
                new Vital
                {
                    PatientId = patient.Id,
                    TakenAt = DateTime.UtcNow.AddDays(-1).AddHours(-6),
                    Temperature = 38.2, // °C
                    Pulse = 92,
                    RespRate = 18,
                    Systolic = 120,
                    Diastolic = 78,
                    SpO2 = 98,
                    Notes = "Initial vitals on admission"
                },
                new Vital
                {
                    PatientId = patient.Id,
                    TakenAt = DateTime.UtcNow.AddHours(-2),
                    Temperature = 37.3,
                    Pulse = 86,
                    RespRate = 17,
                    Systolic = 118,
                    Diastolic = 76,
                    SpO2 = 99,
                    Notes = "Improved by evening"
                }
                );
                db.SaveChanges();
            }

            // ===== BILLING =====
            bool hasBilling = db.Billings.Any(b => b.AdmissionId == admission.Id);
            if (!hasBilling)
            {
                var room = 1200m;
                var treatment = 900m;
                var meds = 250m;
                var other = 50m;
                var discount = 100m;
                var tax = 0.18m * (room + treatment + meds + other - discount);
                var total = room + treatment + meds + other - discount + tax;

                db.Billings.Add(new Billing
                {
                    PatientId = patient.Id,
                    AdmissionId = admission.Id,
                    BilledAt = DateTime.UtcNow,
                    RoomCharges = room,
                    TreatmentCharges = treatment,
                    MedicationCharges = meds,
                    OtherCharges = other,
                    Discount = discount,
                    Tax = Math.Round(tax, 2),
                    TotalAmount = Math.Round(total, 2),
                    Status = "Open",
                    Notes = "Initial billing on admission"
                });
                db.SaveChanges();
            }

            // ===== DISCHARGE =====
            bool hasDischarge = db.Discharges.Any(d => d.AdmissionId == admission.Id);
            if (!hasDischarge)
            {
                db.Discharges.Add(new Discharge
                {
                    PatientId = patient.Id,
                    AdmissionId = admission.Id,
                    DischargeDate = DateTime.UtcNow, // keep admitted if you prefer: comment this out & remove create
                    Summary = "Symptoms improved, afebrile.",
                    Instructions = "Hydrate, rest, paracetamol PRN.",
                    FollowUp = "OPD in 7 days",
                    OutstandingAmount = 0m
                });
                db.SaveChanges();

                // Optional: set admission discharge timestamp so UI can display
                if (admission.DischargeDate == null)
                {
                    admission.DischargeDate = DateTime.UtcNow;
                    db.SaveChanges();
                }
            }
        }
    }
}
