# Arayanibul MVP - Implementation Plan

- [x] 1. Backend Core Infrastructure Setup
  - Proje yapısını oluştur ve temel konfigürasyonları yap
  - Entity Framework Core ve Identity konfigürasyonunu tamamla
  - JWT authentication middleware'ini kur
  - Global exception handling middleware'ini implement et
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Database Models ve Migrations
- [x] 2.1 Core entity modellerini oluştur
  - ApplicationUser, Need, Offer, Message, Category modellerini implement et
  - Entity relationships ve navigation properties'leri tanımla
  - Enum types'ları oluştur (UserType, NeedStatus, OfferStatus, UrgencyLevel, MessageType)
  - _Requirements: 1.6, 2.1, 2.2, 4.1, 6.1_

- [x] 2.2 Database migrations oluştur
  - Initial migration'ı oluştur ve veritabanı şemasını kur
  - Seed data için kategori verilerini ekle
  - Database indexes'leri performance için optimize et
  - _Requirements: 7.1, 7.2_

- [x] 3. Authentication System Implementation
- [x] 3.1 JWT Authentication Service implement et
  - IAuthService interface'ini ve AuthService class'ını oluştur
  - Register, Login, RefreshToken metodlarını implement et
  - Password hashing ve validation logic'ini ekle
  - _Requirements: 1.1, 1.2_

- [x] 3.2 OAuth Integration (Google & Facebook)
  - Google OAuth authentication'ı implement et
  - Facebook OAuth authentication'ı implement et
  - External login provider'ları için user creation logic'ini ekle
  - _Requirements: 1.3, 1.4_

- [x] 3.3 Authentication Controller oluştur
  - AuthController'ı implement et
  - Register, Login, GoogleLogin, FacebookLogin endpoints'lerini oluştur
  - JWT token generation ve refresh endpoints'lerini ekle
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 4. User Profile Management
- [x] 4.1 User Service ve Controller implement et
  - IUserService interface'ini ve UserService class'ını oluştur
  - Profile update, get profile, upload profile image metodlarını implement et
  - UserController'ı oluştur ve profile management endpoints'lerini ekle
  - _Requirements: 1.6, 9.4, 9.5_

- [x] 4.2 File Upload Service implement et
  - IFileStorageService interface'ini oluştur
  - Local file storage implementation'ını yap
  - Image resize ve validation logic'ini ekle
  - _Requirements: 2.3, 4.5, 9.5_

- [x] 5. Category System Implementation
- [x] 5.1 Category Service ve Controller oluştur
  - ICategoryService interface'ini ve CategoryService class'ını implement et
  - Get categories, get subcategories metodlarını oluştur
  - CategoryController'ı implement et
  - _Requirements: 7.1, 7.2_

- [x] 5.2 Category seed data oluştur
  - Ana kategorileri (Elektronik, Ev & Yaşam, Hizmetler, vb.) database'e ekle
  - Alt kategorileri tanımla ve hierarchical structure'ı kur
  - Kategori ikonları için placeholder'ları ekle
  - _Requirements: 7.1, 7.2_

- [x] 6. Need Management System
- [x] 6.1 Need Service implement et
  - INeedService interface'ini ve NeedService class'ını oluştur
  - CreateNeed, GetNeeds, GetNeedById, UpdateNeed, DeleteNeed metodlarını implement et
  - Need filtering ve search logic'ini ekle
  - _Requirements: 2.1, 2.2, 2.5, 2.6, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 6.2 Need Controller oluştur
  - NeedController'ı implement et
  - CRUD endpoints'lerini oluştur
  - Search ve filter endpoints'lerini ekle
  - Image upload için need images endpoints'lerini implement et
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 6.3 Need filtering ve search logic
  - Location-based filtering implement et (koordinat ve mesafe hesaplama)
  - Category, price range, date range filtering'i ekle
  - Text search functionality'sini implement et
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 7.3, 7.4, 7.5, 10.1, 10.2_

- [x] 7. Offer Management System
- [x] 7.1 Offer Service implement et
  - IOfferService interface'ini ve OfferService class'ını oluştur
  - CreateOffer, GetOffersForNeed, AcceptOffer, RejectOffer metodlarını implement et
  - Offer status management logic'ini ekle
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.6, 5.1, 5.2, 5.5, 5.6_

