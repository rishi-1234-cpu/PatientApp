using System;
using System.Collections.Generic;
using System.Linq;
using PatientApi.Model;

namespace PatientApi.Data
{
    public static class SeedData
    {
        public static void EnsureSeeded(AppDbContext db)
        {
            db.Database.EnsureCreated();

            if (!db.Patients.Any())
            {
                var patient = new Patient
                {
                    FirstName = "Rishi",
                    LastName = "Demo",
                    DateOfBirth = new DateTime(1990, 1, 1),
                    CreatedAt = DateTime.UtcNow,
                    Gender = "Male",
                    Email = "rishi@example.com",
                    Phone = "+91-8976543231"
                };
                db.Patients.Add(patient);
                db.SaveChanges();

                // Admission
                var admission = new Admission
                {
                    PatientId = patient.Id,
                    AdmissionDate = DateTime.UtcNow.AddDays(-2),
                    Reason = "General Checkup",
                    Ward = "General Ward",
                    BedNumber = "B12",
                    DoctorName = "Dr. John Doe",
                    Notes = "Patient admitted for observation."
                };
                db.Admissions.Add(admission);
                db.SaveChanges();

                // Vital
                var vital = new Vital
                {
                    PatientId = patient.Id,
                    TakenAt = DateTime.UtcNow,
                    Temperature = 98.6,
                    Pulse = 75,
                    RespRate = 16,
                    Systolic = 120,
                    Diastolic = 80,
                    SpO2 = 98,
                    Notes = "Vitals within normal range."
                };
                db.Vitals.Add(vital);
                db.SaveChanges();

                // Billing
                var billing = new Billing
                {
                    PatientId = patient.Id,
                    AdmissionId = admission.Id,
                    BilledAt = DateTime.UtcNow,
                    RoomCharges = 5000,
                    TreatmentCharges = 2000,
                    MedicationCharges = 1500,
                    OtherCharges = 500,
                    Discount = 200,
                    Tax = 300,
                    TotalAmount = 9100,
                    Status = "Paid",
                    Notes = "Full payment received."
                };
                db.Billings.Add(billing);
                db.SaveChanges();

                // Discharge
                var discharge = new Discharge
                {
                    PatientId = patient.Id,
                    AdmissionId = admission.Id,
                    DischargeDate = DateTime.UtcNow.AddDays(-1),
                    Summary = "Patient recovered well.",
                    Instructions = "Regular exercise and balanced diet.",
                    FollowUp = "Next month",
                    OutstandingAmount = 0
                };
                db.Discharges.Add(discharge);
                db.SaveChanges();
            }
        }
    }
}
