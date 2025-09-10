using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using PatientApi.Model;

namespace PatientApi.Data
{
    public class AppDbContext : IdentityDbContext<ApplicationUser> // ✅ Added Identity support
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

        // Your existing tables
        public DbSet<Patient> Patients => Set<Patient>();
        public DbSet<Admission> Admissions => Set<Admission>();
        public DbSet<Vital> Vitals => Set<Vital>();
        public DbSet<Discharge> Discharges => Set<Discharge>();
        public DbSet<Billing> Billings => Set<Billing>();
        public DbSet<ChatMessage> ChatMessages => Set<ChatMessage>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // Keep Identity table mapping
            base.OnModelCreating(modelBuilder);

            // Your existing entity relationships
            modelBuilder.Entity<Admission>()
            .HasOne(a => a.Patient)
            .WithMany(p => p.Admissions)
            .HasForeignKey(a => a.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Vital>()
            .HasOne(v => v.Patient)
            .WithMany(p => p.Vitals)
            .HasForeignKey(v => v.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Discharge>()
            .HasOne(d => d.Patient)
            .WithMany(p => p.Discharges)
            .HasForeignKey(d => d.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Discharge>()
            .HasOne(d => d.Admission)
            .WithMany(a => a.Discharges)
            .HasForeignKey(d => d.AdmissionId)
            .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Billing>()
            .HasOne(b => b.Patient)
            .WithMany(p => p.Billings)
            .HasForeignKey(b => b.PatientId)
            .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Billing>()
            .HasOne(b => b.Admission)
            .WithMany(a => a.Billings)
            .HasForeignKey(b => b.AdmissionId)
            .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<ChatMessage>(e =>
            {
                e.ToTable("ChatMessages");
                e.HasKey(x => x.Id);
                e.Property(x => x.Room).HasMaxLength(100).HasDefaultValue("lobby");
                e.Property(x => x.Sender).HasMaxLength(120);
                e.Property(x => x.Text).HasMaxLength(4000);
                e.Property(x => x.SentAt).HasDefaultValueSql("CURRENT_TIMESTAMP");
            });
        }
    }
}