- [x] 7.2 Offer Controller oluştur
  - OfferController'ı implement et
  - Create offer, get offers, accept/reject offer endpoints'lerini oluştur
  - Offer image upload endpoints'lerini implement et
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 7.3 Offer notification logic
  - Yeni teklif geldiğinde alıcıya notification gönderme logic'ini implement et
  - Teklif kabul/red edildiğinde sağlayıcıya notification gönderme
  - _Requirements: 8.1, 8.2_

- [x] 8. Messaging System Implementation
- [x] 8.1 Message Service implement et
  - IMessageService interface'ini ve MessageService class'ını oluştur
  - SendMessage, GetConversation, GetUserConversations metodlarını implement et
  - Message read status tracking'i ekle
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8.2 Message Controller ve real-time messaging
  - MessageController'ı implement et
  - SignalR hub'ını kur real-time messaging için
  - Message endpoints'lerini oluştur
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 8.3 Message notification system
  - Yeni mesaj geldiğinde push notification gönderme
  - Message read/unread status management
  - _Requirements: 6.2, 8.3_

- [x] 9. Push Notification System
- [x] 9.1 Notification Service implement et
  - INotificationService interface'ini ve NotificationService class'ını oluştur
  - Firebase Cloud Messaging integration'ı yap
  - Push notification templates'lerini oluştur
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 9.2 Notification Controller ve settings
  - NotificationController'ı implement et
  - User notification preferences management
  - Notification history endpoints'lerini oluştur
  - _Requirements: 8.5, 8.6_

- [x] 10. Review ve Rating System
- [x] 10.1 Review Service implement et
  - IReviewService interface'ini ve ReviewService class'ını oluştur
  - Create review, get reviews, calculate ratings metodlarını implement et
  - Review moderation logic'ini ekle
  - _Requirements: 9.1, 9.2, 9.3, 9.6_

- [x] 10.2 Review Controller oluştur
  - ReviewController'ı implement et
  - Review CRUD endpoints'lerini oluştur
  - User rating calculation ve profile update logic'ini ekle
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 11. Search ve Discovery Features
- [x] 11.1 Advanced search implementation
  - Full-text search functionality'sini implement et
  - Search result ranking algorithm'ını oluştur
  - Search history tracking'i ekle
  - _Requirements: 10.1, 10.2, 10.6_

- [x] 11.2 Recommendation system
  - User behavior based recommendation logic'ini implement et
  - Popular needs tracking ve display
  - Location-based recommendations
  - _Requirements: 10.3, 10.4, 10.5_

- [x] 12. Mobile App Core Setup
- [x] 12.1 React Native proje yapısını kur
  - Navigation structure'ını oluştur (Stack ve Tab navigators)
  - Authentication context ve provider'ını implement et
  - API service client'ını oluştur
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 12.2 Theme ve UI components
  - App theme'ini oluştur (colors, typography, spacing)
  - Reusable UI components'leri implement et (Button, Input, Card, etc.)
  - Loading states ve error handling components'leri
  - _Requirements: Tüm UI requirements için temel_

- [x] 13. Authentication Screens
- [x] 13.1 Login ve Register screens
  - LoginScreen component'ini implement et
  - RegisterScreen component'ini implement et
  - Form validation ve error handling ekle
  - _Requirements: 1.1, 1.2_

- [x] 13.2 Social login integration
  - Google Sign-In integration'ı implement et
  - Facebook Login integration'ı implement et
  - Guest access functionality'sini ekle
  - _Requirements: 1.3, 1.4, 1.5_

- [x] 13.3 Profile management screens
  - ProfileScreen component'ini implement et
  - EditProfileScreen component'ini oluştur
  - Profile image upload functionality'sini ekle
  - _Requirements: 1.6, 9.4, 9.5_

- [x] 14. Need Management Screens
- [x] 14.1 Need listing ve detail screens
  - HomeScreen'i implement et (need listing)
  - NeedDetailScreen component'ini oluştur
  - Need filtering ve search UI'ını implement et
  - _Requirements: 2.6, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 14.2 Create need screen
  - CreateNeedScreen component'ini implement et
  - Category selection UI'ını oluştur
  - Image upload ve location selection functionality'sini ekle
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 14.3 My needs management
  - MyNeedsScreen component'ini implement et
  - Need status filtering (Active, Pending, Completed)
  - Need edit ve delete functionality'sini ekle
  - _Requirements: 2.6_

