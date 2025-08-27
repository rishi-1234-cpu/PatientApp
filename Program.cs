using Microsoft.EntityFrameworkCore;
using PatientApi.Data;
using PatientApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ----------------------------------------------------
// Kestrel binding for Render/other PaaS (uses $PORT)
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}
// ----------------------------------------------------

// Controllers & Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// ----------------------------------------------------
// CORS: allow local dev + your deployed frontend origin
var frontendOrigin = Environment.GetEnvironmentVariable("FRONTEND_ORIGIN") // e.g. https://yourapp.vercel.app
?? "http://localhost:5173";

builder.Services.AddCors(options =>
{
    options.AddPolicy("_allowClient", policy =>
    policy.WithOrigins(frontendOrigin)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials());
});
// ----------------------------------------------------

// ----------------------------------------------------
// SQLite: durable path if provided, else local file
var dbPath = Environment.GetEnvironmentVariable("DB_PATH") // e.g. /data/patient.db on Render
?? Path.Combine(AppContext.BaseDirectory, "patient.db");
var sqliteConn = $"Data Source={dbPath}";

builder.Services.AddDbContext<AppDbContext>(options =>
options.UseSqlite(sqliteConn));
// ----------------------------------------------------

// OpenAI service (expects OPENAI_API_KEY in env)
builder.Services.AddHttpClient<IOpenAIChatService, OpenAIChatService>();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();

app.UseCors("_allowClient");

app.UseAuthorization();

app.MapControllers();

app.Run();