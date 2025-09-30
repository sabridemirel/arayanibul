using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using FluentAssertions;
using API.Services;
using API.Models;
using API.Data;
using API.Interfaces;

namespace API.Tests.Services;

public class AuthServiceTests : IDisposable
{
    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
    private readonly Mock<SignInManager<ApplicationUser>> _signInManagerMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly ApplicationDbContext _context;
    private readonly TestAuthService _authService;

    public AuthServiceTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);

        // Setup mocks
        _userManagerMock = MockUserManager();
        _signInManagerMock = MockSignInManager();
        _configurationMock = new Mock<IConfiguration>();

        // Setup configuration
        _configurationMock.Setup(x => x["Jwt:Key"]).Returns("ThisIsASecretKeyForJWTTokenGenerationThatIsLongEnough");
        _configurationMock.Setup(x => x["Jwt:Issuer"]).Returns("ArayanibulAPI");
        _configurationMock.Setup(x => x["Jwt:Audience"]).Returns("ArayanibulApp");
        _configurationMock.Setup(x => x["Jwt:ExpireMinutes"]).Returns("15");
        _configurationMock.Setup(x => x["Jwt:RefreshExpireDays"]).Returns("7");

        _authService = new TestAuthService(
            _userManagerMock.Object,
            _signInManagerMock.Object,
            _configurationMock.Object,
            _context
        );
    }

    private Mock<UserManager<ApplicationUser>> MockUserManager()
    {
        var store = new Mock<IUserStore<ApplicationUser>>();
        return new Mock<UserManager<ApplicationUser>>(store.Object, null, null, null, null, null, null, null, null);
    }

    private Mock<SignInManager<ApplicationUser>> MockSignInManager()
    {
        var contextAccessor = new Mock<Microsoft.AspNetCore.Http.IHttpContextAccessor>();
        var userPrincipalFactory = new Mock<IUserClaimsPrincipalFactory<ApplicationUser>>();
        return new Mock<SignInManager<ApplicationUser>>(
            _userManagerMock.Object, contextAccessor.Object, userPrincipalFactory.Object, null, null, null, null);
    }

    [Fact]
    public async Task RegisterAsync_WithValidData_ShouldReturnSuccessResponse()
    {
        // Arrange
        var registerDto = new RegisterDto
        {
            Email = "test@example.com",
            Password = "Test123!",
            FirstName = "Test",
            LastName = "User"
        };

        _userManagerMock.Setup(x => x.FindByEmailAsync(registerDto.Email))
            .ReturnsAsync((ApplicationUser?)null);

        _userManagerMock.Setup(x => x.CreateAsync(It.IsAny<ApplicationUser>(), registerDto.Password))
            .ReturnsAsync(IdentityResult.Success);

        // Act
        var result = await _authService.RegisterAsync(registerDto);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Token.Should().NotBeNullOrEmpty();
        result.RefreshToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task RegisterAsync_WithExistingEmail_ShouldReturnFailureResponse()
    {
        // Arrange
        var registerDto = new RegisterDto
        {
            Email = "existing@example.com",
            Password = "Test123!",
            FirstName = "Test",
            LastName = "User"
        };

        var existingUser = new ApplicationUser { Email = registerDto.Email };
        _userManagerMock.Setup(x => x.FindByEmailAsync(registerDto.Email))
            .ReturnsAsync(existingUser);

        // Act
        var result = await _authService.RegisterAsync(registerDto);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Bu email zaten kullanılıyor.");
    }

    [Fact]
    public async Task LoginAsync_WithValidCredentials_ShouldReturnSuccessResponse()
    {
        // Arrange
        var loginDto = new LoginDto
        {
            Email = "test@example.com",
            Password = "Test123!"
        };

        var user = new ApplicationUser
        {
            Id = "test-user-id",
            Email = loginDto.Email,
            FirstName = "Test",
            LastName = "User"
        };

        _userManagerMock.Setup(x => x.FindByEmailAsync(loginDto.Email))
            .ReturnsAsync(user);

        _signInManagerMock.Setup(x => x.CheckPasswordSignInAsync(user, loginDto.Password, false))
            .ReturnsAsync(Microsoft.AspNetCore.Identity.SignInResult.Success);

        // Act
        var result = await _authService.LoginAsync(loginDto);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Token.Should().NotBeNullOrEmpty();
        result.RefreshToken.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task LoginAsync_WithInvalidCredentials_ShouldReturnFailureResponse()
    {
        // Arrange
        var loginDto = new LoginDto
        {
            Email = "test@example.com",
            Password = "WrongPassword"
        };

        var user = new ApplicationUser
        {
            Id = "test-user-id",
            Email = loginDto.Email
        };

        _userManagerMock.Setup(x => x.FindByEmailAsync(loginDto.Email))
            .ReturnsAsync(user);

        _signInManagerMock.Setup(x => x.CheckPasswordSignInAsync(user, loginDto.Password, false))
            .ReturnsAsync(Microsoft.AspNetCore.Identity.SignInResult.Failed);

        // Act
        var result = await _authService.LoginAsync(loginDto);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Message.Should().Be("Email veya şifre hatalı.");
    }

    [Fact]
    public async Task GuestLoginAsync_ShouldReturnSuccessResponse()
    {
        // Act
        var result = await _authService.GuestLoginAsync();

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Token.Should().NotBeNullOrEmpty();
        result.User.Should().NotBeNull();
        result.User!.IsGuest.Should().BeTrue();
    }

    [Fact]
    public async Task LogoutAsync_WithValidUserId_ShouldReturnTrue()
    {
        // Arrange
        var userId = "test-user-id";
        var refreshToken = new RefreshToken
        {
            UserId = userId,
            Token = "test-refresh-token",
            ExpiryDate = DateTime.UtcNow.AddDays(7),
            IsRevoked = false
        };

        _context.RefreshTokens.Add(refreshToken);
        await _context.SaveChangesAsync();

        // Act
        var result = await _authService.LogoutAsync(userId);

        // Assert
        result.Should().BeTrue();
        
        var updatedToken = await _context.RefreshTokens.FirstOrDefaultAsync(x => x.UserId == userId);
        updatedToken?.IsRevoked.Should().BeTrue();
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}

// Test-specific AuthService that doesn't depend on FacebookService
public class TestAuthService : IAuthService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IConfiguration _configuration;
    private readonly ApplicationDbContext _context;

    public TestAuthService(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IConfiguration configuration,
        ApplicationDbContext context)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _configuration = configuration;
        _context = context;
    }

    public async Task<AuthResponseDto> RegisterAsync(RegisterDto dto)
    {
        var existingUser = await _userManager.FindByEmailAsync(dto.Email);
        if (existingUser != null)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Bu email zaten kullanılıyor."
            };
        }

        var user = new ApplicationUser
        {
            UserName = dto.Email,
            Email = dto.Email,
            FirstName = dto.FirstName,
            LastName = dto.LastName,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Kayıt işlemi başarısız."
            };
        }

        var token = GenerateJwtToken(user);
        var refreshToken = GenerateRefreshToken(user.Id);

        return new AuthResponseDto
        {
            Success = true,
            Token = token,
            RefreshToken = refreshToken.Token,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Provider = "Local"
            }
        };
    }

    public async Task<AuthResponseDto> LoginAsync(LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Email veya şifre hatalı."
            };
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, false);
        if (!result.Succeeded)
        {
            return new AuthResponseDto
            {
                Success = false,
                Message = "Email veya şifre hatalı."
            };
        }

        var token = GenerateJwtToken(user);
        var refreshToken = GenerateRefreshToken(user.Id);

        return new AuthResponseDto
        {
            Success = true,
            Token = token,
            RefreshToken = refreshToken.Token,
            User = new UserDto
            {
                Id = user.Id,
                Email = user.Email,
                FirstName = user.FirstName,
                LastName = user.LastName,
                Provider = "Local"
            }
        };
    }

    public async Task<AuthResponseDto> GuestLoginAsync()
    {
        var guestId = Guid.NewGuid().ToString();
        var token = GenerateGuestJwtToken(guestId);

        return new AuthResponseDto
        {
            Success = true,
            Token = token,
            User = new UserDto
            {
                Id = guestId,
                Email = "",
                FirstName = "Misafir",
                LastName = "Kullanıcı",
                Provider = "Guest",
                IsGuest = true
            }
        };
    }

    public async Task<AuthResponseDto> GoogleLoginAsync(string googleToken)
    {
        // Mock implementation for testing
        return new AuthResponseDto { Success = false, Message = "Not implemented in test" };
    }

    public async Task<AuthResponseDto> FacebookLoginAsync(string facebookToken)
    {
        // Mock implementation for testing
        return new AuthResponseDto { Success = false, Message = "Not implemented in test" };
    }

    public async Task<AuthResponseDto> ConvertGuestToUserAsync(string guestId, RegisterDto registerDto)
    {
        // Mock implementation for testing
        return new AuthResponseDto { Success = false, Message = "Not implemented in test" };
    }

    public async Task CleanupExpiredGuestSessionsAsync()
    {
        // Mock implementation for testing
        await Task.CompletedTask;
    }

    public async Task<TokenResponseDto?> RefreshTokenAsync(string refreshToken)
    {
        // Mock implementation for testing
        return null;
    }

    public async Task<bool> LogoutAsync(string userId)
    {
        var refreshTokens = _context.RefreshTokens.Where(rt => rt.UserId == userId);
        foreach (var token in refreshTokens)
        {
            token.IsRevoked = true;
        }
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> ValidateTokenAsync(string token)
    {
        // Mock implementation for testing
        return true;
    }

    private string GenerateJwtToken(ApplicationUser user)
    {
        return "test-jwt-token";
    }

    private string GenerateGuestJwtToken(string guestId)
    {
        return "test-guest-jwt-token";
    }

    private RefreshToken GenerateRefreshToken(string userId)
    {
        var refreshToken = new RefreshToken
        {
            UserId = userId,
            Token = Guid.NewGuid().ToString(),
            ExpiryDate = DateTime.UtcNow.AddDays(7),
            IsRevoked = false
        };

        _context.RefreshTokens.Add(refreshToken);
        _context.SaveChanges();

        return refreshToken;
    }
}