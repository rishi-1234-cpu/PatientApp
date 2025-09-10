using PatientApi.Model;
using System;
using System.ComponentModel.DataAnnotations;

namespace PatientApi.Model
{
    public class Patient
    {
        public int Id { get; set; }

        public string FirstName { get; set; } = default!;
        public string LastName { get; set; } = default!;
        public DateTime DateOfBirth { get; set; }
        public DateTime CreatedAt{ get; set; }
        public string Gender { get; set; } = default!;
        public string Email { get; set; } = default!;
        public string Phone { get; set; } = default!;

        // Optional: navigation collections
        public ICollection<Admission>? Admissions { get; set; }
        public ICollection<Vital>? Vitals { get; set; }
        public ICollection<Discharge> Discharges { get; } = new List<Discharge>();
        public ICollection<Billing> Billings { get; } = new List<Billing>();
    }
}