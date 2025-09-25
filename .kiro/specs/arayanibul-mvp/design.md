# Arayanibul MVP - Tasarım Dökümanı

## Genel Bakış

Arayanibul MVP, ters marketplace konseptini destekleyen modern bir mobil uygulama ve backend API sistemidir. Sistem, React Native/Expo frontend ve ASP.NET Core backend ile JWT tabanlı kimlik doğrulama, real-time mesajlaşma ve push notification özelliklerini içerir.

## Mimari

### Sistem Mimarisi

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   Backend API   │    │    Database     │
│ (React Native)  │◄──►│  (ASP.NET Core) │◄──►│    (SQLite)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         └─────────────►│ Push Notification│              │
                        │    Service      │              │
                        └─────────────────┘              │
                                 │                       │
                        ┌─────────────────┐              │
                        │  File Storage   │◄─────────────┘
                        │   (Local/Cloud) │
                        └─────────────────┘
```

### Katmanlı Mimari

**Frontend (Mobile)**
- Presentation Layer: Screens & Components
- Business Logic Layer: Services & Hooks
- Data Layer: API Client & Local Storage

**Backend (API)**
- Controller Layer: API Endpoints
- Service Layer: Business Logic
- Data Access Layer: Entity Framework & Repositories
- Infrastructure Layer: Authentication, Notifications, File Storage

## User Experience Design

### Guest-First Approach

#### Core UX Principles
1. **Immediate Value**: Users see content without barriers
2. **Progressive Engagement**: Authentication requested when needed
3. **Context-Aware Prompts**: Auth requests explain the benefit
4. **Seamless Transition**: Smooth flow between guest and authenticated states

#### Guest User Journey
```mermaid
graph TD
    A[App Launch] --> B[Home Screen - Guest Mode]
    B --> C{User Action}
    C -->|Browse Needs| D[Need List - Full Access]
    C -->|View Need Detail| E[Need Detail - Full Access]
    C -->|Try to Create Need| F[Auth Prompt: "Create needs to get offers"]
    C -->|Try to Make Offer| G[Auth Prompt: "Sign up to make offers"]
    C -->|Try to Message| H[Auth Prompt: "Join to start conversations"]
    
    F --> I[Registration/Login]
    G --> I
    H --> I
    I --> J[Authenticated Home]
    
    D --> K{View Count > 3}
    K -->|Yes| L[Soft Prompt: "Sign up for more features"]
    K -->|No| D
```

#### Authentication Context Design
```typescript
interface AuthContextType {
  user: User | null;
  isGuest: boolean;
  isLoading: boolean;
  
  // Authentication methods
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  googleLogin: () => Promise<void>;
  facebookLogin: () => Promise<void>;
  guestContinue: () => void; // Sets guest mode
  logout: () => Promise<void>;
  
  // Guest conversion tracking
  guestActions: GuestAction[];
  trackGuestAction: (action: GuestAction) => void;
  shouldShowAuthPrompt: () => boolean;
}

interface GuestAction {
  type: 'view_need' | 'attempt_offer' | 'attempt_create' | 'attempt_message';
  timestamp: Date;
  context?: any;
}
```

#### UI Components for Guest Experience

**Header Component (Guest Mode):**
```typescript
interface HeaderProps {
  isGuest: boolean;
  onLoginPress: () => void;
  onRegisterPress: () => void;
}

// Shows: Logo | Search | [Login] [Sign Up]
```

**Auth Prompt Modal:**
```typescript
interface AuthPromptProps {
  visible: boolean;
  context: 'create_need' | 'make_offer' | 'send_message';
  onLogin: () => void;
  onRegister: () => void;
  onDismiss: () => void;
}

// Context-specific messaging:
// - "Create needs to get offers from providers"
// - "Sign up to make offers and earn money"
// - "Join to start conversations with other users"
```

**Conversion Banners:**
```typescript
interface ConversionBannerProps {
  type: 'soft_prompt' | 'feature_highlight' | 'social_proof';
  onAuthAction: () => void;
  onDismiss: () => void;
}

