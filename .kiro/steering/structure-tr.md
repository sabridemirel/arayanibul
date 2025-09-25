# Proje Yapısı

## Kök Seviye
```
Arayanibul/
├── src/                    # Kaynak kod
├── docs/                   # Proje dokümantasyonu
├── .kiro/                  # Kiro konfigürasyonu ve yönlendirme
├── start.sh               # Hızlı başlangıç scripti
└── README.md              # Ana proje dokümantasyonu
```

## Backend Yapısı (src/backend/)
```
backend/
└── API/                   # Web API projesi (mevcut monolit)
    ├── Controllers/       # API controller'ları
    ├── Data/             # DbContext ve veri erişimi
    ├── Models/           # DTO'lar ve domain modelleri
    ├── Services/         # İş mantığı servisleri
    ├── Migrations/       # EF Core migration'ları
    ├── Program.cs        # Uygulama giriş noktası
    ├── appsettings.json  # Konfigürasyon
    └── app.db           # SQLite veritabanı dosyası
```

### Backend Mimari Deseni
- **Katmanlı Mimari**: Controllers → Services → Data Access
- **Dependency Injection**: Servisler Program.cs'de kayıtlı
- **Repository Pattern**: Gelecekte implementasyon planlanıyor
- **DTO Pattern**: API request/response için ayrı modeller

## Mobile Yapısı (src/mobile/)
```
mobile/
├── screens/              # Uygulama ekranları/sayfaları
├── components/           # Yeniden kullanılabilir UI bileşenleri
├── services/            # API istemcileri ve harici servisler
├── hooks/               # Özel React hook'ları
├── navigation/          # Navigasyon konfigürasyonu
├── types/               # TypeScript tip tanımları
├── utils/               # Yardımcı fonksiyonlar ve araçlar
├── assets/              # Resimler, fontlar, ikonlar
├── data/                # Mock data ve sabitler
├── App.tsx              # Kök uygulama bileşeni
└── package.json         # Bağımlılıklar ve scriptler
```

### Mobile Mimari Deseni
- **Bileşen Tabanlı**: Hook'lar ile fonksiyonel bileşenler
- **Ekran-Servis Deseni**: Ekranlar veri için servisleri kullanır
- **Durum için Context**: Kimlik doğrulama durumu React Context ile yönetilir
- **Navigasyon Stack**: Ekran geçişleri için stack navigator

## İsimlendirme Kuralları

### Backend (C#)
- **Controllers**: `AuthController.cs`, `HomeController.cs`
- **Services**: `AuthService.cs`, `UserService.cs`
- **Models**: `ApplicationUser.cs`, `AuthDTOs.cs`
- **Methods**: PascalCase (`RegisterAsync`, `LoginAsync`)

### Mobile (TypeScript/React)
- **Screens**: `LoginScreen.tsx`, `HomeScreen.tsx`
- **Components**: `ThemedText.tsx`, `HapticTab.tsx`
- **Services**: `authService.ts`, `api.ts`
- **Functions**: camelCase (`checkAuthStatus`, `handleLogin`)

## Dosya Organizasyon Kuralları
- İlgili işlevselliği özel klasörlerde grupla
- Bileşenleri küçük tut ve tek sorumluluk odaklı yap
- Paylaşılan araçları özel utils klasörlerine yerleştir
- İş mantığını UI bileşenlerinden ayır
- Temiz import'lar için gerektiğinde index dosyaları kullan

## Gelecek Mimari Notları
- Backend monolitten mikroservislere evrilecek şekilde planlanıyor
- Mobile karmaşıklık arttıkça state management kütüphanesi (Redux/Zustand) eklenebilir
- Veritabanı üretim için SQLite'dan PostgreSQL'e geçirilecek