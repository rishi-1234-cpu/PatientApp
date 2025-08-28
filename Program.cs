using Microsoft.EntityFrameworkCore;
using PatientApi.Data;
using PatientApi.Services;

var builder = WebApplication.CreateBuilder(args);

// ------------ Render/PORT binding (required on Render) ------------
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

// ------------ Services ------------
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// SQLite via ConnectionStrings:Default (env on Render)
builder.Services.AddDbContext<AppDbContext>(options =>
options.UseSqlite(builder.Configuration.GetConnectionString("Default")));

// Optional: your OpenAI chat service (expects OPENAI_API_KEY in env)
builder.Services.AddHttpClient<IOpenAIChatService, OpenAIChatService>();

// CORS (relaxed; fine because SPA is served by same app)
builder.Services.AddCors(options =>
{
    options.AddPolicy("_allowClient", policy =>
    policy.AllowAnyOrigin()
    .AllowAnyHeader()
    .AllowAnyMethod());
});

var app = builder.Build();

// ------------ DB migrate + seed ------------
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    try
    {
        db.Database.Migrate();
    }
    catch
    {
        db.Database.EnsureCreated();
    }

    // Insert default data only if table is empty
    SeedData.EnsureSeeded(db);
}

// ------------ Pipeline ------------
app.UseSwagger();
app.UseSwaggerUI();

app.UseHttpsRedirection();
app.UseCors("_allowClient");
app.UseAuthorization();

app.MapControllers();

// ------------ Serve React (built into wwwroot) ------------
app.UseDefaultFiles();
app.UseStaticFiles();
app.MapFallbackToFile("index.html");

app.Run();