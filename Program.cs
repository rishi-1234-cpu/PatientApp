using Microsoft.EntityFrameworkCore;
using PatientApi.Data;
using PatientApi.Services; // IOpenAIChatService, OpenAIChatService

var builder = WebApplication.CreateBuilder(args);

// -------------------------
// 1) Services
// -------------------------

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ---- Database (SQLite) ----
// Local default uses appsettings.json ConnectionStrings:DefaultConnection = "Data Source=app.db"
// On Render set env var: ConnectionStrings__DefaultConnection=Data Source=/data/patient.db
var connString = builder.Configuration.GetConnectionString("DefaultConnection")
?? "Data Source=app.db";
builder.Services.AddDbContext<AppDbContext>(opt => opt.UseSqlite(connString));

// ---- OpenAI service ----
// Your OpenAIChatService should accept (HttpClient http, IConfiguration cfg)
// and read the key like: var apiKey = cfg["OPENAI_API_KEY"];
builder.Services.AddHttpClient<IOpenAIChatService, OpenAIChatService>();

// ---- CORS (Frontend origins) ----
const string AllowClient = "AllowClient";
builder.Services.AddCors(options =>
{
    options.AddPolicy(AllowClient, policy =>
    {
        policy.WithOrigins(
        "http://localhost:5173", // Vite dev
        "https://patient-ui.onrender.com" // TODO: replace with your actual Render static site URL
        )
        .AllowAnyHeader()
        .AllowAnyMethod();
        // If you ever need cookies/auth from UI -> API, add: .AllowCredentials();
    });
});

// -------------------------
// 2) Pipeline
// -------------------------

var app = builder.Build();

// Keep Swagger available in all envs (handy on Render)
app.UseSwagger();
app.UseSwaggerUI();

// If Render has HTTPS, this is fine; local Kestrel also supports it by default
app.UseHttpsRedirection();

// CORS must be before MapControllers
app.UseCors(AllowClient);

app.MapControllers();

app.Run();