// Appears after 3+ need views or periodic scroll
// Shows benefits: "Join 1000+ users finding what they need"
```

## Bileşenler ve Arayüzler

### Backend Bileşenleri

#### 1. Authentication Service
```csharp
public interface IAuthService
{
    Task<AuthResult> RegisterAsync(RegisterRequest request);
    Task<AuthResult> LoginAsync(LoginRequest request);
    Task<AuthResult> GoogleLoginAsync(string googleToken);
    Task<AuthResult> FacebookLoginAsync(string facebookToken);
    Task<AuthResult> GuestLoginAsync(); // New: Creates temporary guest session
    Task<bool> RefreshTokenAsync(string refreshToken);
    Task<bool> LogoutAsync(string userId);
    Task<AuthResult> ConvertGuestToUserAsync(string guestId, RegisterRequest request); // New: Convert guest to full user
}

public class AuthResult
{
    public bool Success { get; set; }
    public string Token { get; set; }
    public string RefreshToken { get; set; }
    public User User { get; set; }
    public bool IsGuest { get; set; } // New: Indicates guest session
    public string Message { get; set; }
}
```

#### 2. Need Service (İhtiyaç Servisi)
```csharp
public interface INeedService
{
    Task<Need> CreateNeedAsync(CreateNeedRequest request, string userId);
    Task<List<Need>> GetNeedsAsync(NeedFilterRequest filter);
    Task<Need> GetNeedByIdAsync(int needId);
    Task<bool> UpdateNeedAsync(int needId, UpdateNeedRequest request, string userId);
    Task<bool> DeleteNeedAsync(int needId, string userId);
    Task<List<Need>> GetUserNeedsAsync(string userId, NeedStatus? status);
}
```

#### 3. Offer Service (Teklif Servisi)
```csharp
public interface IOfferService
{
    Task<Offer> CreateOfferAsync(CreateOfferRequest request, string providerId);
    Task<List<Offer>> GetOffersForNeedAsync(int needId);
    Task<List<Offer>> GetProviderOffersAsync(string providerId);
    Task<bool> AcceptOfferAsync(int offerId, string buyerId);
    Task<bool> RejectOfferAsync(int offerId, string buyerId);
    Task<Offer> UpdateOfferAsync(int offerId, UpdateOfferRequest request, string providerId);
}
```

#### 4. Message Service
```csharp
public interface IMessageService
{
    Task<Message> SendMessageAsync(SendMessageRequest request, string senderId);
    Task<List<Message>> GetConversationAsync(int offerId, string userId);
    Task<List<Conversation>> GetUserConversationsAsync(string userId);
    Task<bool> MarkAsReadAsync(int messageId, string userId);
}
```

#### 5. Notification Service
```csharp
public interface INotificationService
{
    Task SendPushNotificationAsync(string userId, string title, string body, object data);
    Task NotifyNewOfferAsync(string buyerId, int needId, int offerId);
    Task NotifyOfferAcceptedAsync(string providerId, int offerId);
    Task NotifyNewMessageAsync(string recipientId, int messageId);
    Task<List<Notification>> GetUserNotificationsAsync(string userId);
}
```

### Frontend Bileşenleri

#### 1. Authentication Context
```typescript
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  googleLogin: () => Promise<void>;
  facebookLogin: () => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}
```

#### 2. API Service
```typescript
interface ApiService {
  // Auth endpoints
  login(credentials: LoginRequest): Promise<AuthResponse>;
  register(userData: RegisterRequest): Promise<AuthResponse>;
  
  // Need endpoints
  createNeed(needData: CreateNeedRequest): Promise<Need>;
  getNeeds(filters: NeedFilters): Promise<Need[]>;
  getNeedById(id: number): Promise<Need>;
  
  // Offer endpoints
  createOffer(offerData: CreateOfferRequest): Promise<Offer>;
  getOffersForNeed(needId: number): Promise<Offer[]>;
  acceptOffer(offerId: number): Promise<void>;
  
  // Message endpoints
  sendMessage(messageData: SendMessageRequest): Promise<Message>;
  getConversation(offerId: number): Promise<Message[]>;
}
```

#### 3. Navigation Structure

**Guest-First Navigation Design:**
```typescript
type RootStackParamList = {
  // Main app always accessible
  Home: undefined;
  Search: undefined;
  NeedDetail: { needId: number };
  
  // Auth screens (modal/overlay style)
  Login: undefined;
  Register: undefined;
  
  // Authenticated-only screens
  CreateNeed: undefined;
  CreateOffer: { needId: number };
  MyNeeds: undefined;
  MyOffers: undefined;
  Messages: undefined;
  Chat: { offerId: number };
  Profile: { userId?: string };
};

