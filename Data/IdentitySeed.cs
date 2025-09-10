using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using PatientApi.Model;
using System;
using System.Threading.Tasks;

namespace PatientApi.Data
{
    public static class IdentitySeed
    {
        public static async Task EnsureIdentitySeedAsync(IServiceProvider services)
        {
            using var scope = services.CreateScope();
            var roleManager = scope.ServiceProvider.GetRequiredService<RoleManager<IdentityRole>>();
            var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

            // Make sure identity tables exist
            await db.Database.MigrateAsync();

            // Ensure core roles
            string[] roles = { "Admin", "Doctor", "Nurse", "Clerk" };
            foreach (var role in roles)
            {
                if (!await roleManager.RoleExistsAsync(role))
                    await roleManager.CreateAsync(new IdentityRole(role));
            }

            // Ensure admin user
            var adminEmail = "admin@patient.com";
            var adminPassword = "Admin@123";

            var admin = await userManager.FindByEmailAsync(adminEmail);
            if (admin == null)
            {
                admin = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    EmailConfirmed = true,
                    FullName = "System Administrator",
                    Department = "Admin"
                };

                var create = await userManager.CreateAsync(admin, adminPassword);
                if (!create.Succeeded)
                {
                    throw new Exception("Failed to create admin user: " +
                    string.Join(", ", create.Errors));
                }
            }

            if (!await userManager.IsInRoleAsync(admin, "Admin"))
                await userManager.AddToRoleAsync(admin, "Admin");
        }
    }
}
