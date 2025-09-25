using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using API.Data;
using API.Models;

namespace API.Tests.Integration;

public class AuthControllerIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;

    public AuthControllerIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.UseSetting("ASPNETCORE_ENVIRONMENT", "Testing");
            builder.ConfigureServices(TestStartup.ConfigureTestServices);
        });

        _client = _factory.CreateClient();
    }

    [Fact]
    public async Task Register_WithValidData_ShouldReturnSuccessResponse()
    {
        // Arrange
        var registerDto = new RegisterDto
        {
            Email = "test@example.com",
            Password = "Test123!",
            FirstName = "Test",
            LastName = "User"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/register", registerDto);

        // Assert
        response.Should().BeSuccessful();
        
        var content = await response.Content.ReadAsStringAsync();
        var authResponse = JsonSerializer.Deserialize<AuthResponseDto>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        authResponse.Should().NotBeNull();
        authResponse!.Success.Should().BeTrue();
        authResponse.Token.Should().NotBeNullOrEmpty();
        authResponse.User.Should().NotBeNull();
        authResponse.User!.Email.Should().Be(registerDto.Email);
    }

    [Fact]
    public async Task Register_WithExistingEmail_ShouldReturnBadRequest()
    {
        // Arrange
        var registerDto = new RegisterDto
        {
            Email = "existing@example.com",
            Password = "Test123!",
            FirstName = "Test",
            LastName = "User"
        };

        // First registration
        await _client.PostAsJsonAsync("/api/auth/register", registerDto);

        // Act - Second registration with same email
        var response = await _client.PostAsJsonAsync("/api/auth/register", registerDto);

        // Assert
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Login_WithValidCredentials_ShouldReturnSuccessResponse()
    {
        // Arrange - First register a user
        var registerDto = new RegisterDto
        {
            Email = "login@example.com",
            Password = "Test123!",
            FirstName = "Login",
            LastName = "User"
        };
        await _client.PostAsJsonAsync("/api/auth/register", registerDto);

        var loginDto = new LoginDto
        {
            Email = registerDto.Email,
            Password = registerDto.Password
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", loginDto);

        // Assert
        response.Should().BeSuccessful();
        
        var content = await response.Content.ReadAsStringAsync();
        var authResponse = JsonSerializer.Deserialize<AuthResponseDto>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        authResponse.Should().NotBeNull();
        authResponse!.Success.Should().BeTrue();
        authResponse.Token.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task Login_WithInvalidCredentials_ShouldReturnUnauthorized()
    {
        // Arrange
        var loginDto = new LoginDto
        {
            Email = "nonexistent@example.com",
            Password = "WrongPassword"
        };

        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/login", loginDto);

        // Assert
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GuestLogin_ShouldReturnSuccessResponse()
    {
        // Act
        var response = await _client.PostAsync("/api/auth/guest-login", null);

        // Assert
        response.Should().BeSuccessful();
        
        var content = await response.Content.ReadAsStringAsync();
        var authResponse = JsonSerializer.Deserialize<AuthResponseDto>(content, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        });

        authResponse.Should().NotBeNull();
        authResponse!.Success.Should().BeTrue();
        authResponse.Token.Should().NotBeNullOrEmpty();
        authResponse.User.Should().NotBeNull();
        authResponse.User!.IsGuest.Should().BeTrue();
    }
}