// Navigation flow design
type NavigationFlow = {
  // Guest users can access
  guestAccessible: ['Home', 'Search', 'NeedDetail'];
  
  // Requires authentication with redirect
  authRequired: ['CreateNeed', 'CreateOffer', 'MyNeeds', 'MyOffers', 'Messages', 'Chat'];
  
  // Auth screens (presented as modals)
  authScreens: ['Login', 'Register'];
};
```

**Navigation Behavior:**
- App always starts with Home screen (guest mode)
- Auth buttons in header for guest users
- Protected actions show auth prompt with context
- Seamless transition between guest and authenticated states

## Veri Modelleri

### Core Entities

#### User Model
```csharp
public class ApplicationUser : IdentityUser
{
    public string FirstName { get; set; }
    public string LastName { get; set; }
    public string? ProfileImageUrl { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Address { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public UserType UserType { get; set; } // Buyer, Provider, Both
    public double Rating { get; set; }
    public int ReviewCount { get; set; }
    
    // Navigation Properties
    public List<Need> Needs { get; set; }
    public List<Offer> Offers { get; set; }
    public List<Review> GivenReviews { get; set; }
    public List<Review> ReceivedReviews { get; set; }
}
```

#### Need Model
```csharp
public class Need
{
    public int Id { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public int CategoryId { get; set; }
    public decimal? MinBudget { get; set; }
    public decimal? MaxBudget { get; set; }
    public string Currency { get; set; } = "TRY";
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Address { get; set; }
    public UrgencyLevel Urgency { get; set; }
    public NeedStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string UserId { get; set; }
    
    // Navigation Properties
    public ApplicationUser User { get; set; }
    public Category Category { get; set; }
    public List<NeedImage> Images { get; set; }
    public List<Offer> Offers { get; set; }
}
```

#### Offer Model
```csharp
public class Offer
{
    public int Id { get; set; }
    public int NeedId { get; set; }
    public string ProviderId { get; set; }
    public decimal Price { get; set; }
    public string Currency { get; set; } = "TRY";
    public string Description { get; set; }
    public int DeliveryDays { get; set; }
    public OfferStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Navigation Properties
    public Need Need { get; set; }
    public ApplicationUser Provider { get; set; }
    public List<OfferImage> Images { get; set; }
    public List<Message> Messages { get; set; }
}
```

#### Message Model
```csharp
public class Message
{
    public int Id { get; set; }
    public int OfferId { get; set; }
    public string SenderId { get; set; }
    public string Content { get; set; }
    public MessageType Type { get; set; } // Text, Image, Location
    public string? AttachmentUrl { get; set; }
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
    
    // Navigation Properties
    public Offer Offer { get; set; }
    public ApplicationUser Sender { get; set; }
}
```

#### Category Model
```csharp
public class Category
{
    public int Id { get; set; }
    public string Name { get; set; }
    public string NameTr { get; set; }
    public string? Description { get; set; }
    public string? IconUrl { get; set; }
    public int? ParentCategoryId { get; set; }
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
    
    // Navigation Properties
    public Category? ParentCategory { get; set; }
    public List<Category> SubCategories { get; set; }
    public List<Need> Needs { get; set; }
}
```

### Enums

```csharp
public enum UserType
{
    Buyer = 1,
    Provider = 2,
    Both = 3
}

public enum NeedStatus
{
    Active = 1,
    InProgress = 2,
    Completed = 3,
    Cancelled = 4,
    Expired = 5
}

public enum OfferStatus
{
    Pending = 1,
    Accepted = 2,
    Rejected = 3,
    Withdrawn = 4
}

public enum UrgencyLevel
{
    Flexible = 1,
    Normal = 2,
    Urgent = 3
}

public enum MessageType
{
    Text = 1,
    Image = 2,
    Location = 3
}
```

## Hata Yönetimi

### Backend Error Handling

#### Global Exception Middleware
```csharp
public class GlobalExceptionMiddleware
{
    public async Task InvokeAsync(HttpContext context, RequestDelegate next)
    {
        try
        {
            await next(context);
        }
        catch (ValidationException ex)
        {
            await HandleValidationExceptionAsync(context, ex);
        }
        catch (UnauthorizedException ex)
        {
            await HandleUnauthorizedExceptionAsync(context, ex);
        }
        catch (NotFoundException ex)
        {
            await HandleNotFoundExceptionAsync(context, ex);
        }
        catch (Exception ex)
        {
            await HandleGenericExceptionAsync(context, ex);
        }
    }
}
```

#### Custom Exceptions
```csharp
public class ValidationException : Exception
{
    public Dictionary<string, string[]> Errors { get; }
    public ValidationException(Dictionary<string, string[]> errors) : base("Validation failed")
    {
        Errors = errors;
    }
}

public class UnauthorizedException : Exception
{
    public UnauthorizedException(string message) : base(message) { }
}

public class NotFoundException : Exception
{
    public NotFoundException(string message) : base(message) { }
}
```

### Frontend Error Handling

#### Error Context
```typescript
interface ErrorContextType {
  error: string | null;
  showError: (message: string) => void;
  clearError: () => void;
}

// Error boundaries for React components
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }
}
```

#### API Error Handling
```typescript
const handleApiError = (error: any): string => {
  if (error.response?.status === 401) {
    return 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.';
  } else if (error.response?.status === 403) {
    return 'Bu işlem için yetkiniz bulunmuyor.';
  } else if (error.response?.status === 404) {
    return 'Aradığınız içerik bulunamadı.';
  } else if (error.response?.status >= 500) {
    return 'Sunucu hatası oluştu. Lütfen daha sonra tekrar deneyin.';
  } else {
    return error.response?.data?.message || 'Beklenmeyen bir hata oluştu.';
  }
};
```

## Test Stratejisi

### Backend Testing

#### Unit Tests
- Service layer testleri (AuthService, NeedService, OfferService)
- Repository pattern testleri
- Validation logic testleri
- Business rule testleri

#### Integration Tests
- API endpoint testleri
- Database integration testleri
- Authentication flow testleri
- File upload testleri

#### Test Configuration
```csharp
public class TestStartup : Startup
{
    public TestStartup(IConfiguration configuration) : base(configuration) { }
    
