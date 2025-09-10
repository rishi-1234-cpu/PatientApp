using Microsoft.AspNetCore.Mvc.ModelBinding.Validation;
using PatientApi.Model;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

public class Vital
{
    public int Id { get; set; }

    [Required]
    public int PatientId { get; set; }

    [JsonIgnore]
    [ValidateNever]
    [ForeignKey(nameof(PatientId))]
    public Patient? Patient { get; set; }

    public DateTime TakenAt { get; set; } = DateTime.UtcNow;

    public double? Temperature { get; set; }
    public int? Pulse { get; set; }
    public int? RespRate { get; set; }
    public int? Systolic { get; set; }
    public int? Diastolic { get; set; }
    public int? SpO2 { get; set; }
    public string? Notes { get; set; }
}