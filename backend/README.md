# Backend - .NET Core Web API

## Kurulum

1. .NET 8 SDK'nın yüklü olduğundan emin olun
2. Proje dizinine gidin:
   ```bash
   cd backend/MobileApp.API
   ```

3. NuGet paketlerini yükleyin:
   ```bash
   dotnet restore
   ```

4. Veritabanı migration'larını oluşturun:
   ```bash
   dotnet ef migrations add InitialCreate
   dotnet ef database update
   ```

5. Uygulamayı çalıştırın:
   ```bash
   dotnet run
   ```

## Konfigürasyon

### Google OAuth
1. Google Cloud Console'da yeni bir proje oluşturun
2. OAuth 2.0 Client ID oluşturun
3. `appsettings.json` dosyasında Google ClientId ve ClientSecret'ı güncelleyin

### Facebook OAuth
1. Facebook Developers'da yeni bir uygulama oluşturun
2. `appsettings.json` dosyasında Facebook AppId ve AppSecret'ı güncelleyin

## API Endpoints

### Authentication
- `POST /api/auth/register` - Email/şifre ile kayıt
- `POST /api/auth/login` - Email/şifre ile giriş
- `POST /api/auth/social-login` - Sosyal medya ile giriş
- `POST /api/auth/guest-login` - Misafir girişi
- `GET /api/auth/me` - Mevcut kullanıcı bilgileri

## Özellikler

- JWT tabanlı kimlik doğrulama
- Google ve Facebook sosyal girişi
- Misafir kullanıcı desteği
- SQLite veritabanı
- Entity Framework Core
- ASP.NET Core Identity