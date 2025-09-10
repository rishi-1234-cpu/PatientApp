using System;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace PatientApi.Model
{
    public class Billing
    {
        [Key] public int Id { get; set; }

        [Required] public int PatientId { get; set; }
        [JsonIgnore, ValidateNever] // <— add
        [ForeignKey(nameof(PatientId))]
        public Patient? Patient { get; set; } = null;

        [Required] public int AdmissionId { get; set; }
        [JsonIgnore, ValidateNever] // <— add
        [ForeignKey(nameof(AdmissionId))]
        public Admission? Admission { get; set; } = null;

        public DateTime BilledAt { get; set; } = DateTime.UtcNow;

        // charges...
        public decimal RoomCharges { get; set; }
        public decimal TreatmentCharges { get; set; }
        public decimal MedicationCharges { get; set; }
        public decimal OtherCharges { get; set; }
        public decimal Discount { get; set; }
        public decimal Tax { get; set; }
        public decimal TotalAmount { get; set; }

        [MaxLength(50)] public string? Status { get; set; }
        [MaxLength(300)] public string? Notes { get; set; }
    }
}