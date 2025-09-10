using PatientApi.Data;
using PatientApi.Model;


namespace PatientApi.Data;

public static class SeedData
{
    public static void EnsureSeeded(AppDbContext db)
    {
        if (db.Patients.Any()) return;

        db.Patients.Add(new Patient
        {
            FirstName = "Rishi",
            LastName = "Demo",
            DateOfBirth = DateTime.UtcNow.AddYears(-30).Date,
            Gender = "Male",
            Email = "rishi@example.com",
            Phone = "+1-555-0100"
        });

        db.SaveChanges();
    }
}

