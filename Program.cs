using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using PatientApi.Data;
using PatientApi.Hubs;
using PatientApi.Middleware;
using PatientApi.Model;
using PatientApi.Services;

var builder = WebApplication.CreateBuilder(args);
var cfg = builder.Configuration;

// Bind Render port if provided
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

// Services
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// Swagger (unchanged)
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Patient API", Version = "v1" });
    c.AddSecurityDefinition("ApiKey", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Name = "x-api-key",
        Type = SecuritySchemeType.ApiKey,
        Description = "Enter the API key from appsettings.json (ApiSettings:ApiKey)"
    });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description = "Paste ONLY the JWT. Swagger will add the 'Bearer ' prefix."
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
{
{ new OpenApiSecurityScheme{ Reference = new OpenApiReference{ Type = ReferenceType.SecurityScheme, Id = "ApiKey"} }, Array.Empty<string>() },
{ new OpenApiSecurityScheme{ Reference = new OpenApiReference{ Type = ReferenceType.SecurityScheme, Id = "Bearer"} }, Array.Empty<string>() }
});
});

// EF Core / SQLite
var defaultCs = cfg.GetConnectionString("Default")!;
var sqlitePath = Environment.GetEnvironmentVariable("SQLITE_PATH") ?? "/var/data/patient.db";
try
{
    var dir = Path.GetDirectoryName(sqlitePath);
    if (!string.IsNullOrWhiteSpace(dir)) Directory.CreateDirectory(dir!);
}
catch { /* ignore */ }
var connStr = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("RENDER"))
? $"Data Source={sqlitePath};Cache=Shared;Mode=ReadWriteCreate;Pooling=True"
: defaultCs;
builder.Services.AddDbContext<AppDbContext>(options => options.UseSqlite(connStr));

// Identity + Roles
builder.Services
.AddIdentityCore<ApplicationUser>(o =>
{
    o.User.RequireUniqueEmail = false;
    o.Password.RequiredLength = 6;
    o.Password.RequireDigit = false;
    o.Password.RequireUppercase = false;
    o.Password.RequireNonAlphanumeric = false;
})
.AddRoles<IdentityRole>()
.AddEntityFrameworkStores<AppDbContext>()
.AddDefaultTokenProviders();

// JWT
var jwtSection = cfg.GetSection("Jwt");
var jwtKey = Environment.GetEnvironmentVariable("JWT__KEY")
?? jwtSection.GetValue<string>("Key")
?? "THIS_IS_A_SAMPLE_SECRET_KEY_CHANGE_IT";
var jwtIssuer = Environment.GetEnvironmentVariable("JWT__ISSUER")
?? jwtSection.GetValue<string>("Issuer")
?? "PatientApi";
var jwtAudience = Environment.GetEnvironmentVariable("JWT__AUDIENCE")
?? jwtSection.GetValue<string>("Audience")
?? "PatientApiUsers";

builder.Services
.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
.AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtIssuer,
        ValidAudience = jwtAudience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        ClockSkew = TimeSpan.FromMinutes(1)
    };
});
builder.Services.AddAuthorization();

// OpenAI + SignalR
builder.Services.AddScoped<IOpenAIChatService, OpenAIChatService>();
builder.Services.AddHttpClient<IOpenAIChatService, OpenAIChatService>();
builder.Services.AddSignalR();

// CORS — allow localhost + your static site + Render previews
var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL");
const string deployedFrontend = "https://patient-portal-ipd.onrender.com";
var explicitAllowed = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
{
"http://localhost:5173",
"https://localhost:5173",
deployedFrontend
};
if (!string.IsNullOrWhiteSpace(frontendUrl)) explicitAllowed.Add(frontendUrl);

builder.Services.AddCors(options =>
{
    options.AddPolicy("_allowClient", policy =>
    policy
    .SetIsOriginAllowed(origin =>
    {
        if (string.IsNullOrEmpty(origin)) return false;
        if (explicitAllowed.Contains(origin)) return true;
        // allow Render preview branches of *your* app
        return origin.EndsWith(".onrender.com", StringComparison.OrdinalIgnoreCase);
    })
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials() // ✅ Added for SignalR
    );
});

// Forwarded headers for Render proxy
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
});

var app = builder.Build();

// Migrate/seed
using (var scope = app.Services.CreateScope())
{
    var sp = scope.ServiceProvider;
    var db = sp.GetRequiredService<AppDbContext>();
    try { db.Database.Migrate(); } catch { db.Database.EnsureCreated(); }
    try
    {
        var conn = db.Database.GetDbConnection();
        await conn.OpenAsync();
        using var cmd = conn.CreateCommand();
        cmd.CommandText = @"PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA busy_timeout=5000;";
        await cmd.ExecuteNonQueryAsync();
    }
    catch { }
    SeedData.EnsureSeeded(db);
    await IdentitySeed.EnsureIdentitySeedAsync(sp);
}

// Pipeline (order matters)
app.UseSwagger();
app.UseSwaggerUI();

app.UseForwardedHeaders();
app.UseHttpsRedirection();

app.UseCors("_allowClient");

app.UseAuthentication();
app.UseWhen(ctx => !(ctx.User?.Identity?.IsAuthenticated ?? false),
branch => branch.UseMiddleware<ApiKeyMiddleware>());
app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

await app.RunAsync();
