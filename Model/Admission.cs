using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using PatientApi.Model;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

public class Admission
{
    public int Id { get; set; }

    [Required]
    public int PatientId { get; set; }

    [JsonIgnore] // don't bind from JSON
    [ValidateNever] // don't validate
    [ForeignKey(nameof(PatientId))]
    public Patient? Patient { get; set; } // make it nullable

    [Required]
    public DateTime AdmissionDate { get; set; }
    public DateTime? DischargeDate { get; set; }
    public string? Reason { get; set; }
    public string? Ward { get; set; }
    public string? BedNumber { get; set; }
    public string? DoctorName { get; set; }
    public string? Notes { get; set; }
    public Discharge? Discharge { get; set; }
    public Billing? Billing { get; set; }
    public ICollection<Discharge> Discharges { get; } = new List<Discharge>();
    public ICollection<Billing>Billings { get; } = new List<Billing>();
}