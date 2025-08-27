using Microsoft.EntityFrameworkCore;
using PatientApi.Data;
using PatientApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ----------------------------
// Kestrel binding for Render (PORT)
// ----------------------------
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

// ----------------------------
// Controllers & Swagger
// ----------------------------
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ----------------------------
// CORS: allow your deployed frontend (or local dev)
// ----------------------------
var frontendOrigin =
Environment.GetEnvironmentVariable("FRONTEND_ORIGIN")
?? "http://localhost:5173"; // change if your local port differs

builder.Services.AddCors(options =>
{
    options.AddPolicy("_allowClient", policy =>
    policy.WithOrigins(frontendOrigin)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials());
});

// ----------------------------
// SQLite connection
// Priority:
// 1) ConnectionStrings:Default (Render Environment → ConnectionStrings__Default)
// 2) DB_PATH env var (Render Environment → DB_PATH=/tmp/patient.db)
// 3) Local file ./patient.db (for dev)
// ----------------------------
string? connFromConfig = builder.Configuration.GetConnectionString("Default");
string? dbPathEnv = Environment.GetEnvironmentVariable("DB_PATH");

string sqliteConn =
!string.IsNullOrWhiteSpace(connFromConfig) ? connFromConfig :
!string.IsNullOrWhiteSpace(dbPathEnv) ? $"Data Source={dbPathEnv}" :
$"Data Source={Path.Combine(AppContext.BaseDirectory, "patient.db")}";

builder.Services.AddDbContext<AppDbContext>(options =>
{
    options.UseSqlite(sqliteConn);
});

// ----------------------------
// OpenAI chat service (expects OPENAI_API_KEY in env)
// ----------------------------
builder.Services.AddHttpClient<IOpenAIChatService, OpenAIChatService>();

var app = builder.Build();

// ----------------------------
// Swagger: enable in ALL environments (so it works on Render)
// ----------------------------
app.UseSwagger();
app.UseSwaggerUI();

// ----------------------------
// Middleware pipeline
// ----------------------------
app.UseHttpsRedirection();
app.UseCors("_allowClient");
app.UseAuthorization();
app.MapControllers();

app.Run();