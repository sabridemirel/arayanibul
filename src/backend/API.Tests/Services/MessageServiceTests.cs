using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Identity;
using Moq;
using FluentAssertions;
using API.Services;
using API.Models;
using API.Data;
using API.Interfaces;

namespace API.Tests.Services;

public class MessageServiceTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<INotificationService> _notificationServiceMock;
    private readonly Mock<Microsoft.AspNetCore.SignalR.IHubContext<API.Hubs.ChatHub>> _hubContextMock;
    private readonly MessageService _messageService;

    public MessageServiceTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);

        // Setup mocks
        _notificationServiceMock = new Mock<INotificationService>();
        _hubContextMock = new Mock<Microsoft.AspNetCore.SignalR.IHubContext<API.Hubs.ChatHub>>();

        _messageService = new MessageService(_context, _notificationServiceMock.Object, _hubContextMock.Object);

        // Seed test data
        SeedTestData();
    }

    private void SeedTestData()
    {
        var category = new Category
        {
            Id = 1,
            Name = "Electronics",
            NameTr = "Elektronik",
            IsActive = true
        };

        var buyer = new ApplicationUser
        {
            Id = "buyer-id",
            Email = "buyer@example.com",
            FirstName = "Buyer",
            LastName = "User"
        };

        var provider = new ApplicationUser
        {
            Id = "provider-id",
            Email = "provider@example.com",
            FirstName = "Provider",
            LastName = "User"
        };

        var need = new Need
        {
            Id = 1,
            Title = "iPhone 13 Pro arıyorum",
            Description = "Temiz durumda iPhone 13 Pro arıyorum",
            CategoryId = 1,
            UserId = "buyer-id",
            Status = NeedStatus.Active,
            CreatedAt = DateTime.UtcNow
        };

        var offer = new Offer
        {
            Id = 1,
            NeedId = 1,
            ProviderId = "provider-id",
            Price = 22000,
            Description = "Sıfır kutusunda iPhone 13 Pro",
            DeliveryDays = 1,
            Status = OfferStatus.Pending,
            CreatedAt = DateTime.UtcNow
        };

        _context.Categories.Add(category);
        _context.Users.AddRange(buyer, provider);
        _context.Needs.Add(need);
        _context.Offers.Add(offer);
        _context.SaveChanges();
    }

    [Fact]
    public async Task SendMessageAsync_WithValidData_ShouldCreateMessage()
    {
        // Arrange
        var request = new SendMessageRequest
        {
            OfferId = 1,
            Content = "Merhaba, ürün hala mevcut mu?",
            Type = MessageType.Text
        };

        var senderId = "buyer-id";

        // Act
        var result = await _messageService.SendMessageAsync(request, senderId);

        // Assert
        result.Should().NotBeNull();
        result.Content.Should().Be(request.Content);
        result.Type.Should().Be(request.Type);
        result.SenderId.Should().Be(senderId);
        result.IsRead.Should().BeFalse();

        var messageInDb = await _context.Messages.FirstOrDefaultAsync(m => m.Content == request.Content);
        messageInDb.Should().NotBeNull();

        // Verify notification was sent
        _notificationServiceMock.Verify(
            x => x.NotifyNewMessageAsync(It.IsAny<string>(), result.Id),
            Times.Once);
    }

    [Fact]
    public async Task GetConversationAsync_ShouldReturnMessagesForOffer()
    {
        // Arrange
        var messages = new[]
        {
            new Message
            {
                OfferId = 1,
                SenderId = "buyer-id",
                Content = "İlk mesaj",
                Type = MessageType.Text,
                IsRead = false,
                CreatedAt = DateTime.UtcNow.AddMinutes(-10)
            },
            new Message
            {
                OfferId = 1,
                SenderId = "provider-id",
                Content = "Cevap mesajı",
                Type = MessageType.Text,
                IsRead = false,
                CreatedAt = DateTime.UtcNow.AddMinutes(-5)
            }
        };

        _context.Messages.AddRange(messages);
        await _context.SaveChangesAsync();

        // Act
        var result = await _messageService.GetConversationAsync(1, "buyer-id");

        // Assert
        result.Should().NotBeEmpty();
        result.Should().HaveCount(2);
        result.Should().BeInAscendingOrder(m => m.CreatedAt);
        result.First().Content.Should().Be("İlk mesaj");
        result.Last().Content.Should().Be("Cevap mesajı");
    }

    [Fact]
    public async Task MarkAsReadAsync_WithValidMessage_ShouldMarkAsRead()
    {
        // Arrange
        var message = new Message
        {
            OfferId = 1,
            SenderId = "provider-id",
            Content = "Test mesajı",
            Type = MessageType.Text,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Messages.Add(message);
        await _context.SaveChangesAsync();

        // Act
        var result = await _messageService.MarkAsReadAsync(message.Id, "buyer-id");

        // Assert
        result.Should().BeTrue();

        var updatedMessage = await _context.Messages.FindAsync(message.Id);
        updatedMessage!.IsRead.Should().BeTrue();
    }

    [Fact]
    public async Task GetUserConversationsAsync_ShouldReturnUserConversations()
    {
        // Arrange
        var message1 = new Message
        {
            OfferId = 1,
            SenderId = "buyer-id",
            Content = "Mesaj 1",
            Type = MessageType.Text,
            IsRead = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Messages.Add(message1);
        await _context.SaveChangesAsync();

        // Act
        var result = await _messageService.GetUserConversationsAsync("buyer-id");

        // Assert
        result.Should().NotBeEmpty();
        result.Should().HaveCount(1);
        result.First().OfferId.Should().Be(1);
        result.First().LastMessage!.Content.Should().Be("Mesaj 1");
    }

    [Fact]
    public async Task SendMessageAsync_WithImageType_ShouldCreateImageMessage()
    {
        // Arrange
        var request = new SendMessageRequest
        {
            OfferId = 1,
            Content = "Ürün fotoğrafı",
            Type = MessageType.Image,
            AttachmentUrl = "https://example.com/image.jpg"
        };

        var senderId = "provider-id";

        // Act
        var result = await _messageService.SendMessageAsync(request, senderId);

        // Assert
        result.Should().NotBeNull();
        result.Type.Should().Be(MessageType.Image);
        result.AttachmentUrl.Should().Be(request.AttachmentUrl);
    }

    [Fact]
    public async Task SendMessageAsync_WithLocationType_ShouldCreateLocationMessage()
    {
        // Arrange
        var request = new SendMessageRequest
        {
            OfferId = 1,
            Content = "Konum paylaşımı",
            Type = MessageType.Location,
            AttachmentUrl = "41.0082,28.9784"
        };

        var senderId = "buyer-id";

        // Act
        var result = await _messageService.SendMessageAsync(request, senderId);

        // Assert
        result.Should().NotBeNull();
        result.Type.Should().Be(MessageType.Location);
        result.AttachmentUrl.Should().Be(request.AttachmentUrl);
    }

    public void Dispose()
    {
        _context.Dispose();
    }
}