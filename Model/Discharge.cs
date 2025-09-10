using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;

namespace PatientApi.Model
{
    public class Discharge
    {
        [Key] public int Id { get; set; }

        [Required] public int PatientId { get; set; }
        [JsonIgnore, ValidateNever]
        [ForeignKey(nameof(PatientId))]
        public Patient? Patient { get; set; }

        [Required] public int AdmissionId { get; set; }
        [JsonIgnore, ValidateNever]
        [ForeignKey(nameof(AdmissionId))]
        public Admission? Admission { get; set; }

        [Required] public DateTime DischargeDate { get; set; } = DateTime.UtcNow;

        [MaxLength(500)] public string? Summary { get; set; }
        [MaxLength(500)] public string? Instructions { get; set; }
        [MaxLength(200)] public string? FollowUp { get; set; }

        public decimal? OutstandingAmount { get; set; }
    }
}
