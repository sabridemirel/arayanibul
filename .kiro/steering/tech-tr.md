# Teknoloji Yığını

## Backend (.NET Core)
- **Framework**: ASP.NET Core 9.0 Web API
- **Veritabanı**: SQLite (geliştirme), PostgreSQL (üretim önerilen)
- **ORM**: Entity Framework Core 9.0
- **Kimlik Doğrulama**: JWT + ASP.NET Core Identity
- **OAuth**: Google, Facebook kimlik doğrulama
- **Dokümantasyon**: Swagger/OpenAPI

### Ana Paketler
- Microsoft.AspNetCore.Authentication.JwtBearer
- Microsoft.AspNetCore.Identity.EntityFrameworkCore
- Microsoft.EntityFrameworkCore.Sqlite
- Microsoft.AspNetCore.Authentication.Google
- Swashbuckle.AspNetCore

## Frontend (React Native/Expo)
- **Framework**: React Native with Expo SDK ~54.0
- **Dil**: TypeScript
- **Navigasyon**: React Navigation 7.x (Stack Navigator)
- **HTTP İstemci**: Axios
- **Depolama**: AsyncStorage
- **İkonlar**: Expo Vector Icons (Material Icons)
- **Durum Yönetimi**: React Hooks + Context

### Ana Bağımlılıklar
- @react-navigation/native, @react-navigation/stack
- @react-native-async-storage/async-storage
- @react-native-google-signin/google-signin
- react-native-fbsdk-next

## Yaygın Komutlar

### Backend
```bash
cd src/backend/API
dotnet restore                    # Bağımlılıkları yükle
dotnet ef database update         # Migration'ları uygula
dotnet run                       # Geliştirme sunucusunu başlat (port 5000)
dotnet ef migrations add <name>   # Yeni migration oluştur
```

### Mobile
```bash
cd src/mobile
npm install                      # Bağımlılıkları yükle
npx expo start                   # Geliştirme sunucusunu başlat
npx expo start --clear           # Cache temizleyerek başlat
npx expo start --android         # Android emülatörü başlat
npx expo start --ios             # iOS simülatörü başlat
```

### Hızlı Başlangıç
```bash
chmod +x start.sh && ./start.sh  # Hem backend hem mobile'ı başlat
```

## Geliştirme URL'leri
- **Backend API**: http://localhost:5000
- **Swagger UI**: http://localhost:5000/swagger
- **Mobile**: Expo geliştirme sunucusu

## Yapı Gereksinimleri
- .NET 9 SDK
- Node.js 16+
- Expo CLI
- iOS Simulator (macOS) veya Android Emulator