    public override void ConfigureServices(IServiceCollection services)
    {
        base.ConfigureServices(services);
        
        // Replace real services with test doubles
        services.Replace(ServiceDescriptor.Scoped<INotificationService, MockNotificationService>());
        services.Replace(ServiceDescriptor.Scoped<IFileStorageService, MockFileStorageService>());
    }
}
```

### Frontend Testing

#### Unit Tests
- Component rendering testleri
- Hook functionality testleri
- Utility function testleri
- Service layer testleri

#### Integration Tests
- Screen navigation testleri
- API integration testleri
- Authentication flow testleri
- Form submission testleri

#### E2E Tests
- User registration ve login flow
- Need creation ve offer flow
- Messaging functionality
- Push notification handling

#### Test Setup
```typescript
// Jest configuration
export default {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/src/test/setup.ts'],
  testMatch: ['**/__tests__/**/*.(test|spec).(ts|tsx|js)'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/test/**/*',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

## Güvenlik Considerations

### Authentication & Authorization
- JWT token expiration (15 dakika access, 7 gün refresh)
- Role-based authorization
- OAuth integration güvenliği
- Password hashing (bcrypt)

### Data Protection
- Input validation ve sanitization
- SQL injection koruması (EF Core parametrized queries)
- XSS koruması
- File upload güvenliği (tip kontrolü, boyut limiti)

### API Security
- Rate limiting
- CORS configuration
- HTTPS enforcement
- Request size limiting

### Mobile Security
- Secure storage (Keychain/Keystore)
- Certificate pinning
- Biometric authentication support
- App transport security

## Performance Optimizations

### Backend Optimizations
- Database indexing strategy
- Query optimization (EF Core)
- Caching strategy (Redis)
- Background job processing (Hangfire)

### Frontend Optimizations
- Image lazy loading
- Virtual scrolling for lists
- Component memoization
- Bundle size optimization

### Database Optimizations
```sql
-- Indexes for common queries
CREATE INDEX IX_Needs_CategoryId_Status_CreatedAt ON Needs (CategoryId, Status, CreatedAt DESC);
CREATE INDEX IX_Needs_Location ON Needs (Latitude, Longitude) WHERE Latitude IS NOT NULL;
CREATE INDEX IX_Offers_NeedId_Status ON Offers (NeedId, Status);
CREATE INDEX IX_Messages_OfferId_CreatedAt ON Messages (OfferId, CreatedAt);
```