- [x] 15. Offer Management Screens
- [x] 15.1 Offer creation ve listing
  - CreateOfferScreen component'ini implement et
  - OfferListScreen'i implement et (need detail içinde)
  - Offer comparison UI'ını oluştur
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.3_

- [x] 15.2 Offer management screens
  - MyOffersScreen component'ini implement et
  - Offer status tracking UI'ını oluştur
  - Offer accept/reject functionality'sini implement et
  - _Requirements: 5.4, 5.5, 5.6_

- [x] 16. Messaging Screens
- [x] 16.1 Chat functionality
  - ChatScreen component'ini implement et
  - Message input ve display components'leri
  - Image ve location sharing functionality'sini ekle
  - _Requirements: 6.1, 6.3, 6.4, 6.5_

- [x] 16.2 Conversations listing
  - ConversationsScreen component'ini implement et
  - Unread message indicators
  - Conversation search ve filtering
  - _Requirements: 6.2, 6.3_

- [x] 17. Search ve Discovery Screens
- [x] 17.1 Search functionality
  - SearchScreen component'ini implement et
  - Advanced filtering UI'ını oluştur
  - Search history ve suggestions
  - _Requirements: 7.3, 7.4, 7.5, 7.6, 10.1, 10.2, 10.6_

- [x] 17.2 Discovery features
  - Recommendations section'ını implement et
  - Popular needs display
  - Location-based suggestions
  - _Requirements: 10.3, 10.4, 10.5_

- [x] 18. Notification System Mobile
- [x] 18.1 Push notification setup
  - Firebase Cloud Messaging integration'ı yap
  - Notification permissions ve setup
  - Background notification handling
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 18.2 Notification screens
  - NotificationsScreen component'ini implement et
  - Notification settings screen
  - In-app notification display
  - _Requirements: 8.5, 8.6_

- [x] 19. Review ve Rating Mobile
- [x] 19.1 Review functionality
  - ReviewScreen component'ini implement et
  - Rating input UI (star rating)
  - Review display components
  - _Requirements: 9.1, 9.2, 9.3_

- [x] 19.2 Profile rating display
  - User profile rating display
  - Review history screens
  - Report inappropriate content functionality
  - _Requirements: 9.1, 9.6_

- [x] 20. Testing Implementation
- [x] 20.1 Backend unit tests
  - Service layer unit tests'lerini yaz
  - Repository pattern tests
  - Authentication flow tests
  - _Requirements: Tüm backend functionality_

- [x] 20.2 Backend integration tests
  - API endpoint integration tests
  - Database integration tests
  - Authentication integration tests
  - _Requirements: Tüm API endpoints_

- [x] 20.3 Mobile unit tests
  - Component unit tests'lerini yaz
  - Hook functionality tests
  - Service layer tests
  - _Requirements: Tüm mobile components_

- [x] 20.4 E2E tests
  - User registration ve login flow tests
  - Need creation ve offer flow tests
  - Messaging functionality tests
  - _Requirements: Ana user journeys_

- [x] 21. Performance Optimization
- [x] 21.1 Backend optimizations
  - Database query optimization
  - Caching strategy implementation
  - API response optimization
  - _Requirements: Performance requirements_

- [x] 21.2 Mobile optimizations
  - Image lazy loading implementation
  - List virtualization
  - Bundle size optimization
  - _Requirements: Mobile performance_

- [x] 22. Security Hardening
- [x] 22.1 Backend security
  - Input validation strengthening
  - Rate limiting implementation
  - Security headers configuration
  - _Requirements: Security requirements_

- [x] 22.2 Mobile security
  - Secure storage implementation
  - Certificate pinning
  - Biometric authentication support
  - _Requirements: Mobile security_

- [x] 23. Final Integration ve Testing
- [x] 23.1 End-to-end integration
  - Backend ve mobile integration testing
  - Push notification end-to-end testing
  - File upload integration testing
  - _Requirements: Tüm system integration_

- [-] 23.2 User acceptance testing preparation
  - Test data preparation
  - Demo scenarios creation
  - Performance benchmarking
  - _Requirements: MVP readiness_

- [x] 24. Mobile App Integration Fixes
- [x] 24.1 Login screen activation
  - Gerçek LoginScreen ve RegisterScreen'i App.tsx'e entegre et
  - Placeholder ekranları kaldır ve navigation'ı güncelle
  - UI bileşenlerinin doğru import edildiğini doğrula
  - _Requirements: 1.1, 1.2, 13.1_

