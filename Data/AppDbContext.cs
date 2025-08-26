using Microsoft.EntityFrameworkCore;
using PatientApi.Model;

namespace PatientApi.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<Patient> Patients { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Patient>(entity =>
            {
                entity.HasKey(p => p.Id);
                entity.Property(p => p.FirstName).HasColumnType("TEXT").IsRequired();
                entity.Property(p => p.LastName).HasColumnType("TEXT").IsRequired();
                entity.Property(p => p.DateOfBirth).HasColumnType("TEXT").IsRequired();
                entity.Property(p => p.Gender).HasColumnType("TEXT");
                entity.Property(p => p.Phone).HasColumnType("TEXT");
                entity.Property(p => p.Email).HasColumnType("TEXT");
                entity.Property(p => p.CreatedAt).HasColumnType("TEXT").IsRequired();
            });
        }
    }
}