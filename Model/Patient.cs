using System;
using System.ComponentModel.DataAnnotations;

namespace PatientApi.Model
{
    public class Patient
    {
        public int Id { get; set; }

        [Required]
        [MaxLength(255)]
        public string FirstName { get; set; }

        [Required]
        [MaxLength(255)]
        public string LastName { get; set; }

        public DateTime DateOfBirth { get; set; }

        [MaxLength(50)]
        public string Gender { get; set; }

        [MaxLength(20)]
        public string Phone { get; set; }

        [MaxLength(255)]
        public string Email { get; set; }

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}