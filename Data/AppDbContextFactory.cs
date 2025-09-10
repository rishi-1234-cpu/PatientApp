using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace PatientApi.Data
{
    public class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
    {
        public AppDbContext CreateDbContext(string[] args)
        {
            // Use the SAME connection string you use in Program.cs
            var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlite("Data Source=patient.db;Cache=Shared;Mode=ReadWriteCreate;Pooling=True")
            .Options;

            return new AppDbContext(options);
        }
    }
}