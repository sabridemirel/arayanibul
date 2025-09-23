# 📱 Arayanibul - İlan ve Hizmet Arama Platformu

**Arayanibul**, kullanıcıların aradıkları hizmet veya ürünler için ilan verebilecekleri modern bir mobil platform. "Ben şunu arıyorum" mantığıyla çalışan ters ilan sistemi.

## 🎯 Proje Amacı

Geleneksel ilan sitelerinin tersine, **satın almak isteyen kullanıcılar** ihtiyaçlarını ilan eder:
- ✅ "2. el iPhone arıyorum"
- ✅ "Ev temizlik hizmeti arıyorum" 
- ✅ "Matematik özel ders arıyorum"
- ✅ "Düğün fotoğrafçısı arıyorum"

**Hizmet/ürün sağlayıcıları** bu ilanları görüp teklif verir.

## 🏗️ Proje Yapısı

```
📦 Arayanibul/
├── 📁 src/
│   ├── 📁 backend/                    # Backend katmanları
│   │   ├── 📁 Arayanibul.API/         # Web API katmanı
│   │   ├── 📁 Arayanibul.Business/    # İş mantığı katmanı
│   │   ├── 📁 Arayanibul.Data/        # Veri erişim katmanı
│   │   └── 📁 Arayanibul.Core/        # Ortak modeller/interfaces
│   └── 📁 mobile/                     # Mobile uygulama
│       ├── 📁 src/
│       │   ├── 📁 components/         # Yeniden kullanılabilir bileşenler
│       │   ├── 📁 screens/            # Ekranlar
│       │   ├── 📁 services/           # API servisleri
│       │   ├── 📁 navigation/         # Navigation yapısı
│       │   ├── 📁 hooks/              # Custom hooks
│       │   ├── 📁 utils/              # Yardımcı fonksiyonlar
│       │   └── 📁 types/              # TypeScript tipleri
│       ├── 📁 assets/                 # Resimler, fontlar
│       └── 📄 App.tsx
├── 📄 README.md                       # Bu dosya
├── 📄 .gitignore                      # Git ignore kuralları
└── 📄 start.sh                        # Hızlı başlatma scripti
```

## ✨ Özellikler

### 🔐 Kimlik Doğrulama
- ✅ Email/şifre ile kayıt ve giriş
- ✅ Google ile sosyal giriş (native build gerekli)
- ✅ Facebook ile sosyal giriş (native build gerekli)
- ✅ Misafir kullanıcı girişi
- ✅ JWT tabanlı kimlik doğrulama

### 🛠️ Teknolojiler

**Backend (.NET Core)**
- ASP.NET Core Web API
- Entity Framework Core
- SQLite veritabanı
- JWT Authentication
- Google & Facebook OAuth
- Katmanlı mimari

**Frontend (React Native/Expo)**
- React Native + Expo
- TypeScript
- React Navigation
- AsyncStorage
- Axios (HTTP client)
- Material Icons

## 🚀 Hızlı Başlangıç

### Gereksinimler
- .NET 9 SDK
- Node.js (16+)
- Expo CLI

### Kurulum

1. **Projeyi klonlayın**
   ```bash
   git clone [repo-url]
   cd Arayanibul
   ```

2. **Backend'i başlatın**
   ```bash
   cd src/backend/Arayanibul.API
   dotnet restore
   dotnet ef database update
   dotnet run
   ```

3. **Mobile uygulamayı başlatın**
   ```bash
   cd src/mobile
   npm install
   npx expo start
   ```

4. **Veya tek komutla her ikisini de başlatın**
   ```bash
   chmod +x start.sh
   ./start.sh
   ```

## 📚 Detaylı Dokümantasyon

### Teknik Dokümantasyon
- [Backend Kurulumu](./src/backend/README.md)
- [Mobile Kurulumu](./src/mobile/README.md)

### Proje Dokümantasyonu
- [Proje Genel Bakış](./docs/PROJECT_OVERVIEW.md)
- [Özellik Yol Haritası](./docs/FEATURES_ROADMAP.md)

## 🔧 API Endpoints

- **Backend**: http://localhost:5000
- **Swagger UI**: http://localhost:5000/swagger
- **Mobile**: Expo development server

## 📝 Notlar

- Google/Facebook girişi Expo Go'da çalışmaz, native build gereklidir
- Misafir girişi ve email/şifre girişi Expo Go'da çalışır
- Backend SQLite kullanır, production için PostgreSQL önerilir
- Katmanlı mimari ile temiz kod yapısı

## 🤝 Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.