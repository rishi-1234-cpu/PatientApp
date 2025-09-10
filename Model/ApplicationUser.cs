using Microsoft.AspNetCore.Identity;

namespace PatientApi.Model
{
    public class ApplicationUser : IdentityUser
    {
        // Optional extra profile fields
        public string? FullName { get; set; }
        public string? Department { get; set; }
        public bool IsActive { get; set; } = true;

        // You can add more custom fields later if needed
    }
}