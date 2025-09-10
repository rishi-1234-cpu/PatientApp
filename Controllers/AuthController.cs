using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

using PatientApi.DTOs;
using PatientApi.Model; // ApplicationUser

namespace PatientApi.Controllers
{
    [ApiController]
    [AllowAnonymous]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly UserManager<ApplicationUser> _users;
        private readonly RoleManager<IdentityRole> _roles;
        private readonly IConfiguration _cfg;

        public AuthController(
        UserManager<ApplicationUser> users,
        RoleManager<IdentityRole> roles,
        IConfiguration cfg)
        {
            _users = users;
            _roles = roles;
            _cfg = cfg;
        }

        // ---------- POST /api/auth/login ----------
        [HttpPost("login")]
        [AllowAnonymous]
        public async Task<ActionResult<UserResponseDto>> Login([FromBody] LoginUserDto req)
        {
            if (req is null || string.IsNullOrWhiteSpace(req.UserName) || string.IsNullOrWhiteSpace(req.Password))
                return BadRequest("Username and password are required.");

            var user = await _users.FindByNameAsync(req.UserName)
            ?? await _users.FindByEmailAsync(req.UserName);
            if (user is null) return Unauthorized("Invalid credentials.");

            var ok = await _users.CheckPasswordAsync(user, req.Password);
            if (!ok) return Unauthorized("Invalid credentials.");

            var roles = await _users.GetRolesAsync(user);
            var token = GenerateJwt(user, roles);

            return Ok(new UserResponseDto
            {
                UserName = user.UserName ?? "",
                Email = user.Email ?? "",
                Token = token,
                Roles = roles
            });
        }

        // ---------- POST /api/auth/register ----------
        // Keep Admin-only if you seed an initial admin. If you want open self-signup, change to [AllowAnonymous].
        [HttpPost("register")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "Admin")]
        public async Task<IActionResult> Register([FromBody] RegisterUserDto req)
        {
            if (req is null) return BadRequest("Invalid request body.");

            var exists = await _users.FindByNameAsync(req.UserName)
            ?? await _users.FindByEmailAsync(req.Email);
            if (exists is not null) return BadRequest("User already exists.");

            var user = new ApplicationUser
            {
                UserName = req.UserName,
                Email = req.Email,
                FullName = req.FullName,
                Department = req.Department,
                IsActive = true
            };
            var result = await _users.CreateAsync(user, req.Password);
            if (!result.Succeeded) return BadRequest(result.Errors);

            // default role (optional)
            if (await _roles.RoleExistsAsync("Clerk"))
                await _users.AddToRoleAsync(user, "Clerk");

            return Ok(new { message = "User created." });
        }

        // ---------- POST /api/auth/create-role (Admin only) ----------
        [HttpPost("create-role")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "Admin")]
        public async Task<IActionResult> CreateRole([FromBody] RoleDto req)
        {
            if (string.IsNullOrWhiteSpace(req?.RoleName))
                return BadRequest("RoleName is required.");

            if (await _roles.RoleExistsAsync(req.RoleName))
                return Ok(new { message = "Role already exists." });

            var r = await _roles.CreateAsync(new IdentityRole(req.RoleName));
            return r.Succeeded ? Ok(new { message = "Role created." }) : BadRequest(r.Errors);
        }

        // ---------- POST /api/auth/assign-role (Admin only) ----------
        [HttpPost("assign-role")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme, Roles = "Admin")]
        public async Task<IActionResult> AssignRole([FromBody] RoleDto req, [FromQuery] string userName)
        {
            if (string.IsNullOrWhiteSpace(userName)) return BadRequest("userName is required.");
            if (string.IsNullOrWhiteSpace(req?.RoleName)) return BadRequest("RoleName is required.");

            var user = await _users.FindByNameAsync(userName)
            ?? await _users.FindByEmailAsync(userName);
            if (user is null) return NotFound("User not found.");
            if (!await _roles.RoleExistsAsync(req.RoleName)) return BadRequest("Role does not exist.");

            var res = await _users.AddToRoleAsync(user, req.RoleName);
            return res.Succeeded ? Ok(new { message = "Role assigned." }) : BadRequest(res.Errors);
        }

        // ---------- GET /api/auth/me ----------
        [HttpGet("me")]
        [Authorize(AuthenticationSchemes = JwtBearerDefaults.AuthenticationScheme)]
        public async Task<IActionResult> Me()
        {
            var user = await _users.GetUserAsync(User);
            if (user is null) return Unauthorized();

            var roles = await _users.GetRolesAsync(user);
            return Ok(new
            {
                user = user.UserName,
                email = user.Email,
                roles
            });
        }

        // ===== helpers =====
        private string GenerateJwt(ApplicationUser user, IList<string> roles)
        {
            var jwt = _cfg.GetSection("Jwt");
            var keyStr = jwt["Key"] ?? throw new InvalidOperationException("Jwt:Key not configured");
            var issuer = jwt["Issuer"] ?? "PatientApi";
            var audience = jwt["Audience"] ?? "PatientApiUsers";
            var minsStr = jwt["ExpiresInMinutes"];
            var expiresInMinutes = !int.TryParse(minsStr, out var m) ? 480 : m; // default 8h

            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyStr));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var now = DateTime.UtcNow;

            var claims = new List<Claim>
{
new(JwtRegisteredClaimNames.Sub, user.Id),
new(JwtRegisteredClaimNames.UniqueName, user.UserName ?? string.Empty),
new(ClaimTypes.NameIdentifier, user.Id),
new(ClaimTypes.Name, user.UserName ?? string.Empty),
new(JwtRegisteredClaimNames.Email, user.Email ?? string.Empty),
new(JwtRegisteredClaimNames.Iat, new DateTimeOffset(now).ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64)
};
            foreach (var r in roles)
                claims.Add(new Claim(ClaimTypes.Role, r));

            var token = new JwtSecurityToken(
            issuer: issuer, // must match Program.cs ValidIssuer
            audience: audience, // must match Program.cs ValidAudience
            claims: claims,
            notBefore: now,
            expires: now.AddMinutes(expiresInMinutes),
            signingCredentials: creds
            );

            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}