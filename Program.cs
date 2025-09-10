using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.HttpOverrides; // <-- add
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

// -------- Render/PORT binding --------
var port = Environment.GetEnvironmentVariable("PORT");
if (!string.IsNullOrWhiteSpace(port))
{
    builder.WebHost.UseUrls($"http://0.0.0.0:{port}");
}

// ===== Services =====
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();

// ---- Swagger ----
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

// ---- EF Core / SQLite (persist to /var/data on Render) ----
var defaultCs = cfg.GetConnectionString("Default")!;
var renderDiskPath = "/var/data/patient.db";
var isRender = !string.IsNullOrEmpty(Environment.GetEnvironmentVariable("RENDER"));
var connStr = isRender
? $"Data Source={renderDiskPath};Cache=Shared;Mode=ReadWriteCreate;Pooling=True"
: defaultCs;

builder.Services.AddDbContext<AppDbContext>(options =>
options.UseSqlite(connStr));

// ---- Identity + Roles ----
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

// ---- JWT Auth (overridable via env) ----
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

// ---- OpenAI chat service (keys via env preferred) ----
builder.Services.AddScoped<IOpenAIChatService, OpenAIChatService>();
builder.Services.AddHttpClient<IOpenAIChatService, OpenAIChatService>();

// ---- CORS (use FRONTEND_URL env var) ----
var frontendUrl = Environment.GetEnvironmentVariable("FRONTEND_URL");
// You can list fallbacks if needed:
var allowedOrigins = new List<string>
{
"http://localhost:5173",
"https://localhost:5173"
};
if (!string.IsNullOrWhiteSpace(frontendUrl)) allowedOrigins.Add(frontendUrl);

builder.Services.AddCors(options =>
{
    options.AddPolicy("_allowClient", policy =>
    policy.WithOrigins(allowedOrigins.ToArray())
    .AllowAnyHeader()
    .AllowAnyMethod()
    .AllowCredentials());
});

// ---- SignalR ----
builder.Services.AddSignalR();

// ---- Forwarded Headers (Render proxy) ----
builder.Services.Configure<ForwardedHeadersOptions>(o =>
{
    o.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
});

var app = builder.Build();

// ===== DB migrate + seed =====
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
        cmd.CommandText = @"
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA busy_timeout=5000;";
        await cmd.ExecuteNonQueryAsync();
    }
    catch { /* non-fatal for dev */ }

    SeedData.EnsureSeeded(db);
    await IdentitySeed.EnsureIdentitySeedAsync(sp);
}

// ===== Pipeline =====
// (Optionally guard swagger)
// if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Forwarded headers before redirects/auth
app.UseForwardedHeaders();

app.UseHttpsRedirection();

app.UseCors("_allowClient");

app.UseAuthentication();

// ApiKey only for unauthenticated
app.UseWhen(ctx => !(ctx.User?.Identity?.IsAuthenticated ?? false),
branch => branch.UseMiddleware<ApiKeyMiddleware>());

app.UseAuthorization();

app.MapControllers();
app.MapHub<ChatHub>("/hubs/chat");

// Serve static files only if you plan single-service hosting of React.
// If frontend is a separate Render Static Site, you may comment these out.
// app.UseDefaultFiles();
// app.UseStaticFiles();
// app.MapFallbackToFile("index.html");

await app.RunAsync();