- [x] 24.2 Font loading system implementation
  - expo-font paketini projeye ekle
  - App.tsx'e font loading sistemi entegre et
  - MaterialIcons font yükleme hatalarını çöz
  - Loading screen ve splash screen sistemi kur
  - _Requirements: UI stability, 12.2_

- [ ] 25. Mobile App Testing ve Debugging
- [ ] 25.1 Login screen functionality testing
  - Email/şifre girişi test et
  - Form validation'ların çalıştığını doğrula
  - Google/Facebook login butonlarının görüntülendiğini kontrol et
  - Guest login modal'ının çalıştığını test et
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 25.2 Backend-Mobile integration testing
  - Mobile app'in backend API'ye bağlanabildiğini test et
  - Authentication flow'unun end-to-end çalıştığını doğrula
  - Error handling'in düzgün çalıştığını kontrol et
  - _Requirements: 1.1, 1.2, 12.1_

- [ ] 25.3 UI/UX polish ve bug fixes
  - Input bileşenlerinin icon'larının düzgün görüntülendiğini kontrol et
  - Loading states'lerin doğru çalıştığını test et
  - Navigation flow'larını test et (Login ↔ Register)
  - _Requirements: 12.2, 13.1_

- [ ] 26. Production Readiness
- [ ] 26.1 Environment configuration
  - Production API URL konfigürasyonu
  - Environment variables setup
  - Build configuration optimization
  - _Requirements: Deployment readiness_

- [ ] 26.2 App store preparation
  - App icons ve splash screens finalization
  - App store metadata preparation
  - Privacy policy ve terms of service links
  - _Requirements: App store submission_

- [x] 27. Guest-First User Experience Implementation
- [x] 27.1 Backend guest authentication support
  - AuthService'e GuestLoginAsync metodu ekle
  - Guest user için temporary token sistemi kur
  - ConvertGuestToUserAsync metodu implement et
  - Guest session tracking ve cleanup logic'i ekle
  - _Requirements: 1.1, 1.9, 11.7_

- [x] 27.2 Mobile navigation restructure for guest-first
  - App.tsx navigation yapısını guest-first olarak değiştir
  - Her zaman Home screen'den başlayacak şekilde ayarla
  - Auth screens'leri modal/overlay style'a çevir
  - Protected route'lar için auth prompt sistemi kur
  - _Requirements: 1.1, 1.2, 11.1, 11.2_

- [x] 27.3 AuthContext guest mode support
  - AuthContext'e guest mode desteği ekle
  - isGuest state ve guest tracking functionality'si
  - guestContinue ve convertGuestToUser metodları
  - Guest action tracking sistemi (view counts, attempt tracking)
  - _Requirements: 1.1, 1.9, 11.3, 11.4, 11.5_

- [x] 27.4 Header component with auth buttons
  - Guest mode için header component'i oluştur
  - Login ve Register butonlarını header'a ekle
  - Authenticated state'de profile/logout butonları göster
  - Responsive design ve proper styling
  - _Requirements: 1.3, 11.1, 11.2_

- [x] 27.5 Context-aware auth prompt modals
  - AuthPromptModal component'i oluştur
  - Context-specific messaging (create need, make offer, send message)
  - Modal'dan login/register'a yönlendirme
  - Dismiss functionality ve user experience
  - _Requirements: 11.2, 11.3, 11.4, 11.5_

- [x] 27.6 Guest conversion tracking and prompts
  - Guest user behavior tracking sistemi
  - Soft conversion prompts (after 3+ views)
  - Periodic conversion banners during scroll
  - Social proof ve benefit highlighting
  - Analytics için guest action logging
  - _Requirements: 11.5, 11.6, 11.7_

- [x] 27.7 HomeScreen guest experience optimization
  - HomeScreen'i guest kullanıcılar için optimize et
  - Auth butonlarını header'a entegre et
  - Guest kullanıcılar için CTA'ları ekle
  - Need detail'a erişim sağla ancak interaction'lar için auth iste
  - _Requirements: 1.1, 1.2, 11.1, 11.2_

- [x] 27.8 Protected actions with auth prompts
  - CreateNeed, CreateOffer, Message gibi protected action'lar
  - Her protected action için context-aware auth prompt
  - Auth sonrası intended action'a redirect
  - Seamless user experience için state management
  - _Requirements: 11.2, 11.3, 11.4, 11.5_