using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using FluentAssertions;
using API.Services;
using API.Models;
using API.Data;
using API.Interfaces;

namespace API.Tests.Services;

/// <summary>
/// Comprehensive unit tests for VerificationService
/// Tests cover email/phone verification, rate limiting, and document verification
/// </summary>
public class VerificationServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<UserManager<ApplicationUser>> _userManagerMock;
    private readonly Mock<IFileStorageService> _fileStorageServiceMock;
    private readonly Mock<ISmsService> _smsServiceMock;
    private readonly Mock<ILogger<VerificationService>> _loggerMock;
    private readonly Mock<IConfiguration> _configurationMock;
    private readonly VerificationService _verificationService;

    private readonly string _testUserId = "test-user-id";
    private readonly ApplicationUser _testUser;

    public VerificationServiceTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);

        // Setup mocks
        _userManagerMock = MockUserManager();
        _fileStorageServiceMock = new Mock<IFileStorageService>();
        _smsServiceMock = new Mock<ISmsService>();
        _loggerMock = new Mock<ILogger<VerificationService>>();
        _configurationMock = new Mock<IConfiguration>();

        _verificationService = new VerificationService(
            _context,
            _userManagerMock.Object,
            _fileStorageServiceMock.Object,
            _smsServiceMock.Object,
            _loggerMock.Object,
            _configurationMock.Object
        );

        // Setup test user
        _testUser = new ApplicationUser
        {
            Id = _testUserId,
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User",
            PhoneNumber = "+905551234567",
            VerificationBadges = VerificationBadges.None
        };

        _context.Users.Add(_testUser);
        _context.SaveChanges();

        _userManagerMock.Setup(x => x.FindByIdAsync(_testUserId))
            .ReturnsAsync(_testUser);
    }

    private Mock<UserManager<ApplicationUser>> MockUserManager()
    {
        var store = new Mock<IUserStore<ApplicationUser>>();
        return new Mock<UserManager<ApplicationUser>>(store.Object, null, null, null, null, null, null, null, null);
    }

    [Fact]
    public async Task SendEmailVerificationCodeAsync_WithValidUser_ShouldSendCode()
    {
        // Act
        var result = await _verificationService.SendEmailVerificationCodeAsync(_testUserId);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Message.Should().Contain("sent");
        result.ExpiresAt.Should().NotBeNull();
        result.ExpiresAt.Should().BeAfter(DateTime.UtcNow);

        // Verify verification record was created
        var verification = await _context.Set<UserVerification>()
            .FirstOrDefaultAsync(v => v.UserId == _testUserId && v.Type == VerificationType.Email);
        verification.Should().NotBeNull();
        verification!.VerificationCode.Should().NotBeNullOrEmpty();
        verification.CodeExpiresAt.Should().NotBeNull();
    }

    [Fact]
    public async Task SendEmailVerificationCodeAsync_WithNonExistentUser_ShouldReturnFailure()
    {
        // Arrange
        _userManagerMock.Setup(x => x.FindByIdAsync("non-existent"))
            .ReturnsAsync((ApplicationUser?)null);

        // Act
        var result = await _verificationService.SendEmailVerificationCodeAsync("non-existent");

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Message.Should().Be("User not found");
    }

    [Fact]
    public async Task SendEmailVerificationCodeAsync_WithNoEmail_ShouldReturnFailure()
    {
        // Arrange
        var userWithoutEmail = new ApplicationUser
        {
            Id = "no-email-user",
            Email = null,
            FirstName = "Test",
            LastName = "User"
        };
        _context.Users.Add(userWithoutEmail);
        await _context.SaveChangesAsync();

        _userManagerMock.Setup(x => x.FindByIdAsync("no-email-user"))
            .ReturnsAsync(userWithoutEmail);

        // Act
        var result = await _verificationService.SendEmailVerificationCodeAsync("no-email-user");

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Message.Should().Be("No email address registered");
    }

    [Fact]
    public async Task SendEmailVerificationCodeAsync_ExceedingRateLimit_ShouldReturnFailure()
    {
        // Arrange - Create 3 recent verification attempts (rate limit is 3)
        var recentAttempts = Enumerable.Range(0, 3).Select(_ => new UserVerification
        {
            UserId = _testUserId,
            Type = VerificationType.Email,
            Status = VerificationStatus.Pending,
            LastAttemptAt = DateTime.UtcNow.AddMinutes(-2),
            CreatedAt = DateTime.UtcNow.AddMinutes(-2)
        }).ToList();

        _context.Set<UserVerification>().AddRange(recentAttempts);
        await _context.SaveChangesAsync();

        // Act
        var result = await _verificationService.SendEmailVerificationCodeAsync(_testUserId);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("Too many attempts");
    }

    [Fact]
    public async Task SendPhoneVerificationCodeAsync_WithValidUser_ShouldSendSms()
    {
        // Arrange
        _smsServiceMock.Setup(x => x.SendVerificationCodeAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        var result = await _verificationService.SendPhoneVerificationCodeAsync(_testUserId);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Message.Should().Contain("sent");
        result.ExpiresAt.Should().NotBeNull();

        // Verify SMS was sent
        _smsServiceMock.Verify(
            x => x.SendVerificationCodeAsync(_testUser.PhoneNumber!, It.IsAny<string>()),
            Times.Once
        );
    }

    [Fact]
    public async Task SendPhoneVerificationCodeAsync_WithNoPhoneNumber_ShouldReturnFailure()
    {
        // Arrange
        var userWithoutPhone = new ApplicationUser
        {
            Id = "no-phone-user",
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User",
            PhoneNumber = null
        };
        _context.Users.Add(userWithoutPhone);
        await _context.SaveChangesAsync();

        _userManagerMock.Setup(x => x.FindByIdAsync("no-phone-user"))
            .ReturnsAsync(userWithoutPhone);

        // Act
        var result = await _verificationService.SendPhoneVerificationCodeAsync("no-phone-user");

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Message.Should().Be("No phone number registered");
    }

    [Fact]
    public async Task VerifyEmailCodeAsync_WithValidCode_ShouldApproveVerification()
    {
        // Arrange - Send verification code first
        await _verificationService.SendEmailVerificationCodeAsync(_testUserId);

        // Get the verification record to extract the hashed code
        var verification = await _context.Set<UserVerification>()
            .FirstAsync(v => v.UserId == _testUserId && v.Type == VerificationType.Email);

        // For testing purposes, we'll directly use a known code
        // In real scenario, the code would be sent to email
        var testCode = "123456";
        var hashedCode = HashCode(testCode);
        verification.VerificationCode = hashedCode;
        await _context.SaveChangesAsync();

        // Act
        var result = await _verificationService.VerifyEmailCodeAsync(_testUserId, _testUser.Email!, testCode);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Message.Should().Contain("verified successfully");
        result.UpdatedBadges.Should().NotBeNull();
        result.UpdatedBadges!.Value.HasFlag(VerificationBadges.EmailVerified).Should().BeTrue();

        // Verify user badge was updated
        var updatedUser = await _context.Users.FindAsync(_testUserId);
        updatedUser!.VerificationBadges.HasFlag(VerificationBadges.EmailVerified).Should().BeTrue();
        updatedUser.EmailConfirmed.Should().BeTrue();
    }

    [Fact]
    public async Task VerifyEmailCodeAsync_WithInvalidCode_ShouldReturnFailure()
    {
        // Arrange
        await _verificationService.SendEmailVerificationCodeAsync(_testUserId);

        // Act
        var result = await _verificationService.VerifyEmailCodeAsync(_testUserId, _testUser.Email!, "wrong-code");

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("Invalid verification code");
    }

    [Fact]
    public async Task VerifyEmailCodeAsync_WithExpiredCode_ShouldReturnFailure()
    {
        // Arrange - Create expired verification
        var testCode = "123456";
        var hashedCode = HashCode(testCode);
        var expiredVerification = new UserVerification
        {
            UserId = _testUserId,
            Type = VerificationType.Email,
            Status = VerificationStatus.Pending,
            VerificationCode = hashedCode,
            CodeExpiresAt = DateTime.UtcNow.AddMinutes(-1), // Expired
            CreatedAt = DateTime.UtcNow.AddMinutes(-11)
        };
        _context.Set<UserVerification>().Add(expiredVerification);
        await _context.SaveChangesAsync();

        // Act
        var result = await _verificationService.VerifyEmailCodeAsync(_testUserId, _testUser.Email!, testCode);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeFalse();
        result.Message.Should().Contain("expired");
    }

    [Fact]
    public async Task VerifyPhoneCodeAsync_WithValidCode_ShouldApproveVerification()
    {
        // Arrange
        await _verificationService.SendPhoneVerificationCodeAsync(_testUserId);

        var verification = await _context.Set<UserVerification>()
            .FirstAsync(v => v.UserId == _testUserId && v.Type == VerificationType.Phone);

        var testCode = "123456";
        var hashedCode = HashCode(testCode);
        verification.VerificationCode = hashedCode;
        await _context.SaveChangesAsync();

        // Act
        var result = await _verificationService.VerifyPhoneCodeAsync(_testUserId, _testUser.PhoneNumber!, testCode);

        // Assert
        result.Should().NotBeNull();
        result.Success.Should().BeTrue();
        result.Message.Should().Contain("verified successfully");
        result.UpdatedBadges.Should().NotBeNull();
        result.UpdatedBadges!.Value.HasFlag(VerificationBadges.PhoneVerified).Should().BeTrue();

        // Verify user badge was updated
        var updatedUser = await _context.Users.FindAsync(_testUserId);
        updatedUser!.VerificationBadges.HasFlag(VerificationBadges.PhoneVerified).Should().BeTrue();
        updatedUser.PhoneNumberConfirmed.Should().BeTrue();
    }

    [Fact]
    public async Task SubmitVerificationRequestAsync_WithDocuments_ShouldCreateVerificationRequest()
    {
        // Arrange
        var mockFiles = new List<IFormFile>
        {
            CreateMockFormFile("document1.jpg"),
            CreateMockFormFile("document2.jpg")
        };

        _fileStorageServiceMock.Setup(x => x.UploadImageAsync(It.IsAny<IFormFile>(), "verifications"))
            .ReturnsAsync((IFormFile file, string folder) => $"https://storage.example.com/{file.FileName}");

        // Act
        var result = await _verificationService.SubmitVerificationRequestAsync(
            _testUserId,
            VerificationType.Identity,
            mockFiles,
            "Please verify my identity"
        );

        // Assert
        result.Should().NotBeNull();
        result.Type.Should().Be(VerificationType.Identity);
        result.Status.Should().Be(VerificationStatus.InReview);
        result.UserId.Should().Be(_testUserId);
        result.DocumentUrls.Should().NotBeNullOrEmpty();

        // Verify files were uploaded
        _fileStorageServiceMock.Verify(
            x => x.UploadImageAsync(It.IsAny<IFormFile>(), "verifications"),
            Times.Exactly(2)
        );
    }

    [Fact]
    public async Task SubmitVerificationRequestAsync_WithExistingPendingRequest_ShouldThrowException()
    {
        // Arrange - Create existing pending verification
        var existingVerification = new UserVerification
        {
            UserId = _testUserId,
            Type = VerificationType.Identity,
            Status = VerificationStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        _context.Set<UserVerification>().Add(existingVerification);
        await _context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _verificationService.SubmitVerificationRequestAsync(_testUserId, VerificationType.Identity)
        );
    }

    [Fact]
    public async Task SubmitVerificationRequestAsync_ExceedingRateLimit_ShouldThrowException()
    {
        // Arrange - Create 3 recent verification attempts
        var recentAttempts = Enumerable.Range(0, 3).Select(_ => new UserVerification
        {
            UserId = _testUserId,
            Type = VerificationType.Identity,
            Status = VerificationStatus.Rejected,
            LastAttemptAt = DateTime.UtcNow.AddMinutes(-2),
            CreatedAt = DateTime.UtcNow.AddMinutes(-2)
        }).ToList();

        _context.Set<UserVerification>().AddRange(recentAttempts);
        await _context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(
            () => _verificationService.SubmitVerificationRequestAsync(_testUserId, VerificationType.Identity)
        );
    }

    [Fact]
    public async Task GetUserVerificationsAsync_ShouldReturnAllVerifications()
    {
        // Arrange - Create multiple verifications
        var verifications = new[]
        {
            new UserVerification
            {
                UserId = _testUserId,
                Type = VerificationType.Email,
                Status = VerificationStatus.Approved,
                CreatedAt = DateTime.UtcNow.AddDays(-2),
                ReviewedAt = DateTime.UtcNow.AddDays(-1)
            },
            new UserVerification
            {
                UserId = _testUserId,
                Type = VerificationType.Phone,
                Status = VerificationStatus.Pending,
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            }
        };
        _context.Set<UserVerification>().AddRange(verifications);

        // Update user badges
        _testUser.VerificationBadges = VerificationBadges.EmailVerified;
        await _context.SaveChangesAsync();

        // Act
        var result = await _verificationService.GetUserVerificationsAsync(_testUserId);

        // Assert
        result.Should().NotBeNull();
        result.Badges.Should().Be(VerificationBadges.EmailVerified);
        result.Verifications.Should().HaveCount(2);
        result.Verifications.Should().Contain(v => v.Type == VerificationType.Email && v.Status == VerificationStatus.Approved);
        result.Verifications.Should().Contain(v => v.Type == VerificationType.Phone && v.Status == VerificationStatus.Pending);
    }

    [Fact]
    public async Task GetVerificationByIdAsync_WithValidId_ShouldReturnVerification()
    {
        // Arrange
        var verification = new UserVerification
        {
            UserId = _testUserId,
            Type = VerificationType.Email,
            Status = VerificationStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        _context.Set<UserVerification>().Add(verification);
        await _context.SaveChangesAsync();

        // Act
        var result = await _verificationService.GetVerificationByIdAsync(verification.Id, _testUserId);

        // Assert
        result.Should().NotBeNull();
        result!.Id.Should().Be(verification.Id);
        result.UserId.Should().Be(_testUserId);
        result.Type.Should().Be(VerificationType.Email);
    }

    [Fact]
    public async Task GetVerificationByIdAsync_WithDifferentUser_ShouldReturnNull()
    {
        // Arrange
        var verification = new UserVerification
        {
            UserId = _testUserId,
            Type = VerificationType.Email,
            Status = VerificationStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };
        _context.Set<UserVerification>().Add(verification);
        await _context.SaveChangesAsync();

        // Act
        var result = await _verificationService.GetVerificationByIdAsync(verification.Id, "different-user");

        // Assert
        result.Should().BeNull();
    }

    [Fact]
    public async Task CanRequestVerificationAsync_WithinRateLimit_ShouldReturnTrue()
    {
        // Act
        var result = await _verificationService.CanRequestVerificationAsync(_testUserId, VerificationType.Email);

        // Assert
        result.Should().BeTrue();
    }

    [Fact]
    public async Task CanRequestVerificationAsync_ExceedingRateLimit_ShouldReturnFalse()
    {
        // Arrange - Create 3 recent attempts (rate limit is 3 per 5 minutes)
        var recentAttempts = Enumerable.Range(0, 3).Select(_ => new UserVerification
        {
            UserId = _testUserId,
            Type = VerificationType.Email,
            Status = VerificationStatus.Pending,
            LastAttemptAt = DateTime.UtcNow.AddMinutes(-2),
            CreatedAt = DateTime.UtcNow.AddMinutes(-2)
        }).ToList();

        _context.Set<UserVerification>().AddRange(recentAttempts);
        await _context.SaveChangesAsync();

        // Act
        var result = await _verificationService.CanRequestVerificationAsync(_testUserId, VerificationType.Email);

        // Assert
        result.Should().BeFalse();
    }

    [Fact]
    public async Task CanRequestVerificationAsync_WithOldAttempts_ShouldReturnTrue()
    {
        // Arrange - Create old attempts (outside 5-minute window)
        var oldAttempts = Enumerable.Range(0, 3).Select(_ => new UserVerification
        {
            UserId = _testUserId,
            Type = VerificationType.Email,
            Status = VerificationStatus.Pending,
            LastAttemptAt = DateTime.UtcNow.AddMinutes(-10), // Outside rate limit window
            CreatedAt = DateTime.UtcNow.AddMinutes(-10)
        }).ToList();

        _context.Set<UserVerification>().AddRange(oldAttempts);
        await _context.SaveChangesAsync();

        // Act
        var result = await _verificationService.CanRequestVerificationAsync(_testUserId, VerificationType.Email);

        // Assert
        result.Should().BeTrue();
    }

    // Helper methods
    private IFormFile CreateMockFormFile(string fileName)
    {
        var fileMock = new Mock<IFormFile>();
        var content = "Fake file content";
        var ms = new MemoryStream();
        var writer = new StreamWriter(ms);
        writer.Write(content);
        writer.Flush();
        ms.Position = 0;

        fileMock.Setup(_ => _.OpenReadStream()).Returns(ms);
        fileMock.Setup(_ => _.FileName).Returns(fileName);
        fileMock.Setup(_ => _.Length).Returns(ms.Length);

        return fileMock.Object;
    }

    private string HashCode(string code)
    {
        using var sha256 = System.Security.Cryptography.SHA256.Create();
        var bytes = System.Text.Encoding.UTF8.GetBytes(code);
        var hash = sha256.ComputeHash(bytes);
        return Convert.ToBase64String(hash);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}