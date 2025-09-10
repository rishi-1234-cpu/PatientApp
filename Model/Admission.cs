using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using PatientApi.Model;

public class Admission
{
    public int Id { get; set; }

    [Required]
    public int PatientId { get; set; }

    [JsonIgnore, ValidateNever]
    [ForeignKey(nameof(PatientId))]
    public Patient? Patient { get; set; }

    [Required]
    public DateTime AdmissionDate { get; set; }
    public DateTime? DischargeDate { get; set; }

    public string? Reason { get; set; }
    public string? Ward { get; set; }
    public string? BedNumber { get; set; }
    public string? DoctorName { get; set; }
    public string? Notes { get; set; }

    // ✅ Keep ONLY the collections to avoid shadow FKs like AdmissionId1
    public ICollection<Discharge> Discharges { get; } = new List<Discharge>();
    public ICollection<Billing> Billings { get; } = new List<Billing>();
}