using System.Threading.Tasks;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using PatientApi.Model;

namespace PatientApi.Data
{
    public static class IdentitySeed
    {
        public static async Task EnsureIdentitySeedAsync(IServiceProvider sp)
        {
            var roleMgr = sp.GetRequiredService<RoleManager<IdentityRole>>();
            var userMgr = sp.GetRequiredService<UserManager<ApplicationUser>>();

            string[] roles = new[] { "Admin", "Doctor", "Nurse", "Clerk" };
            foreach (var r in roles)
                if (!await roleMgr.RoleExistsAsync(r))
                    await roleMgr.CreateAsync(new IdentityRole(r));

            // Admin user (dev only)
            const string adminEmail = "admin@demo.local";
            var admin = await userMgr.FindByNameAsync(adminEmail);
            if (admin == null)
            {
                admin = new ApplicationUser
                {
                    UserName = adminEmail,
                    Email = adminEmail,
                    FullName = "System Administrator",
                    Department = "IT"
                };
                await userMgr.CreateAsync(admin, "Admin@123");
                await userMgr.AddToRoleAsync(admin, "Admin");
            }
        }
    }
}