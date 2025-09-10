using System;

namespace PatientApi.Model
{
    public class ChatMessage
    {
        public int Id { get; set; }
        public string Room { get; set; } = "lobby";
        public int? PatientId { get; set; } // optional link to a patient
        public string Sender { get; set; } = ""; // e.g., "patient:42", "staff:alice"
        public string Text { get; set; } = "";
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
    }
}