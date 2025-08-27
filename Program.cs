using Microsoft.EntityFrameworkCore;
using PatientApi.Data;
using PatientApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Bind Kestrel to PORT (Render sets this)
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

// Controllers + Swagger
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// CORS (allow your frontend origin; default allows local dev)
var frontendOrigin = Environment.GetEnvironmentVariable("FRONTEND_ORIGIN")
?? "http://localhost:5173";
builder.Services.AddCors(options =>
{
    options.AddPolicy("_allowClient", policy =>
    policy.WithOrigins(frontendOrigin)
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials());
});

// SQLite – use env ConnectionStrings__Default (Render) or fallback
var conn = builder.Configuration.GetConnectionString("Default")
?? "Data Source=patient.db";
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite(conn));

// OpenAI service (expects OPENAI_API_KEY in env)
builder.Services.AddHttpClient<IOpenAIChatService, OpenAIChatService>();

var app = builder.Build();

// Swagger (enabled in prod too)
app.UseSwagger();
app.UseSwaggerUI();

// Static files / SPA (React build is copied to wwwroot by Dockerfile)
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseHttpsRedirection();
app.UseCors("_allowClient");
app.UseAuthorization();

app.MapControllers();

// Any unknown route -> React index.html
app.MapFallbackToFile("index.html");

app.Run();