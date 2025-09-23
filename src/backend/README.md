# 🔧 Backend - Arayanibul API

.NET 9 ile geliştirilmiş katmanlı mimari backend uygulaması.

## 🏗️ Katmanlı Mimari

```
📁 backend/
├── 📁 Arayanibul.API/         # Web API katmanı (Controllers, Program.cs)
├── 📁 Arayanibul.Business/    # İş mantığı katmanı (Services)
├── 📁 Arayanibul.Data/        # Veri erişim katmanı (DbContext, Repositories)
└── 📁 Arayanibul.Core/        # Ortak katman (Entities, DTOs, Interfaces)
```

## 🚀 Kurulum

### Gereksinimler
- .NET 9 SDK
- Entity Framework CLI tools

### Kurulum Adımları

1. **Proje dizinine gidin:**
   ```bash
   cd src/backend/Arayanibul.API
   ```

2. **Bağımlılıkları yükleyin:**
   ```bash
   dotnet restore
   ```

3. **Veritabanı migration'larını oluşturun:**
   ```bash
   dotnet ef migrations add InitialCreate
   dotnet ef database update
   ```

4. **Uygulamayı çalıştırın:**
   ```bash
   dotnet run
   ```

## 🔗 API Endpoints

- **Base URL**: http://localhost:5000
- **Swagger UI**: http://localhost:5000/swagger

### Authentication Endpoints
- `POST /api/auth/register` - Email/şifre ile kayıt
- `POST /api/auth/login` - Email/şifre ile giriş
- `POST /api/auth/social-login` - Sosyal medya ile giriş
- `POST /api/auth/guest-login` - Misafir girişi
- `GET /api/auth/me` - Mevcut kullanıcı bilgileri

## ⚙️ Konfigürasyon

### JWT Settings
`appsettings.json` dosyasında JWT ayarlarını yapılandırın:

```json
{
  "JwtSettings": {
    "Secret": "YourSuperSecretKeyThatIsAtLeast32CharactersLong!",
    "Issuer": "Arayanibul.API",
    "Audience": "Arayanibul.Client",
    "ExpiryInDays": 7
  }
}
```

### OAuth Providers
Google ve Facebook OAuth ayarları için:

```json
{
  "Authentication": {
    "Google": {
      "ClientId": "your-google-client-id",
      "ClientSecret": "your-google-client-secret"
    },
    "Facebook": {
      "AppId": "your-facebook-app-id",
      "AppSecret": "your-facebook-app-secret"
    }
  }
}
```

## 🛠️ Teknolojiler

- **Framework**: ASP.NET Core 9.0
- **ORM**: Entity Framework Core
- **Database**: SQLite (geliştirme), PostgreSQL (production önerisi)
- **Authentication**: JWT + ASP.NET Core Identity
- **OAuth**: Google, Facebook
- **Documentation**: Swagger/OpenAPI

## 📝 Notlar

- Geliştirme ortamında SQLite kullanılır
- Production için PostgreSQL önerilir
- JWT token'ları 7 gün geçerlidir
- Sosyal medya girişi için OAuth provider konfigürasyonu gereklidir