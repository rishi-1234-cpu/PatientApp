namespace PatientApi.Model.AI
{
    public class TreatmentSuggestRequest
    {
        public int PatientId { get; set; }
        /// <summary>"safe" (default) or "full"</summary>
        public string Mode { get; set; } = "safe";
        /// <summary>Optional user question like "optimize meds" or "anything to watch".</summary>
        public string? Question { get; set; }
        /// <summary>How many days of vitals to include (default 14)</summary>
        public int LookbackDays { get; set; } = 14;
    }

    public class TreatmentSuggestResponse
    {
        public string Mode { get; set; } = "safe";
        public object ContextSent { get; set; } = default!;
        public object Ai { get; set; } = default!;
    }
}
